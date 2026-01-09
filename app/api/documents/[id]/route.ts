import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { jobs, chunks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';

/**
 * DELETE /api/documents/[id]
 * Deletes a document and its chunks
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: "Document ID required" }, { status: 400 });
        }

        // 1. Get job info (for file path)
        const job = await db.select({
            filePath: jobs.filePath
        }).from(jobs).where(eq(jobs.id, id)).get();

        if (!job) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        // 2. Delete chunks first (foreign key)
        await db.delete(chunks).where(eq(chunks.jobId, id)).run();

        // 3. Delete job record
        await db.delete(jobs).where(eq(jobs.id, id)).run();

        // 4. Try to delete the actual file (optional, don't fail if not found)
        try {
            if (job.filePath) {
                await fs.unlink(job.filePath);
            }
        } catch (fileError) {
            console.log("File already deleted or not found:", job.filePath);
        }

        return NextResponse.json({ success: true, message: "Document deleted" });

    } catch (error) {
        console.error("Error deleting document:", error);
        return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
    }
}

/**
 * GET /api/documents/[id]
 * Get single document details
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const job = await db.select().from(jobs).where(eq(jobs.id, id)).get();

        if (!job) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        return NextResponse.json(job);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
    }
}
