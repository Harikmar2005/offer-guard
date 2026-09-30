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

export class DocumentService {
  /**
   * Process raw file payload (base64 or text) using Gemini Multimodal AI
   */
  static async processFile(params: {
    fileName: string;
    mimeType: string;
    base64Data?: string;
    textContent?: string;
    aiClient: GoogleGenAI;
  }): Promise<DocumentExtractionResult> {
    const { fileName, mimeType, base64Data, textContent, aiClient } = params;

    // Plain text input
    if (textContent && (!base64Data || mimeType.startsWith('text/'))) {
      return {
        extractedText: textContent,
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

    // Determine MIME type
    let cleanMime = mimeType || 'application/pdf';
    let sourceType: 'pdf' | 'image' | 'text' | 'unknown' = 'unknown';

    if (cleanMime.includes('pdf') || fileName.toLowerCase().endsWith('.pdf')) {
      cleanMime = 'application/pdf';
      sourceType = 'pdf';
    } else if (cleanMime.includes('png') || fileName.toLowerCase().endsWith('.png')) {
      cleanMime = 'image/png';
      sourceType = 'image';
    } else if (
      cleanMime.includes('jpeg') ||
      cleanMime.includes('jpg') ||
      fileName.toLowerCase().endsWith('.jpg') ||
      fileName.toLowerCase().endsWith('.jpeg')
    ) {
      cleanMime = 'image/jpeg';
      sourceType = 'image';
    } else if (cleanMime.includes('webp') || fileName.toLowerCase().endsWith('.webp')) {
      cleanMime = 'image/webp';
      sourceType = 'image';
    } else {
      cleanMime = 'text/plain';
      sourceType = 'text';
    }

    // Call Gemini Multimodal with image/pdf inlineData
    try {
      const prompt = `You are OfferGuard's OCR and Document Forensic Extraction Engine.
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
        extractedText: parsed.extractedText || 'Document content extracted.',
        sourceType,
        detectedElements: {
          hasLetterhead: Boolean(parsed.hasLetterhead),
          hasSignature: Boolean(parsed.hasSignature),
          hasStamp: Boolean(parsed.hasStamp),
          hasQrCode: Boolean(parsed.hasQrCode),
        },
      };
    } catch (err: any) {
      console.warn('Gemini multimodal OCR fallback:', err.message);
      // Fallback if model fails or image is unreadable
      return {
        extractedText: `[Document file: ${fileName} (${cleanMime})]. Document submitted for investigation.`,
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
}
