import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { clsx } from '../lib/utils';
import { JobMetadata } from '../types';

interface ChatInterfaceProps {
    jobId: string;
    metadata: JobMetadata;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

export default function ChatInterface({ jobId, metadata }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: `Hello! I've analyzed "${metadata.originalName}". Ask me anything about it.`,
            timestamp: Date.now()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { role: 'user', content: input, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await axios.post('/api/chat', {
                jobId,
                message: userMsg.content
            });

            const aiMsg: Message = {
                role: 'assistant',
                content: response.data.answer || "I couldn't generate an answer.",
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, aiMsg]);

        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "Sorry, I encountered an error while thinking. Please try again.",
                timestamp: Date.now()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[600px] w-full max-w-4xl mx-auto rounded-xl overflow-hidden glass-panel border border-white/20 shadow-2xl">
            {/* Header */}
            <div className="p-4 bg-white/10 border-b border-white/10 backdrop-blur-md flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <span className="text-2xl">💬</span>
                    <h3 className="font-semibold text-white/90">Chat with PDF</h3>
                </div>
                <div className="text-xs text-white/50 px-2 py-1 bg-black/20 rounded-full">
                    RAG Enhanced
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={clsx(
                            "flex w-full mb-2",
                            msg.role === 'user' ? "justify-end" : "justify-start"
                        )}
                    >
                        <div className={clsx(
                            "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg backdrop-blur-sm",
                            msg.role === 'user'
                                ? "bg-blue-600/80 text-white rounded-br-none"
                                : "bg-white/10 text-gray-200 border border-white/10 rounded-bl-none"
                        )}>
                            {msg.content}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start w-full">
                        <div className="bg-white/5 border border-white/5 rounded-2xl rounded-bl-none px-4 py-3 flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-black/20 border-t border-white/10">
                <form onSubmit={handleSend} className="flex space-x-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question about this document..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-6 py-3 font-medium transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95"
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}
