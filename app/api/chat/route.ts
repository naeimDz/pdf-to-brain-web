import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { jobs, chunks } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { aiManager } from '@/lib/ai/ai-manager';

/**
 * POST /api/chat
 * Simple RAG Chat Endpoint (Single File)
 * Body: { jobId: string, message: string }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { jobId, message } = body;

        if (!jobId || !message) {
            return NextResponse.json({ error: "Missing jobId or message" }, { status: 400 });
        }

        // 1. Fetch relevant chunks (Simple Retrieval: Get ALL chunks for this job)
        // In the future: Vector Search would go here to select top-k
        const jobChunks = await db.select()
            .from(chunks)
            .where(eq(chunks.jobId, jobId))
            //.orderBy(asc(chunks.pageNumber))
            .limit(100); // Limit to ~100 chunks (~20k tokens) depending on model context

        if (!jobChunks || jobChunks.length === 0) {
            return NextResponse.json({
                answer: "I don't have enough information (chunks) for this document yet. Please wait for processing to complete."
            });
        }

        // 2. Construct Context
        const contextText = jobChunks.map(c => `[Snippet from Page ${c.pageNumber || '?'}]:\n${c.content}`).join("\n---\n");

        // 3. Get AI Provider
        // Ideally we check job metadata for preferred provider, or default
        const provider = aiManager.getProvider('gemini');

        if (!provider) {
            return NextResponse.json({ error: "AI Provider not configured" }, { status: 500 });
        }

        // 4. Generate Answer
        const answer = await provider.chat(message, contextText);

        return NextResponse.json({ answer });

    } catch (error) {
        console.error("Chat API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
