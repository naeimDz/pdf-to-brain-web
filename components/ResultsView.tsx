"use client";

import { useState } from "react";
import ChatInterface from "./ChatInterface";
import { Copy, Download, FileText, Code, Database, Check, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface ResultsViewProps {
    jobId: string;
    result: any;
}

type Tab = "markdown" | "chat" | "metadata" | "json";

export default function ResultsView({ jobId, result }: ResultsViewProps) {
    const [activeTab, setActiveTab] = useState<Tab>("markdown");
    const [copied, setCopied] = useState(false);

    const content = {
        markdown: result.markdown || "No content generated.",
        metadata: JSON.stringify(result.metadata, null, 2),
        json: JSON.stringify(result, null, 2),
    };

    const handleCopy = () => {
        if (activeTab === 'chat') {
            toast('Cannot copy chat history yet.');
            return;
        }
        navigator.clipboard.writeText(content[activeTab as keyof typeof content]);
        setCopied(true);
        toast.success("Copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        if (activeTab === 'chat') return;
        const blob = new Blob([content[activeTab as keyof typeof content]], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `result-${jobId}.${activeTab === "markdown" ? "md" : "json"}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="w-full max-w-4xl mx-auto bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="border-b border-zinc-200 dark:border-zinc-800 p-4 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="flex gap-2">
                    {[
                        { id: "markdown", label: "Markdown", icon: FileText },
                        { id: "chat", label: "Chat (AI)", icon: MessageSquare },
                        { id: "metadata", label: "Metadata", icon: Database },
                        { id: "json", label: "Raw JSON", icon: Code },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as Tab)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                                activeTab === tab.id
                                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700"
                                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            )}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2">
                    {activeTab !== 'chat' && (
                        <>
                            <button
                                onClick={handleCopy}
                                className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                                title="Copy to clipboard"
                            >
                                {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                            </button>
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-zinc-50 dark:text-zinc-900 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                            >
                                <Download className="w-4 h-4" />
                                Download
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-0 overflow-hidden min-h-[500px]">
                {activeTab === 'chat' ? (
                    <div className="p-4 bg-zinc-900 h-full">
                        <ChatInterface jobId={jobId} metadata={result.metadata} />
                    </div>
                ) : (
                    <pre className="p-6 overflow-auto max-h-[600px] text-sm font-mono leading-relaxed text-zinc-800 dark:text-zinc-300 bg-white dark:bg-[#0d1117]">
                        {content[activeTab as keyof typeof content]}
                    </pre>
                )}
            </div>
        </div>
    );
}
