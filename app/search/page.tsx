"use client";

import { useState } from "react";
import axios from "axios";
import Link from "next/link";
import { Search, FileText, Loader2, ArrowLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult {
    jobId: string;
    documentName: string;
    matchCount: number;
    snippets: { content: string; page?: number }[];
}

interface SearchResponse {
    query: string;
    totalMatches: number;
    documentsFound: number;
    aiSummary?: string;
    results: SearchResult[];
}

export default function SearchPage() {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<SearchResponse | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim() || loading) return;

        setLoading(true);
        try {
            const response = await axios.post('/api/search', { query, useAI: true });
            setResults(response.data);
        } catch (error) {
            console.error("Search failed:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center space-x-4 mb-8">
                    <Link href="/" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-white/70" />
                    </Link>
                    <h1 className="text-3xl font-bold text-white">🔍 Search All Documents</h1>
                </div>

                {/* Search Input */}
                <form onSubmit={handleSearch} className="mb-8">
                    <div className="flex gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search across all your PDFs..."
                                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !query.trim()}
                            className="px-6 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl font-medium transition-all"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search"}
                        </button>
                    </div>
                </form>

                {/* Results */}
                {results && (
                    <div className="space-y-6">
                        {/* Stats */}
                        <div className="flex items-center gap-4 text-white/50 text-sm">
                            <span>Found <strong className="text-white">{results.totalMatches}</strong> matches</span>
                            <span>in <strong className="text-white">{results.documentsFound}</strong> documents</span>
                        </div>

                        {/* AI Summary */}
                        {results.aiSummary && (
                            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                                <div className="flex items-center gap-2 text-purple-400 text-sm mb-2">
                                    <Sparkles className="w-4 h-4" />
                                    AI Summary
                                </div>
                                <p className="text-white/80">{results.aiSummary}</p>
                            </div>
                        )}

                        {/* Document Results */}
                        <div className="space-y-4">
                            {results.results.map((doc) => (
                                <Link
                                    key={doc.jobId}
                                    href={`/results/${doc.jobId}`}
                                    className="block p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 rounded-xl bg-blue-500/20">
                                            <FileText className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-white font-medium mb-1">{doc.documentName}</h3>
                                            <p className="text-white/50 text-sm mb-2">{doc.matchCount} matches</p>
                                            {doc.snippets.map((s, i) => (
                                                <p key={i} className="text-white/60 text-sm bg-black/20 rounded-lg p-2 mb-1">
                                                    ...{s.content}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {results.results.length === 0 && (
                            <div className="text-center text-white/50 py-12">
                                No results found for "{results.query}"
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
