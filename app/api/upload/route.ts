import { NextRequest, NextResponse } from "next/server";
import { queueManager } from "@/lib/queue/queue-manager";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const aiProvider = formData.get("aiProvider") as string || "none";

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        if (file.type !== "application/pdf") {
            return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
        }

        // Prepare upload directory
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        await fs.mkdir(uploadDir, { recursive: true });

        // Save file
        const fileId = uuidv4();
        const fileName = `${fileId}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const filePath = path.join(uploadDir, fileName);

        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(filePath, buffer);

        // Create Job Object
        const jobId = fileId; // Use fileId as jobId for simplicity
        const newJob = {
            id: jobId,
            status: 'queued',
            progress: 0,
            data: {
                originalName: file.name,
                fileSize: file.size,
                filePath,
                mimeType: file.type,
                aiProvider: (aiProvider as any) || 'gemini'
            }
        };

        // Add to queue
        // @ts-ignore - Valid Job structure match
        await queueManager.addJob(newJob);

        return NextResponse.json({
            success: true,
            jobId,
            message: "File uploaded and queued for processing"
        });

    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: "Internal server error during upload" },
            { status: 500 }
        );
    }
}
