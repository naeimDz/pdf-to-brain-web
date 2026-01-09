"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, Circle, AlertCircle, FileText, Brain, Cpu, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProcessingStatus, JobMetadata } from "@/types";
import axios from "axios";

interface ProcessingStatusDisplayProps {
    jobId: string;
    onComplete: (result: any) => void;
}

const STEPS = [
    { id: "queued", label: "Queued", icon: Circle },
    { id: "uploading", label: "Uploading", icon: UploadStatusIcon },
    { id: "analyzing", label: "Analyzing PDF", icon: FileText },
    { id: "ocr_processing", label: "OCR Processing", icon: Cpu },
    { id: "jules_processing", label: "Jules API", icon: Brain },
    { id: "ai_processing", label: "AI Insights", icon: Wand2 },
    { id: "completed", label: "Ready", icon: CheckCircle2 },
];

function UploadStatusIcon() { return <div className="w-5 h-5 rounded-full border-2 border-zinc-300" /> }

export default function ProcessingStatusDisplay({ jobId, onComplete }: ProcessingStatusDisplayProps) {
    const [status, setStatus] = useState<ProcessingStatus>("queued");
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        const checkStatus = async () => {
            try {
                const response = await axios.get(`/api/status/${jobId}`);
                const job = response.data;

                setStatus(job.status);
                setProgress(job.progress);

                if (job.status === "completed") {
                    clearInterval(interval);
                    onComplete(job.result);
                }

                if (job.status === "failed") {
                    clearInterval(interval);
                    setError(job.error || "Processing failed");
                }
            } catch (err) {
                console.error("Status check failed", err);
            }
        };

        interval = setInterval(checkStatus, 1500); // Poll every 1.5s
        return () => clearInterval(interval);
    }, [jobId, onComplete]);

    if (error) {
        return (
            <div className="w-full max-w-2xl mx-auto p-6 rounded-2xl bg-red-50 border border-red-100 dark:bg-red-900/20 dark:border-red-900/50 flex items-center gap-4 text-red-600 dark:text-red-400">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <p className="font-medium">{error}</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl mx-auto space-y-8">
            {/* Main Progress Indicator */}
            <div className="relative pt-8 pb-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-zinc-800 dark:text-white">Processing...</h3>
                    <span className="text-2xl font-mono text-blue-600 dark:text-blue-400 font-bold">{progress}%</span>
                </div>

                <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Steps Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {STEPS.filter(s => s.id !== "queued" && s.id !== "completed").map((step, idx) => {
                    const isActive = status === step.id;
                    const isPast = getStepIndex(status) > getStepIndex(step.id as ProcessingStatus);

                    return (
                        <div
                            key={step.id}
                            className={cn(
                                "p-4 rounded-xl border transition-all duration-300 flex items-center gap-3",
                                isActive
                                    ? "bg-white dark:bg-zinc-900 border-blue-500/50 shadow-lg shadow-blue-500/10 scale-105"
                                    : isPast
                                        ? "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 opacity-70"
                                        : "bg-transparent border-transparent opacity-50"
                            )}
                        >
                            <div className={cn(
                                "p-2 rounded-lg",
                                isActive ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                            )}>
                                {isActive ? <Loader2 className="w-5 h-5 animate-spin" /> : <step.icon className="w-5 h-5" />}
                            </div>
                            <span className={cn("font-medium text-sm", isActive ? "text-zinc-900 dark:text-white" : "text-zinc-500")}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function getStepIndex(status: ProcessingStatus) {
    const order = ["queued", "uploading", "analyzing", "ocr_processing", "jules_processing", "ai_processing", "completed"];
    return order.indexOf(status);
}
