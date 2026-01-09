"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import ResultsView from "@/components/ResultsView";
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function ResultsPage() {
    const params = useParams();
    const router = useRouter();
    const jobId = params.id as string;

    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchJob = async () => {
            try {
                const response = await axios.get(`/api/status/${jobId}`);
                const job = response.data;

                if (job.status === 'completed' && job.result) {
                    setResult(job.result);
                } else if (job.status === 'failed') {
                    setError(job.error || "Job failed");
                } else {
                    setError(`Job is still ${job.status}. Please wait.`);
                }
            } catch (err: any) {
                setError(err.response?.data?.error || "Failed to load job");
            } finally {
                setLoading(false);
            }
        };

        if (jobId) {
            fetchJob();
        }
    }, [jobId]);

    return (
        <main className="min-h-screen bg-[#fafafa] dark:bg-black p-8">
            {/* Header */}
            <div className="max-w-4xl mx-auto mb-8">
                <div className="flex items-center space-x-4">
                    <Link
                        href="/library"
                        className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                    </Link>
                    <h1 className="text-xl font-semibold text-zinc-800 dark:text-white">
                        Document Results
                    </h1>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                ) : error ? (
                    <div className="text-center py-16">
                        <AlertCircle className="w-16 h-16 mx-auto text-red-400 mb-4" />
                        <p className="text-red-400 mb-4">{error}</p>
                        <Link
                            href="/library"
                            className="text-blue-500 hover:underline"
                        >
                            ← Back to Library
                        </Link>
                    </div>
                ) : result ? (
                    <ResultsView jobId={jobId} result={result} />
                ) : null}
            </div>
        </main>
    );
}
