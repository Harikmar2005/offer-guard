import { GoogleGenAI } from '@google/genai';

export interface DocumentExtractionResult {
  extractedText: string;
  sourceType: 'pdf' | 'image' | 'text' | 'unknown';
  detectedElements: {
    hasLetterhead: boolean;
    hasSignature: boolean;
    hasStamp: boolean;
    hasQrCode: boolean;
    pageCount?: number;
  };
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'text/plain',
]);

export class DocumentService {
  /**
   * Sanitizes input filename to prevent path traversal or shell exploits
   */
  static sanitizeFilename(fileName: string): string {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  }

  /**
   * Validates document payload before processing
   */
  static validatePayload(params: {
    fileName?: string;
    mimeType?: string;
    base64Data?: string;
    textContent?: string;
  }): { isValid: boolean; error?: string; cleanMime: string } {
    const { fileName, mimeType, base64Data, textContent } = params;

    if (!base64Data && !textContent) {
      return { isValid: false, error: 'No document data or text content provided.', cleanMime: 'text/plain' };
    }

    if (base64Data) {
      // Check approximate decoded size: base64 len * 0.75
      const approxBytes = Math.floor((base64Data.length * 3) / 4);
      if (approxBytes > MAX_FILE_SIZE_BYTES) {
        return { isValid: false, error: 'File size exceeds 10MB limit.', cleanMime: mimeType || '' };
      }
    }

    const rawMime = (mimeType || 'application/pdf').toLowerCase().trim();
    let cleanMime = rawMime;
    if (rawMime.includes('pdf') || fileName?.toLowerCase().endsWith('.pdf')) {
      cleanMime = 'application/pdf';
    } else if (rawMime.includes('png') || fileName?.toLowerCase().endsWith('.png')) {
      cleanMime = 'image/png';
    } else if (
      rawMime.includes('jpeg') ||
      rawMime.includes('jpg') ||
      fileName?.toLowerCase().endsWith('.jpg') ||
      fileName?.toLowerCase().endsWith('.jpeg')
    ) {
      cleanMime = 'image/jpeg';
    } else if (rawMime.includes('webp') || fileName?.toLowerCase().endsWith('.webp')) {
      cleanMime = 'image/webp';
    } else if (rawMime.includes('text') || fileName?.toLowerCase().endsWith('.txt')) {
      cleanMime = 'text/plain';
    } else {
      return { isValid: false, error: `Unsupported document format (${rawMime}). Only PDF, PNG, JPG, JPEG, and WebP are accepted.`, cleanMime: rawMime };
    }

    if (!ALLOWED_MIME_TYPES.has(cleanMime)) {
      return { isValid: false, error: `Invalid MIME type: ${cleanMime}`, cleanMime };
    }

    return { isValid: true, cleanMime };
  }

  /**
   * Process raw file payload (base64 or text) in-memory without persistent disk leakage
   */
  static async processFile(params: {
    fileName: string;
    mimeType: string;
    base64Data?: string;
    textContent?: string;
    aiClient?: GoogleGenAI;
  }): Promise<DocumentExtractionResult> {
    const { fileName, base64Data, textContent, aiClient } = params;
    const sanitizedName = this.sanitizeFilename(fileName || 'document.pdf');

    const validation = this.validatePayload(params);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid document payload');
    }
    const cleanMime = validation.cleanMime;

    // Plain text input
    if (textContent && (!base64Data || cleanMime === 'text/plain')) {
      return {
        extractedText: textContent.trim(),
        sourceType: 'text',
        detectedElements: {
          hasLetterhead: false,
          hasSignature: false,
          hasStamp: false,
          hasQrCode: false,
        },
      };
    }

    if (!base64Data) {
      throw new Error('No document content or base64 data provided.');
    }

    const sourceType = cleanMime === 'application/pdf' ? 'pdf' : 'image';

    // If Gemini Vision AI is available, use multimodal OCR
    if (aiClient && process.env.GEMINI_API_KEY) {
      try {
        const prompt = `You are OfferGuard's Document Forensic Extraction Engine.
Analyze this submitted job offer document / appointment letter:
1. Extract ALL visible textual content verbatim (company names, recruiter credentials, roles, stipends, UPI IDs, bank accounts, deadlines, fee clauses).
2. Inspect for visual fraud indicators:
   - Is there a company letterhead?
   - Is there an authorized signature or digital seal?
   - Is there an official rubber stamp?
   - Is there an embedded UPI payment QR code or payment barcode?

Respond with a JSON object with this exact structure:
{
  "extractedText": "full extracted text transcript...",
  "hasLetterhead": true/false,
  "hasSignature": true/false,
  "hasStamp": true/false,
  "hasQrCode": true/false
}`;

        const aiResponse = await aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            prompt,
            {
              inlineData: {
                mimeType: cleanMime,
                data: base64Data,
              },
            },
          ],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        const parsed = JSON.parse(aiResponse.text?.trim() || '{}');
        return {
          extractedText: parsed.extractedText || `[Extracted from ${sanitizedName}]`,
          sourceType,
          detectedElements: {
            hasLetterhead: Boolean(parsed.hasLetterhead),
            hasSignature: Boolean(parsed.hasSignature),
            hasStamp: Boolean(parsed.hasStamp),
            hasQrCode: Boolean(parsed.hasQrCode),
          },
        };
      } catch (err: any) {
        console.warn('Gemini multimodal OCR fallback triggered:', err.message);
      }
    }

    // Fallback extraction
    return {
      extractedText: `[Document: ${sanitizedName} (${cleanMime})]. Document submitted for investigation.`,
      sourceType,
      detectedElements: {
        hasLetterhead: false,
        hasSignature: false,
        hasStamp: false,
        hasQrCode: false,
      },
    };
  }
}
