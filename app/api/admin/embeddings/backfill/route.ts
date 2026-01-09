import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chunks } from '@/lib/db/schema';
import { isNull, eq } from 'drizzle-orm';
import { aiManager } from '@/lib/ai/ai-manager';

/**
 * POST /api/admin/embeddings/backfill
 * Generates embeddings for chunks that don't have them.
 */
export async function POST(req: NextRequest) {
    try {
        // 1. Find chunks without embeddings
        const pendingChunks = await db.select({
            id: chunks.id,
            content: chunks.content
        })
            .from(chunks)
            .where(isNull(chunks.embedding))
            .limit(50); // Process in small batches to avoid timeouts

        if (pendingChunks.length === 0) {
            return NextResponse.json({ message: "No pending chunks found", processed: 0 });
        }

        console.log(`🧬 Backfilling embeddings for ${pendingChunks.length} chunks...`);
        const provider = aiManager.getProvider('gemini');

        if (!provider || !('embedText' in provider)) {
            return NextResponse.json({ error: "Gemini provider with embedding support not found" }, { status: 500 });
        }

        let processed = 0;

        // 2. Generate and Update
        for (const chunk of pendingChunks) {
            try {
                // Generate embedding
                const embedding = await (provider as any).embedText(chunk.content);

                if (embedding && embedding.length > 0) {
                    // Save to DB
                    await db.update(chunks)
                        .set({ embedding: embedding })
                        .where(eq(chunks.id, chunk.id))
                        .run();
                    processed++;
                }

                // Rate limiting protection (simple delay)
                await new Promise(r => setTimeout(r, 200));

            } catch (err) {
                console.error(`Failed to embed chunk ${chunk.id}:`, err);
            }
        }

        return NextResponse.json({
            success: true,
            processed,
            remaining: pendingChunks.length - processed
        });

    } catch (error) {
        console.error("Backfill failed:", error);
        return NextResponse.json({ error: "Backfill failed" }, { status: 500 });
    }
}
