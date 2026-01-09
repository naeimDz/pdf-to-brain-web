"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { FileText, Clock, CheckCircle, AlertCircle, Loader2, ArrowLeft, Trash2, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import toast, { Toaster } from "react-hot-toast";

interface Document {
    id: string;
    originalName: string;
    fileSize: number;
    status: string;
    progress: number;
    createdAt: string;
    processedAt?: string;
    tokenCount?: number;
    chunkCount?: number;
}

export default function LibraryPage() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);

    const fetchDocuments = async () => {
        try {
            const response = await axios.get('/api/documents');
            setDocuments(response.data.documents || []);
        } catch (err) {
            setError("Failed to load documents");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    const handleDelete = async (e: React.MouseEvent, docId: string, docName: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (!confirm(`Delete "${docName}"? This cannot be undone.`)) return;

        setDeleting(docId);
        try {
            await axios.delete(`/api/documents/${docId}`);
            toast.success("Document deleted");
            setDocuments(prev => prev.filter(d => d.id !== docId));
        } catch (err) {
            toast.error("Failed to delete");
            console.error(err);
        } finally {
            setDeleting(null);
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const formatTokens = (tokens: number) => {
        if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
        return tokens.toString();
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString();
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
            case 'queued': return <Clock className="w-4 h-4 text-yellow-500" />;
            default: return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
        }
    };

    // Calculate total tokens
    const totalTokens = documents.reduce((sum, d) => sum + (d.tokenCount || 0), 0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-8">
            <Toaster position="bottom-right" />
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-4">
                        <Link href="/" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                            <ArrowLeft className="w-5 h-5 text-white/70" />
                        </Link>
                        <h1 className="text-3xl font-bold text-white">📚 Document Library</h1>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <span className="text-white/50">{documents.length} docs</span>
                        <span className="flex items-center gap-1 text-purple-400">
                            <Coins className="w-4 h-4" />
                            {formatTokens(totalTokens)} tokens
                        </span>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                ) : error ? (
                    <div className="text-center text-red-400 py-12">{error}</div>
                ) : documents.length === 0 ? (
                    <div className="text-center text-white/50 py-12">
                        <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p>No documents uploaded yet.</p>
                        <Link href="/" className="text-blue-400 hover:underline mt-2 inline-block">
                            Upload your first PDF
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {documents.map((doc) => (
                            <Link
                                key={doc.id}
                                href={`/results/${doc.id}`}
                                className={cn(
                                    "block p-4 rounded-2xl border transition-all hover:scale-[1.005]",
                                    "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="p-2.5 rounded-xl bg-blue-500/20">
                                            <FileText className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-medium truncate max-w-sm">
                                                {doc.originalName}
                                            </h3>
                                            <div className="flex items-center gap-3 text-white/40 text-xs mt-1">
                                                <span>{formatBytes(doc.fileSize)}</span>
                                                <span>•</span>
                                                <span>{formatDate(doc.createdAt)}</span>
                                                {doc.tokenCount ? (
                                                    <>
                                                        <span>•</span>
                                                        <span className="text-purple-400 flex items-center gap-1">
                                                            <Coins className="w-3 h-3" />
                                                            {formatTokens(doc.tokenCount)} tokens
                                                        </span>
                                                    </>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        {getStatusIcon(doc.status)}
                                        <span className={cn(
                                            "text-xs capitalize px-2.5 py-1 rounded-full",
                                            doc.status === 'completed' && "bg-green-500/20 text-green-400",
                                            doc.status === 'failed' && "bg-red-500/20 text-red-400",
                                            doc.status === 'queued' && "bg-yellow-500/20 text-yellow-400",
                                            !['completed', 'failed', 'queued'].includes(doc.status) && "bg-blue-500/20 text-blue-400"
                                        )}>
                                            {doc.status}
                                        </span>
                                        <button
                                            onClick={(e) => handleDelete(e, doc.id, doc.originalName)}
                                            disabled={deleting === doc.id}
                                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                                            title="Delete document"
                                        >
                                            {deleting === doc.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
