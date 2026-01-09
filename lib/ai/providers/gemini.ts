import { BaseAIProvider, AIAnalysisResult, AIProviderConfig } from '../base-provider';
import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiProvider extends BaseAIProvider {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(config: AIProviderConfig) {
        super(config);
        this.genAI = new GoogleGenerativeAI(config.apiKey);
        this.model = this.genAI.getGenerativeModel({ model: config.model || 'gemini-pro' });
    }

    async analyzeText(text: string): Promise<AIAnalysisResult> {
        try {
            // Prompt engineering for structured output
            const prompt = `
        Analyze the following text and provide a structured JSON response.
        The response must be valid JSON with the following schema:
        {
          "summary": "Concise summary of the text (max 200 words)",
          "keyPoints": ["Key point 1", "Key point 2", ...],
          "topics": ["Topic 1", "Topic 2", ...],
          "sentiment": "positive" | "neutral" | "negative",
          "qa": [
            { "question": "Relevant question based on text", "answer": "Answer from text" },
            { "question": "Another relevant question", "answer": "Answer" }
          ]
        }
        
        Text to analyze:
        ${text.substring(0, 30000)} // Truncate to avoid token limits for now
      `;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const textResponse = response.text();

            // Clean up markdown code blocks if present (Gemini sometimes adds ```json ... ```)
            const jsonString = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();

            return JSON.parse(jsonString) as AIAnalysisResult;

        } catch (error) {
            console.error("Gemini Analysis Failed:", error);
            // Fallback result
            return {
                summary: "Analysis failed due to an error.",
                keyPoints: [],
                rawOutput: String(error)
            };
        }
    }

    async analyzeDocument(fileBuffer: Buffer, mimeType: string): Promise<AIAnalysisResult> {
        try {
            // Multimodal requires Gemini 1.5 or Vision models. 
            // If the configured model is the generic 'gemini-pro' (1.0 text-only), we switch to 'gemini-1.5-flash' for this task.
            const currentModelName = this.config.model || 'gemini-pro';
            const modelName = (currentModelName === 'gemini-pro') ? 'gemini-1.5-flash' : currentModelName;

            console.log(`Using model ${modelName} for Multimodal analysis.`);

            // Get fresh model instance for this request to ensure correct model
            const model = this.genAI.getGenerativeModel({ model: modelName });
            const prompt = `
                Analyze this document perfectly. Return a valid JSON with:
                summary (max 200 words), keyPoints (list), topics (list), 
                sentiment (positive/neutral/negative), and 3 qa pairs (question/answer).
            `;

            const imagePart = {
                inlineData: {
                    data: fileBuffer.toString('base64'),
                    mimeType
                }
            };

            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const textResponse = response.text();

            const jsonString = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonString) as AIAnalysisResult;

        } catch (error) {
            console.error("Gemini Multimodal Analysis Failed:", error);
            throw error;
        }
    }

    async chat(message: string, context: string): Promise<string> {
        try {
            const systemPrompt = `
You are a helpful Research Assistant for the "PDF-to-Brain" project.
Your goal is to answer the user's question based PRIMARILY on the provided Context (chunks from a document).

RULES:
1. If asked about your identity or role (e.g., "Who are you?", "What do you do?"), explain that you are an AI assistant helping to analyze this specific document.
2. If the answer is in the Context, answer directly and concisely.
3. If the answer is NOT in the context and NOT about your identity, say "I couldn't find that information in the document".
4. Do not hallucinate or invent facts not present in the chunks.

Context:
${context}
`;
            // Simple turn for now
            const result = await this.model.generateContent([systemPrompt, `User Question: ${message}`]);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error("Gemini Chat Failed:", error);
            return "I'm having trouble connecting to my brain right now. Please try again.";
        }
    }

    async expandQuery(query: string, fileNames: string[] = []): Promise<string[]> {
        try {
            // Use Flash for speed and cost
            const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

            const contextStr = fileNames.length > 0
                ? `Context - The user has these documents in their library: ${fileNames.slice(0, 50).join(', ')}`
                : "";

            const prompt = `
                You are a Search Query Optimizer.
                Convert the user's natural language question into a list of 3-5 effective search keywords/phrases for a SQL LIKE search.
                ${contextStr}
                
                Rules:
                1. Include synonyms and core entities.
                2. If the user mentions a document name loosely, map it to the exact filename from the list.
                3. Return ONLY a valid JSON array of strings. No markdown.

                User Question: "${query}"
            `;

            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

            const keywords = JSON.parse(cleanText);

            if (Array.isArray(keywords)) {
                return keywords;
            }
            return [query];

        } catch (error) {
            console.warn("Query Expansion Failed, falling back to original:", error);
            return [query];
        }
    }

    async embedText(text: string): Promise<number[]> {
        try {
            const model = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
            const result = await model.embedContent(text);
            return result.embedding.values;
        } catch (error) {
            console.error("Embedding generation failed:", error);
            return [];
        }
    }

    async detectIntent(query: string, fileNames: string[]): Promise<{ isPersonal: boolean; targetFiles: string[] }> {
        try {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const prompt = `
                Analyze the User Question and the list of Available Files.
                Determine if the user is asking a "Personal Reflection" question about themselves (e.g., "What do you think of me?", "My skills?", "Summary of my life").
                
                If YES:
                1. Identify which file represents the user's Resume/CV/Profile.
                2. Return valid JSON: { "isPersonal": true, "targetFiles": ["ExactFileName.pdf"] }
                
                If NO (General question):
                Return valid JSON: { "isPersonal": false, "targetFiles": [] }

                Available Files: ${fileNames.slice(0, 50).join(', ')}
                User Question: "${query}"
            `;

            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const json = JSON.parse(cleanText);

            return {
                isPersonal: !!json.isPersonal,
                targetFiles: Array.isArray(json.targetFiles) ? json.targetFiles : []
            };
        } catch (error) {
            console.warn("Intent detection failed:", error);
            return { isPersonal: false, targetFiles: [] };
        }
    }

    async generateQA(text: string, count: number = 5): Promise<{ question: string; answer: string; }[]> {
        const result = await this.analyzeText(text);
        return result.qa || [];
    }
}
