import { BaseAIProvider } from './base-provider';
import { GeminiProvider } from './providers/gemini';
// import { NotebookLMProvider } from './providers/notebooklm'; // Future

export class AIManager {
    private static instance: AIManager;
    private providers: Map<string, BaseAIProvider> = new Map();

    private constructor() {
        // Initialize providers from env
        const geminiKey = process.env.GEMINI_API_KEY;
        const geminiModel = process.env.GEMINI_MODEL || 'gemini-pro'; // Fallback to gemini-pro
        if (geminiKey) {
            this.providers.set('gemini', new GeminiProvider({
                apiKey: geminiKey,
                model: geminiModel
            }));
        }
    }

    public static getInstance(): AIManager {
        if (!AIManager.instance) {
            AIManager.instance = new AIManager();
        }
        return AIManager.instance;
    }

    public getProvider(providerName: string): BaseAIProvider | undefined {
        return this.providers.get(providerName);
    }

    public getAvailableProviders(): string[] {
        return Array.from(this.providers.keys());
    }

    // Helper to re-initialize if keys change (e.g. settings update)
    public reloadProviders() {
        this.providers.clear();
        const geminiKey = process.env.GEMINI_API_KEY;
        const geminiModel = process.env.GEMINI_MODEL || 'gemini-pro';

        if (geminiKey) {
            this.providers.set('gemini', new GeminiProvider({
                apiKey: geminiKey,
                model: geminiModel
            }));
        }
        // Add others here
    }
}

export const aiManager = AIManager.getInstance();
