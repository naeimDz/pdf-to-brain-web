import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chunks } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

/**
 * GET /api/document/[id]/chunks
 * Paginated endpoint for retrieving document chunks from SQLite
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const jobId = id;

        // 1. Validate inputs
        if (!jobId) {
            return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
        }

        // 2. Parse Pagination
        const url = new URL(request.url);
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100); // Cap at 100
        const offset = parseInt(url.searchParams.get('offset') || '0', 10);

        // 3. Query DB
        const resultChunks = await db.select()
            .from(chunks)
            .where(eq(chunks.jobId, jobId))
            // .orderBy(asc(chunks.pageNumber)) // Optional if pageNumber is populated
            .limit(limit)
            .offset(offset);

        // 4. Return results
        return NextResponse.json({
            jobId,
            limit,
            offset,
            chunkCount: resultChunks.length,
            chunks: resultChunks
        });

    } catch (error) {
        console.error('Error fetching chunks from DB:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
