"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileText, Loader2, AlertCircle } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import axios from "axios";
import toast from "react-hot-toast";

interface FileUploadProps {
    onUploadSuccess: (jobId: string) => void;
}

export default function FileUpload({ onUploadSuccess }: FileUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        if (file.type !== "application/pdf") {
            toast.error("Please upload a valid PDF file");
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            toast.error("File size exceeds 10MB limit");
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("aiProvider", "gemini"); // Default for now

        try {
            const response = await axios.post("/api/upload", formData, {
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round(
                        (progressEvent.loaded * 100) / (progressEvent.total || file.size)
                    );
                    setUploadProgress(percentCompleted);
                },
            });

            if (response.data.success) {
                toast.success("File uploaded successfully!");
                onUploadSuccess(response.data.jobId);
            }
        } catch (error) {
            console.error("Upload failed", error);
            toast.error("Upload failed. Please try again.");
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    }, [onUploadSuccess]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { "application/pdf": [".pdf"] },
        maxFiles: 1,
        disabled: isUploading,
    });

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div
                {...getRootProps()}
                className={cn(
                    "relative border-2 border-dashed rounded-3xl p-12 transition-all duration-300 ease-out cursor-pointer overflow-hidden",
                    isDragActive
                        ? "border-blue-500 bg-blue-50/50 scale-[1.02] shadow-xl shadow-blue-500/10"
                        : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50 dark:border-zinc-800 dark:hover:bg-zinc-900/50",
                    isUploading && "pointer-events-none opacity-80"
                )}
            >
                <input {...getInputProps()} />

                <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                    <div className={cn(
                        "p-4 rounded-full bg-gradient-to-tr from-blue-500 to-violet-500 text-white shadow-lg transition-transform duration-500",
                        isDragActive ? "rotate-12 scale-110" : "rotate-0"
                    )}>
                        {isUploading ? (
                            <Loader2 className="w-8 h-8 animate-spin" />
                        ) : (
                            <UploadCloud className="w-8 h-8" />
                        )}
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400">
                            {isUploading ? "Uploading..." : "Drop your PDF here"}
                        </h3>
                        <p className="text-sm text-zinc-500 max-w-xs mx-auto">
                            {isUploading
                                ? `${uploadProgress}% completed`
                                : "Support for Arabic & English documents. Max 10MB."}
                        </p>
                    </div>
                </div>

                {/* Dynamic Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-violet-500/5 to-fuchsia-500/5 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                {/* Progress Bar (Visible only when uploading) */}
                {isUploading && (
                    <div className="absolute bottom-0 left-0 h-1.5 bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }} />
                )}
            </div>
        </div>
    );
}
