import { DocumentChunk } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export interface ChunkerOptions {
    mode?: "rag" | "cag";  // NEW: Chunking strategy
    maxChunkSize?: number; // Characters, varies by mode
    overlap?: number;      // Characters, default 100
    source?: "raw_pdf" | "ai_summary"; // Where did the text come from?
}

// Default configurations per mode
const MODE_DEFAULTS = {
    rag: { maxChunkSize: 500, overlap: 100 },  // Smaller for precise retrieval
    cag: { maxChunkSize: 2000, overlap: 200 }   // Larger logical sections
};

export const textChunker = {
    /**
     * Splits text into manageable chunks for RAG/CAG.
     * Supports mode-based chunking strategies.
     */
    split(text: string, options: ChunkerOptions = {}): DocumentChunk[] {
        const mode = options.mode || "rag";
        const defaults = MODE_DEFAULTS[mode];
        const maxSize = options.maxChunkSize || defaults.maxChunkSize;
        const overlap = options.overlap || defaults.overlap;
        const source = options.source || "raw_pdf";

        if (!text) return [];

        // 1. Split by paragraphs first
        const rawParagraphs = text.split(/\n\s*\n/);
        const chunks: DocumentChunk[] = [];

        let currentChunk = "";

        for (const paragraph of rawParagraphs) {
            const cleanPara = paragraph.trim();
            if (!cleanPara) continue;

            // If adding this paragraph exceeds max size, push current chunk
            if ((currentChunk.length + cleanPara.length) > maxSize && currentChunk.length > 0) {
                chunks.push(this.createChunk(currentChunk, mode, source));
                // Start new chunk with overlap (last N chars of previous)
                const overlapText = currentChunk.slice(-overlap);
                currentChunk = overlapText + "\n\n" + cleanPara;
            } else {
                currentChunk = currentChunk ? (currentChunk + "\n\n" + cleanPara) : cleanPara;
            }

            // Handle edge case: Paragraph itself is HUGE (larger than maxSize)
            // Force split huge paragraphs
            if (currentChunk.length > maxSize * 1.5) {
                chunks.push(this.createChunk(currentChunk, mode, source));
                currentChunk = "";
            }
        }

        // Push remaining
        if (currentChunk.trim()) {
            chunks.push(this.createChunk(currentChunk, mode, source));
        }

        return chunks;
    },

    createChunk(content: string, role: "rag" | "cag", source: "raw_pdf" | "ai_summary"): DocumentChunk {
        return {
            id: uuidv4(),
            content: content.trim(),
            tokens: Math.ceil(content.length / 4), // Rough estimation: 4 chars = 1 token
            role: role === "rag" ? "retrieval" : "logical",
            source: source
        };
    }
};
