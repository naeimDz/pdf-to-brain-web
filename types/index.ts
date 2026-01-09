export type ProcessingStatus =
    | "queued"
    | "uploading"
    | "analyzing" // OCR check
    | "ocr_processing"
    | "jules_processing"
    | "ai_processing"
    | "completed"
    | "failed";

export type OCRProvider = "tesseract" | "google-vision";
export type AIProvider = "gemini" | "notebooklm" | "none";



export interface JobMetadata {
    jobId: string;
    originalName: string;
    fileSize: number;
    mimeType?: string;
    uploadTime?: string;
    processedAt?: string; // Added
    processingTime?: number;
    wordCount?: number;
    chunkCount?: number;
    pageCount?: number;
    isScanned?: boolean;
    ocrUsed?: boolean;
    ocrProvider?: OCRProvider;
    aiProvider?: AIProvider;
    aiAnalysis?: any;     // Added to match usage
    aiResults?: any;      // Kept for backward compat if needed
}

// RAG/CAG Constants
export const MAX_CAG_TOKENS = 40000; // Threshold for switching from pure CAG to hybrid

export interface DocumentChunk {
    id: string;
    content: string;
    pageNumber?: number;
    tokens?: number; // Estimated token count
    embedding?: number[]; // Placeholder for vector
    role?: "logical" | "retrieval"; // Future-proof: what this chunk is for
    source?: "raw_pdf" | "ai_summary"; // Critical: where did this text come from?
}

export interface ProcessedResult {
    jobId?: string;
    markdown?: string;    // Processed/cleaned content for display
    rawText?: string;     // NEW: The original extracted text (for CAG injection)
    markdownUrl?: string;
    textUrl?: string;
    jsonUrl?: string;
    metadata: JobMetadata;
    content?: string;     // Preview content (short)
    chunks?: DocumentChunk[]; // RAG-ready segments
    // Note: chunks NOT returned in status API by default (pagination endpoint)
}

export interface ProgressUpdate {
    jobId: string;
    status: ProcessingStatus;
    progress: number; // 0-100
    message: string;
    estimatedTimeRemaining?: number; // seconds
}

export interface AIProviderConfig {
    apiKey: string;
    model?: string;
    endpoint?: string;
}
