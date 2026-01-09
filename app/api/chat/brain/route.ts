import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chunks, jobs, knowledge_cache } from '@/lib/db/schema';
import { like, eq, sql } from 'drizzle-orm';
import { aiManager } from '@/lib/ai/ai-manager';
import crypto from 'crypto';

/**
 * POST /api/chat/brain
 * Multi-File RAG Chat
 * Architecture: 
 * 1. Cache Layer (knowledge_neurons) - Zero Cost
 * 2. Search Layer (Chunks) - Low Cost
 * 3. AI Layer (Gemini) - High Cost (Learning)
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { message } = body;

        if (!message || message.trim().length < 2) {
            return NextResponse.json({ answer: "Please ask a longer question." });
        }

        // Normalize Question
        const normalizedQuestion = message.trim().toLowerCase();
        const questionHash = crypto.createHash('md5').update(normalizedQuestion).digest('hex');

        console.log(`🧠 Brain Query: "${normalizedQuestion}"`);

        // ==========================================
        // LAYER 1: Knowledge Cache (Zero Cost)
        // ==========================================
        const cachedNeuron = await db.select()
            .from(knowledge_cache)
            .where(eq(knowledge_cache.questionHash, questionHash))
            .get();

        if (cachedNeuron) {
            console.log("⚡ Cache HIT! Returning stored knowledge.");

            // Async: Increment hit count
            db.update(knowledge_cache)
                .set({
                    hitCount: sql`${knowledge_cache.hitCount} + 1`,
                    lastAccessedAt: sql`CURRENT_TIMESTAMP`
                })
                .where(eq(knowledge_cache.id, cachedNeuron.id))
                .run();

            return NextResponse.json({
                answer: cachedNeuron.answer,
                sources: cachedNeuron.sources,
                cached: true
            });
        }

        console.log("💨 Cache MISS. Searching library (Hybrid Mode)...");

        // Candidates map to deduplicate chunks (ID -> Chunk)
        const candidates = new Map<string, any>();

        // ==========================================
        // LAYER 1.5: Personal Context Detection (Smart)
        // ==========================================
        // Fetch document names for context
        const recentJobs = await db.select({ name: jobs.originalName, id: jobs.id }).from(jobs).limit(50);
        const fileNames = recentJobs.map(j => j.name);

        const provider = aiManager.getProvider('gemini');

        // Intent result placeholder
        let personalScopeIds: string[] = [];

        if (provider && 'detectIntent' in provider) {
            const intent = await (provider as any).detectIntent(message, fileNames);
            if (intent.isPersonal && intent.targetFiles.length > 0) {
                console.log(`👤 Personal Intent Detected. Targeting: ${intent.targetFiles.join(', ')}`);
                personalScopeIds = recentJobs.filter(j => intent.targetFiles.includes(j.name)).map(j => j.id);

                if (personalScopeIds.length > 0) {
                    const { inArray } = await import('drizzle-orm');
                    const personalChunks = await db.select({
                        id: chunks.id, content: chunks.content, pageNumber: chunks.pageNumber, jobId: chunks.jobId
                    }).from(chunks).where(inArray(chunks.jobId, personalScopeIds)).limit(10);

                    personalChunks.forEach(c => candidates.set(c.id, c));
                }
            }
        }

        // ==========================================
        // LAYER 3: Semantic Vector Search (Deep Cost)
        // ==========================================
        // Only run if we have a vector-capable provider
        if (provider && 'embedText' in provider) {
            try {
                // 1. Generate Query Vector
                const queryVector = await (provider as any).embedText(message);

                if (queryVector && queryVector.length > 0) {
                    // 2. Fetch ALL chunks' embeddings (In-Process Vector Search)
                    // Optimization: Select only ID and embedding fields
                    const allVectors = await db.select({
                        id: chunks.id,
                        embedding: chunks.embedding
                    }).from(chunks); // This might be heavy for >10k chunks, but fine for personal library

                    // 3. Rank in Memory
                    const { VectorStore } = await import('@/lib/ai/vector-store');

                    // Convert potential blob/buffer embeddings to number[] if needed
                    // Drizzle might return buffer for blob
                    const validVectors = allVectors.map(v => {
                        let vec: number[] = [];
                        if (Array.isArray(v.embedding)) vec = v.embedding;
                        // Checking if it's a buffer/object that looks like an array
                        else if (v.embedding && typeof v.embedding === 'object') vec = Array.from(v.embedding as any);

                        return { id: v.id, embedding: vec };
                    });

                    const topSemantic = VectorStore.rankChunks(queryVector, validVectors, 10);

                    if (topSemantic.length > 0) {
                        const { inArray } = await import('drizzle-orm');
                        const semanticChunks = await db.select({
                            id: chunks.id, content: chunks.content, pageNumber: chunks.pageNumber, jobId: chunks.jobId
                        }).from(chunks).where(inArray(chunks.id, topSemantic.map(r => r.id)));

                        semanticChunks.forEach(c => candidates.set(c.id, c));
                        console.log(`🧬 Vector Match: Added ${semanticChunks.length} chunks`);
                    }
                }
            } catch (vErr) {
                console.warn("Vector search failed (skipping):", vErr);
            }
        }

        // ==========================================
        // LAYER 2: Keyword Fallback (if needed)
        // ==========================================
        if (candidates.size < 5) {
            const keywordChunks = await db.select({
                id: chunks.id, content: chunks.content, pageNumber: chunks.pageNumber, jobId: chunks.jobId
            }).from(chunks).where(like(chunks.content, `%${message}%`)).limit(10);

            keywordChunks.forEach(c => candidates.set(c.id, c));
        }

        // ==========================================
        // LAYER 2.5: Query Expansion (Last Resort)
        // ==========================================
        if (candidates.size === 0 && provider && 'expandQuery' in provider) {
            const keywords = await (provider as any).expandQuery(message, fileNames);
            if (keywords.length > 0) {
                const searchConditions = keywords.map((kw: string) => like(chunks.content, `%${kw}%`));
                const { or } = await import('drizzle-orm');
                const expandedChunks = await db.select({
                    id: chunks.id, content: chunks.content, pageNumber: chunks.pageNumber, jobId: chunks.jobId
                }).from(chunks).where(or(...searchConditions)).limit(10);

                expandedChunks.forEach(c => candidates.set(c.id, c));
            }
        }

        const finalChunks = Array.from(candidates.values()).slice(0, 20);

        if (finalChunks.length === 0) {
            return NextResponse.json({
                answer: "I checked your library using all my senses (Keywords + Semantics) but couldn't find any relevant documents.",
                sources: []
            });
        }

        // Fetch source names
        const uniqueJobIds = [...new Set(finalChunks.map((c: any) => c.jobId))];
        const jobDetails = await Promise.all(
            uniqueJobIds.map(async (jid) => {
                const job = await db.select({
                    id: jobs.id,
                    originalName: jobs.originalName
                }).from(jobs).where(eq(jobs.id, jid as string)).get();
                return job;
            })
        );

        // Construct Context
        let contextString = "";
        const sources: string[] = [];

        finalChunks.forEach((chunk: any) => {
            const job = jobDetails.find(j => j?.id === chunk.jobId);
            const sourceName = job?.originalName || "Unknown File";
            if (!sources.includes(sourceName)) sources.push(sourceName);
            contextString += `[Source: ${sourceName}, Page: ${chunk.pageNumber || '?'}]\n${chunk.content}\n---\n`;
        });

        // ==========================================
        // LAYER 3: Synthesis (AI Layer)
        // ==========================================
        // Provider already declared above
        if (!provider) throw new Error("AI Provider missing");

        const answer = await provider.chat(message, contextString);

        // ==========================================
        // LAYER 4: Memorization (Cache)
        // ==========================================
        // Store this new knowledge/neuron for future use
        try {
            await db.insert(knowledge_cache).values({
                id: crypto.randomUUID(),
                question: normalizedQuestion,
                questionHash,
                answer: answer,
                sources: sources, // Drizzle handles JSON stringify
                hitCount: 1
            }).run();
            console.log("💾 Knowledge saved to neurons.");
        } catch (dbError) {
            console.error("Failed to save to cache:", dbError);
        }

        return NextResponse.json({
            answer,
            sources,
            cached: false
        });

    } catch (error: any) {
        console.error("Brain Error:", error);
        if (error?.status === 429) {
            return NextResponse.json({
                answer: "I found relevant documents, but my AI brain is currently tired (Quota Exceeded). Please try again in a minute.",
                error: "quota_exceeded"
            });
        }
        return NextResponse.json({ error: "Brain freeze" }, { status: 500 });
    }
}
