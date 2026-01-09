import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { jobs, chunks } from '@/lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';

/**
 * GET /api/documents
 * Returns all uploaded documents/jobs with token counts
 */
export async function GET(req: NextRequest) {
    try {
        const allJobs = await db.select({
            id: jobs.id,
            originalName: jobs.originalName,
            fileSize: jobs.fileSize,
            status: jobs.status,
            progress: jobs.progress,
            createdAt: jobs.createdAt,
            processedAt: jobs.processedAt,
        }).from(jobs).orderBy(desc(jobs.createdAt));

        // Calculate token counts per document
        const docsWithTokens = await Promise.all(
            allJobs.map(async (job) => {
                const tokenResult = await db.select({
                    totalTokens: sql<number>`COALESCE(SUM(${chunks.tokens}), 0)`,
                    chunkCount: sql<number>`COUNT(*)`,
                }).from(chunks).where(eq(chunks.jobId, job.id));

                return {
                    ...job,
                    tokenCount: tokenResult[0]?.totalTokens || 0,
                    chunkCount: tokenResult[0]?.chunkCount || 0,
                };
            })
        );

        return NextResponse.json({
            total: docsWithTokens.length,
            documents: docsWithTokens
        });

    } catch (error) {
        console.error("Error fetching documents:", error);
        return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
    }
}

