"use client";

import { useState } from "react";
import FileUpload from "@/components/FileUpload";
import ProcessingStatusDisplay from "@/components/ProcessingStatus";
import ResultsView from "@/components/ResultsView";
import { Toaster } from "react-hot-toast";

export default function Home() {
    const [jobId, setJobId] = useState<string | null>(null);
    const [result, setResult] = useState<any | null>(null);

    const handleUploadSuccess = (id: string) => {
        setJobId(id);
        setResult(null);
    };

    const handleProcessingComplete = (data: any) => {
        setResult(data);
    };

    const reset = () => {
        setJobId(null);
        setResult(null);
    };

    return (
        <main className="min-h-screen bg-[#fafafa] dark:bg-black text-zinc-900 dark:text-zinc-100 selection:bg-blue-100 dark:selection:bg-blue-900">
            <Toaster position="bottom-right" />

            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-400/10 dark:bg-blue-500/10 blur-[100px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-violet-400/10 dark:bg-violet-500/10 blur-[100px] rounded-full" />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 md:py-32">
                {/* Header */}
                <div className="text-center mb-16 space-y-6">
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 dark:from-blue-400 dark:via-violet-400 dark:to-fuchsia-400">
                            PDF to Brain
                        </span>
                    </h1>
                    <p className="text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                        Determine the future of document processing. Convert complex PDFs into clean, structured Markdown for LLMs. With OCR & AI analysis built-in.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <a
                            href="/library"
                            className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        >
                            📚 Document Library
                        </a>
                        <a
                            href="/search"
                            className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full bg-fuchsia-50 dark:bg-fuchsia-900/20 text-fuchsia-600 dark:text-fuchsia-400 hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/30 transition-colors"
                        >
                            🔍 Text Search
                        </a>
                        <a
                            href="/brain"
                            className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors border border-purple-200 dark:border-purple-800"
                        >
                            🧠 Ask Brain (Chat)
                        </a>
                    </div>
                </div>

                {/* Main Interface */}
                <div className="transition-all duration-500 ease-in-out">
                    {!jobId && (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <FileUpload onUploadSuccess={handleUploadSuccess} />
                        </div>
                    )}

                    {jobId && !result && (
                        <div className="animate-in fade-in zoom-in-95 duration-500">
                            <ProcessingStatusDisplay jobId={jobId} onComplete={handleProcessingComplete} />
                        </div>
                    )}

                    {result && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div className="flex justify-center">
                                <button
                                    onClick={reset}
                                    className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 underline underline-offset-4"
                                >
                                    Process another file
                                </button>
                            </div>
                            <ResultsView jobId={jobId!} result={result} />
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
