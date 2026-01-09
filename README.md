# 🧠 PDF-to-Brain (SOTA Edition)

**Turn your document library into an intelligent, self-aware "Second Brain".**

This project is a sophisticated **RAG (Retrieval-Augmented Generation)** system built with Next.js and Gemini. It goes beyond simple file chatting by implementing a **"Million-Dollar" Hybrid Search Architecture** entirely locally.

## ✨ The "Brain" Architecture (SOTA)

The system uses a 4-Layer Cognitive Engine to answer questions:

| Layer | Component | Function | Cost |
| :--- | :--- | :--- | :--- |
| **Layer 1** | **⚡ Knowledge Cache** | Remembers previous Q&A. Answers instantly (0.1s). | **Zero** |
| **Layer 1.5** | **👤 Intent Engine** | Detects "personal" questions (e.g., *"What do you think of me?"*) and targets your CV/Resume automatically. | Low |
| **Layer 2** | **🔍 Hybrid Search** | Fuses **Vector Search** (Semantic) + **Keyword Search** (Exact) for perfect retrieval. | Medium |
| **Layer 2.5** | **🧠 Query Expansion** | Uses AI to generate synonyms and map loose terms to actual filenames (Context-Aware). | Medium |
| **Layer 3** | **🗣️ Synthesis** | "The Strict Librarian" Persona (Gemini) answers using ONLY the retrieved facts. | High |

## 🚀 Key Features

*   **Zero-Database Dependency**: Uses **SQLite** + **In-Process Vector Store**. No Pinecone/Postgres required.
*   **Auto-Learning**: Answers are saved to `knowledge_neurons` for future instant recall.
*   **Smart Ingestion**: 
    *   **OCR**: Detects scanned PDFs automatically.
    *   **Auto-Embeddings**: Generates vectors (`text-embedding-004`) for every file upon upload.
*   **"Ask Brain"**: A unified chat interface that queries your *entire* library at once.
*   **Data Persistence**: Jobs, chunks, and metadata are stored persistently in SQLite.

## 🛠️ Tech Stack

*   **Framework**: Next.js 14 (App Router)
*   **AI Provider**: Google Gemini (`gemini-1.5-flash` + `text-embedding-004`)
*   **Database**: SQLite (via `better-sqlite3`)
*   **ORM**: Drizzle ORM
*   **Vector Search**: Local Cosine Similarity (Node.js)
*   **Styling**: Tailwind CSS + Glassmorphism UI

## 📦 Getting Started

1.  **Clone & Install**:
    ```bash
    npm install
    ```

2.  **Environment Setup** (`.env.local`):
    ```env
    GEMINI_API_KEY=your_key_here
    GEMINI_MODEL=gemini-1.5-flash
    DATABASE_URL=sqlite.db
    ```

3.  **Run Migrations**:
    ```bash
    npx drizzle-kit push
    ```

4.  **Start the Brain**:
    ```bash
    npm run dev
    ```

## 🔧 Admin Tools

*   **Backfill Embeddings** (for old files):
    `POST /api/admin/embeddings/backfill`

---
*Built with ❤️ and High-Performance Engineering.*
