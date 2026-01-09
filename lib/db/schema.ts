import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const jobs = sqliteTable("jobs", {
    id: text("id").primaryKey(),
    originalName: text("original_name").notNull(),
    fileSize: integer("file_size").notNull(),
    mimeType: text("mime_type"),
    filePath: text("file_path").notNull(),
    status: text("status", { enum: ["queued", "uploading", "analyzing", "ocr_processing", "jules_processing", "ai_processing", "completed", "failed"] }).notNull().default("queued"),
    progress: integer("progress").notNull().default(0),
    error: text("error"),

    // Results
    markdown: text("markdown"),
    rawText: text("raw_text"), // For CAG
    metadata: text("metadata", { mode: "json" }), // Store JSON metadata

    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
    processedAt: text("processed_at"),
});

export const chunks = sqliteTable("chunks", {
    id: text("id").primaryKey(),
    jobId: text("job_id").references(() => jobs.id).notNull(),
    content: text("content").notNull(),
    pageNumber: integer("page_number"),
    tokens: integer("tokens"),
    role: text("role", { enum: ["logical", "retrieval"] }),
    source: text("source", { enum: ["raw_pdf", "ai_summary"] }),
    embedding: blob("embedding"), // Future proofing
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const knowledge_cache = sqliteTable("knowledge_cache", {
    id: text("id").primaryKey(),
    question: text("question").notNull(), // Store normalized question
    questionHash: text("question_hash").notNull(), // For fast lookups (e.g., md5 of normalized question)
    answer: text("answer").notNull(),
    sources: text("sources", { mode: "json" }), // JSON array of source names
    hitCount: integer("hit_count").default(1),
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
    lastAccessedAt: text("last_accessed_at").default(sql`CURRENT_TIMESTAMP`),
});
