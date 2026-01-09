export interface AIAnalysisResult {
    summary: string;
    keyPoints: string[];
    sentiment?: string;
    topics?: string[];
    qa?: { question: string; answer: string }[];
    rawOutput?: string;
}

export interface AIProviderConfig {
    apiKey: string;
    model?: string;
}

export abstract class BaseAIProvider {
    protected config: AIProviderConfig;

    constructor(config: AIProviderConfig) {
        this.config = config;
    }

    abstract analyzeText(text: string): Promise<AIAnalysisResult>;

    // New method for multimodal analysis (PDF/Images directly)
    abstract analyzeDocument(fileBuffer: Buffer, mimeType: string): Promise<AIAnalysisResult>;

    // New method for Chat with PDF (RAG)
    abstract chat(message: string, context: string): Promise<string>;


    // Optional methods that can be implemented specifically or derived from analyzeText
    abstract generateQA(text: string, count?: number): Promise<{ question: string; answer: string }[]>;
}
