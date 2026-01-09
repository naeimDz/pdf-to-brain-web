/**
 * Vector Store Utility
 * Implements "In-Process" Vector Search logic.
 * 
 * Strategy:
 * 1. Fetch embeddings from DB (BLOB -> Float32Array).
 * 2. Compute Cosine Similarity in Node.js (V8 is fast!).
 * 3. Rank and return top matches.
 */

export class VectorStore {

    /**
     * Calculates Cosine Similarity between two vectors
     * @param vecA Query Vector
     * @param vecB Chunk Vector
     */
    static cosineSimilarity(vecA: number[], vecB: number[]): number {
        if (vecA.length !== vecB.length) return 0;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        if (normA === 0 || normB === 0) return 0;

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Ranks documents by similarity
     */
    static rankChunks(queryVector: number[], chunks: { id: string; embedding: number[] | null }[], topK: number = 20) {
        const scores = chunks
            .filter(c => c.embedding && c.embedding.length > 0)
            .map(chunk => ({
                id: chunk.id,
                score: this.cosineSimilarity(queryVector, chunk.embedding!)
            }));

        // Sort descending
        return scores.sort((a, b) => b.score - a.score).slice(0, topK);
    }
}
