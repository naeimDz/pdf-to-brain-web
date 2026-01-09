import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chunks, jobs } from '@/lib/db/schema';
import { like, desc, eq } from 'drizzle-orm';
import { aiManager } from '@/lib/ai/ai-manager';

/**
 * POST /api/search
 * Search across ALL documents in the database
 * Body: { query: string, useAI?: boolean }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { query, useAI = true } = body;

        if (!query || query.trim().length < 2) {
            return NextResponse.json({ error: "Query too short" }, { status: 400 });
        }

        // 1. Keyword Search across all chunks
        const matchingChunks = await db.select({
            chunkId: chunks.id,
            jobId: chunks.jobId,
            content: chunks.content,
            pageNumber: chunks.pageNumber,
            source: chunks.source,
        })
            .from(chunks)
            .where(like(chunks.content, `%${query}%`))
            .limit(50);

        // 2. Group by job for better UX
        const jobIds = [...new Set(matchingChunks.map(c => c.jobId))];

        // 3. Get job metadata for matched documents
        const jobDetails = await Promise.all(
            jobIds.map(async (jid) => {
                const job = await db.select({
                    id: jobs.id,
                    originalName: jobs.originalName,
                }).from(jobs).where(eq(jobs.id, jid)).get();
                return job;
            })
        );

        // 4. Build response
        const results = jobIds.map(jid => {
            const job = jobDetails.find(j => j?.id === jid);
            const jobChunks = matchingChunks.filter(c => c.jobId === jid);
            return {
                jobId: jid,
                documentName: job?.originalName || "Unknown",
                matchCount: jobChunks.length,
                snippets: jobChunks.slice(0, 3).map(c => ({
                    content: c.content.substring(0, 200) + "...",
                    page: c.pageNumber
                }))
            };
        });

        // 5. Optional: AI Summary of search results
        let aiSummary = null;
        if (useAI && matchingChunks.length > 0) {
            try {
                const provider = aiManager.getProvider('gemini');
                if (provider) {
                    const context = matchingChunks.slice(0, 10).map(c => c.content).join("\n---\n");
                    aiSummary = await provider.chat(
                        `Based on these search results for "${query}", provide a brief 2-3 sentence summary of what was found:`,
                        context
                    );
                }
            } catch (e) {
                console.error("AI Summary failed:", e);
            }
        }

        return NextResponse.json({
            query,
            totalMatches: matchingChunks.length,
            documentsFound: results.length,
            aiSummary,
            results
        });

    } catch (error) {
        console.error("Search error:", error);
        return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }
}
