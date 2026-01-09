import { JobMetadata, ProcessedResult, ProcessingStatus } from '../../types';
import { processJob } from './pdf-processor';
import { reportError } from '../error-handlers';
import { db } from '../db';
import { jobs, chunks } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

export interface Job {
    id: string;
    status: ProcessingStatus;
    progress: number;
    error?: string;
    createdAt?: string;
    data: {
        filePath: string;
        originalName: string;
        fileSize: number;
        mimeType?: string;
        aiProvider?: 'gemini' | 'notebooklm' | 'none';
        ocrProvider?: 'tesseract' | 'google-vision';
    };
    result?: ProcessedResult;
}

/*
 * Persistent Queue Manager (SQLite Backed)
 * Replaces the ephemeral Map<string, Job> logic.
 */
class PersistentQueueManager {
    private isProcessing = false;

    constructor() {
        // Kickstart processing on startup in case of pending jobs
        this.processNextJob();
    }

    async addJob(job: Job): Promise<void> {
        try {
            await db.insert(jobs).values({
                id: job.id,
                originalName: job.data.originalName,
                fileSize: job.data.fileSize,
                mimeType: job.data.mimeType || 'application/pdf',
                filePath: job.data.filePath,
                status: job.status,
                progress: job.progress,
                createdAt: new Date().toISOString()
            });
            console.log(`Job ${job.id} added to SQLite queue`);
            this.processNextJob();
        } catch (error) {
            console.error("Failed to add job to DB:", error);
            throw error; // Propagate up
        }
    }

    getJob(jobId: string): Job | undefined {
        try {
            // Synchronous get via better-sqlite3 driver
            const result = db.select().from(jobs).where(eq(jobs.id, jobId)).get();

            if (!result) return undefined;

            // Map DB Record -> Job Object
            let parsedResult: ProcessedResult | undefined = undefined;

            if (result.status === 'completed' || result.metadata) {
                const meta = result.metadata ? JSON.parse(result.metadata as string) as JobMetadata : undefined;
                if (meta) {
                    parsedResult = {
                        content: result.markdown || '', // Deprecated preview field
                        markdown: result.markdown || '',
                        rawText: result.rawText || undefined,
                        chunks: [], // Don't load chunks eagerly by default
                        metadata: meta
                    };
                }
            }

            return {
                id: result.id,
                status: result.status as ProcessingStatus,
                progress: result.progress,
                error: result.error || undefined,
                createdAt: result.createdAt || undefined,
                data: {
                    filePath: result.filePath,
                    fileSize: result.fileSize,
                    originalName: result.originalName,
                    mimeType: result.mimeType || undefined
                },
                result: parsedResult
            };
        } catch (e) {
            console.error(`Error fetching job ${jobId}:`, e);
            return undefined;
        }
    }

    updateJob(jobId: string, updates: Partial<Job>): void {
        try {
            // Prepare update object
            const dbUpdates: any = {};
            if (updates.status) dbUpdates.status = updates.status;
            if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
            if (updates.error) dbUpdates.error = updates.error;

            // Handle Result & Metadata
            if (updates.result) {
                dbUpdates.markdown = updates.result.markdown;
                dbUpdates.rawText = updates.result.rawText;
                dbUpdates.metadata = JSON.stringify(updates.result.metadata);
                dbUpdates.processedAt = new Date().toISOString();

                // CRITICAL: Save Chunks if present!
                // This is a side-effect, but valid for this architecture
                if (updates.result.chunks && updates.result.chunks.length > 0) {
                    this.saveChunks(jobId, updates.result.chunks);
                }
            }

            db.update(jobs).set(dbUpdates).where(eq(jobs.id, jobId)).run();

            // Log status changes
            if (updates.status) {
                console.log(`Job ${jobId} status updated to: ${updates.status}`);
            }

        } catch (error) {
            console.error(`Failed to update job ${jobId}:`, error);
        }
    }

    private saveChunks(jobId: string, chunkList: any[]) {
        try {
            // Batch insert
            const values = chunkList.map(c => ({
                id: c.id,
                jobId: jobId,
                content: c.content,
                role: c.role,
                source: c.source,
                tokens: c.tokens,
                pageNumber: c.pageNumber,
                embedding: c.embedding // Store vector
            }));

            if (values.length > 0) {
                // Delete existing chunks first to prevent duplicates on retry
                db.delete(chunks).where(eq(chunks.jobId, jobId)).run();

                // Insert new chunks
                db.insert(chunks).values(values).run();
                console.log(`Saved ${values.length} chunks to DB for Job ${jobId}`);
            }
        } catch (e) {
            console.error("Failed to save chunks:", e);
        }
    }

    async getAllJobs(): Promise<Job[]> {
        const results = db.select().from(jobs).orderBy(desc(jobs.createdAt)).all();
        return results.map(r => ({
            id: r.id,
            status: r.status as ProcessingStatus,
            progress: r.progress,
            createdAt: r.createdAt || undefined,
            data: {
                originalName: r.originalName,
                fileSize: r.fileSize,
                filePath: r.filePath
            },
            result: r.status === 'completed' && r.metadata ? {
                metadata: JSON.parse(r.metadata as string)
            } as any : undefined
        }));
    }

    // Main Processing Loop
    async processNextJob() {
        if (this.isProcessing) return;

        try {
            // Find next queued job
            // We use 'get()' which is synchronous in better-sqlite3 but fast
            const nextJobRecord = db.select().from(jobs)
                .where(eq(jobs.status, 'queued'))
                .orderBy(desc(jobs.createdAt)) // FIFO or LIFO logic
                .limit(1)
                .get();

            if (!nextJobRecord) return;

            this.isProcessing = true;

            // Reconstruct Job object
            const job: Job = {
                id: nextJobRecord.id,
                status: 'queued',
                progress: 0,
                data: {
                    filePath: nextJobRecord.filePath,
                    originalName: nextJobRecord.originalName,
                    fileSize: nextJobRecord.fileSize,
                    mimeType: nextJobRecord.mimeType || undefined,
                    aiProvider: 'gemini'
                }
            };

            await processJob(job);

        } catch (error) {
            reportError(error as Error, { context: 'Queue Processing' });
        } finally {
            this.isProcessing = false;
            // Check for more jobs after a short delay
            setTimeout(() => this.processNextJob(), 1000);
        }
    }
}

// Export Singleton
export const queueManager = new PersistentQueueManager();
