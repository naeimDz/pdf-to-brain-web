import { NextRequest, NextResponse } from "next/server";
import { queueManager } from "@/lib/queue/queue-manager";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    const { jobId } = await params;

    if (!jobId) {
        return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    const job = queueManager.getJob(jobId);

    if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Performance optimization: Exclude chunks and rawText from status response
    // Use /api/document/[id]/chunks for paginated chunk access
    const safeResult = job.result ? {
        ...job.result,
        chunks: undefined,  // Don't send chunks here
        rawText: undefined, // Don't send full text here
        // Add hints for frontend
        hasChunks: (job.result.chunks?.length || 0) > 0,
        chunkCount: job.result.chunks?.length || 0
    } : undefined;

    return NextResponse.json({
        ...job,
        result: safeResult
    });
}

