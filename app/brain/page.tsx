"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import Link from "next/link";
import { ArrowLeft, Send, Sparkles, Brain, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import toast, { Toaster } from "react-hot-toast";

interface Message {
    role: 'user' | 'assistant';
    content: string;
    sources?: string[];
    isError?: boolean;
    cached?: boolean;
}

export default function AskBrainPage() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: "Hello! I'm your Second Brain. I can search across all your documents to find answers. Try asking me something specific!"
        }
    ]);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = input;
        setInput("");
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            // "Thinking" state could be visualized here
            const response = await axios.post('/api/chat/brain', { message: userMsg });

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: response.data.answer,
                sources: response.data.sources,
                cached: response.data.cached
            }]);

        } catch (error: any) {
            console.error("Brain Error:", error);
            const errorMsg = error.response?.data?.answer || "I had trouble connecting to your brain database.";
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: errorMsg,
                isError: true
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col">
            <Toaster position="top-center" />

            {/* Header */}
            <header className="p-4 border-b border-white/10 flex items-center gap-4 bg-white/5 backdrop-blur-md sticky top-0 z-10">
                <Link href="/" className="p-2 rounded-xl hover:bg-white/10 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-white/70" />
                </Link>
                <div className="flex items-center gap-2">
                    <Brain className="w-6 h-6 text-purple-500" />
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                        Ask Brain
                    </h1>
                </div>
            </header>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 max-w-3xl mx-auto w-full">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={cn(
                            "flex flex-col gap-2 max-w-[85%]",
                            msg.role === 'user' ? "self-end items-end" : "self-start items-start"
                        )}
                    >
                        <div className={cn(
                            "px-5 py-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-lg",
                            msg.role === 'user'
                                ? "bg-purple-600 text-white rounded-br-none"
                                : "bg-zinc-900 border border-white/10 text-zinc-100 rounded-bl-none",
                            msg.isError && "border-red-500/50 bg-red-500/10 text-red-200"
                        )}>
                            {msg.content}
                        </div>

                        {/* Sources Display */}
                        <div className="flex flex-wrap gap-2 mt-1 px-1">
                            {msg.cached && (
                                <span className="text-xs px-2 py-1 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 flex items-center gap-1">
                                    ⚡ From Memory
                                </span>
                            )}
                            {msg.sources && msg.sources.length > 0 && (
                                <>
                                    <span className="text-xs text-white/40 uppercase tracking-wider flex items-center">Sources:</span>
                                    {msg.sources.map((src, i) => (
                                        <span key={i} className="text-xs px-2 py-1 rounded bg-white/5 border border-white/5 text-purple-300">
                                            📄 {src}
                                        </span>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="self-start px-5 py-4 rounded-2xl bg-zinc-900 border border-white/10 rounded-bl-none flex items-center gap-3">
                        <Loader />
                        <span className="text-sm text-white/50 animate-pulse">Searching knowledge base...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-black/50 backdrop-blur-xl border-t border-white/10">
                <form onSubmit={handleSend} className="max-w-3xl mx-auto flex gap-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask anything across your entire library..."
                        className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-light"
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl px-5 flex items-center justify-center transition-all"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
}

// Simple CSS loader component
function Loader() {
    return (
        <div className="flex space-x-1">
            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce"></div>
        </div>
    );
}
