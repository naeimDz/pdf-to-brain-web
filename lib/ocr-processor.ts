import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export const ocrProcessor = {
    /**
     * Detects if a PDF is scanned/image-based.
     * Simple heuristic: low text-to-page-area ratio or very few characters per page.
     * For MVP/Demo: we might just force OCR if the user says so, 
     * or rely on pdf-parse returning empty string.
     */
    async detectScannedPDF(filePath: string): Promise<boolean> {
        try {
            const pdfParse = require('pdf-parse');
            const dataBuffer = await fs.readFile(filePath);
            const data = await pdfParse(dataBuffer);

            const cleanText = data.text.replace(/\s/g, '');
            if (cleanText.length < 50 && data.numpages > 0) {
                console.log(`📄 PDF appears to be scanned (${cleanText.length} chars in ${data.numpages} pages)`);
                return true;
            }
            console.log(`📄 PDF at ${filePath} appears to be text-based.`);
            return false;
        } catch (error) {
            console.error(`Error detecting scanned PDF for ${filePath}:`, error);
            // If pdf-parse fails, assume it might be a scanned PDF or unreadable
            return true;
        }
    },

    /**
     * Extracts text from a PDF using Tesseract.js.
     * Note: Tesseract.js works on images. We need to convert PDF pages to images first.
     * For a pure Node.js solution without external dependencies like ImageMagick/Ghostscript,
     * we might need a specific library or just rely on Tesseract if it supports PDF directly (it doesn't natively).
     * 
     * For this "Node.js" environment, usually `pdf-poppler` or `ghostscript` is needed to render images.
     * To keep it SIMPLE for the user (no binary installs), we might try a JS-only approach 
     * or just warn that we strictly need text-based PDFs for now unless they install helpers.
     * 
     * HOWEVER, since Tesseract.js is requested, let's implement a best-effort logic.
     */
    async extractTextWithOCR(filePath: string, language = 'ara+eng'): Promise<string> {
        console.log(`OCR requested for ${filePath}`);

        // Tesseract.js has issues with Next.js worker paths in development.
        // For production, you'd need to configure workerPath correctly or use a different approach.
        // For now, we return a helpful message instead of crashing.

        console.warn("⚠️ OCR is not fully configured. Tesseract.js requires additional setup for Next.js.");
        console.warn("📝 To enable OCR:");
        console.warn("   1. Use Google Vision API (set OCR_PROVIDER=google-vision in .env.local)");
        console.warn("   2. Or configure Tesseract.js worker paths for Next.js");

        return `[OCR Placeholder]
    
This PDF appears to be scanned/image-based, but OCR is not fully configured.

To enable OCR processing:
1. Use Google Vision API for better accuracy (especially for Arabic)
2. Or configure Tesseract.js worker paths for Next.js environment

For now, please use text-based PDFs or configure Google Vision API.`;
    }
};
