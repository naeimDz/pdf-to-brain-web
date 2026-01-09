import fs from 'fs/promises';
import { queueManager, Job } from './queue-manager';
import { ocrProcessor } from '../ocr-processor';
import { aiManager } from '../ai/ai-manager';
import { ProcessedResult } from '../../types'; // Removed JulesSession
import { AIAnalysisResult } from '../ai/base-provider';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function processJob(job: Job) {
    // Ensure we ALWAYS update job status, even on catastrophic errors
    try {
        await _processJobInternal(job);
    } catch (fatalError) {
        console.error(`❌ FATAL: Job ${job.id} encountered unrecoverable error:`, fatalError);
        try {
            queueManager.updateJob(job.id, {
                status: 'failed',
                error: fatalError instanceof Error ? fatalError.message : 'Fatal processing error',
                progress: 0
            });
        } catch (updateError) {
            console.error(`❌ Could not even update job status:`, updateError);
        }
    }
}

async function _processJobInternal(job: Job) {
    try {
        console.log(`Starting job processing: ${job.id}`);

        // 1. Validating & Reading File
        queueManager.updateJob(job.id, { status: 'analyzing', progress: 10 });

        let textContent = "";
        let useMultimodalAnalysis = false;
        let julesOutput = "";

        // Step 2: Validate and Extract Text
        // Check if scanned
        const isScanned = await ocrProcessor.detectScannedPDF(job.data.filePath);

        if (isScanned) {
            console.log(`Job ${job.id} detected as scanned. Using Gemini Multimodal (No local OCR needed).`);
            useMultimodalAnalysis = true;
            textContent = "[Scanned Document - Analyzed by AI]";
        } else {
            // Simple usage for pdf-parse v1.1.1
            const pdfParse = require('pdf-parse');

            const dataBuffer = await fs.readFile(job.data.filePath);
            const data = await pdfParse(dataBuffer);
            textContent = data.text;
        }

        queueManager.updateJob(job.id, { progress: 50 });

        // Step 3: AI Analysis (Gemini)
        let aiResults: AIAnalysisResult | null = null;
        const aiProvider = aiManager.getProvider(job.data.aiProvider || 'gemini');

        if (aiProvider) {
            queueManager.updateJob(job.id, { status: 'ai_processing', progress: 70 });
            console.log(`Running AI analysis with provider: ${job.data.aiProvider || 'gemini'}`);

            try {
                if (useMultimodalAnalysis) {
                    const fileBuffer = await fs.readFile(job.data.filePath);
                    aiResults = await aiProvider.analyzeDocument(fileBuffer, 'application/pdf');
                    // For scanned docs, we might want to populate markdown with summary if no text extracted
                    textContent = aiResults.summary || "Scanned Document Processed by AI";
                } else {
                    aiResults = await aiProvider.analyzeText(textContent);
                }
            } catch (aiError) {
                console.error("AI Analysis failed:", aiError);
            }
        }

        queueManager.updateJob(job.id, { progress: 90 });

        // RAG Prep: Chunking with proper source tagging
        let chunks: any[] = [];
        let rawTextForCAG = ""; // Store original text separately for CAG injection
        try {
            const { textChunker } = require('../document/chunker');

            // Determine source based on extraction method
            const chunkSource = useMultimodalAnalysis ? "ai_summary" : "raw_pdf";
            rawTextForCAG = useMultimodalAnalysis ? "" : textContent; // Only store raw if we have it

            chunks = textContent ? textChunker.split(textContent, {
                mode: "rag", // Default to retrieval-optimized chunks
                source: chunkSource
            }) : [];

            console.log(`Generated ${chunks.length} chunks (source: ${chunkSource}) for RAG storage.`);

            // Step 3.5: Generate Embeddings (Vector Prep)
            if (chunks.length > 0 && aiProvider && 'embedText' in aiProvider) {
                console.log(`🧬 Generating Embeddings for ${chunks.length} chunks...`);
                queueManager.updateJob(job.id, { status: 'ai_processing', progress: 95 });

                // Process sequentially to be safe with rate limits
                for (let i = 0; i < chunks.length; i++) {
                    try {
                        const embedding = await (aiProvider as any).embedText(chunks[i].content);
                        if (embedding && embedding.length > 0) {
                            chunks[i].embedding = embedding;
                        }
                        // Small delay to be polite to API
                        await delay(100);
                    } catch (embErr) {
                        console.warn(`Failed to generate embedding for chunk ${i}:`, embErr);
                    }
                }
                console.log(`🧬 Embeddings generated.`);
            }
        } catch (chunkError) {
            console.error("Chunking/Embedding failed:", chunkError);
        }

        // Step 4: Finalize
        const results: ProcessedResult = {
            markdown: textContent,         // Display content
            rawText: rawTextForCAG || undefined, // CAG injection source (only if raw)
            chunks: chunks,                // RAG segments (NOT returned in status API)
            metadata: {
                jobId: job.id,
                originalName: job.data.originalName,
                fileSize: job.data.fileSize,
                wordCount: textContent.split(/\s+/).length,
                chunkCount: chunks.length,
                isScanned,
                processedAt: new Date().toISOString(),
                aiAnalysis: aiResults || undefined
            }
        };

        queueManager.updateJob(job.id, {
            status: 'completed',
            progress: 100,
            result: results
        });

        console.log(`Job ${job.id} completed successfully`);

    } catch (error) {
        console.error(`Job ${job.id} failed:`, error);
        queueManager.updateJob(job.id, {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Processing failed',
            progress: 0
        });
    }
}
