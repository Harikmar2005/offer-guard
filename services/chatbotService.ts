import { GoogleGenAI } from '@google/genai';
import { CaseRecord } from '../src/types';

export class ChatbotService {
  static async answerQuestion(params: {
    question: string;
    caseRecord: CaseRecord | null;
    aiClient: GoogleGenAI;
  }): Promise<{ answer: string; suggestedQuestions: string[] }> {
    const { question, caseRecord, aiClient } = params;

    if (!caseRecord) {
      return {
        answer:
          'Please select or submit an internship/job offer first. Once an investigation is active, I can explain its specific risk score, red flags, DNS verification results, and AICTE compliance.',
        suggestedQuestions: [
          'How does OfferGuard assess recruitment risk?',
          'What are the AICTE guidelines on internship fees?',
          'How can I check if a recruiter email is legitimate?',
        ],
      };
    }

    try {
      const prompt = `You are OfferGuard's AI Investigation Q&A Assistant.
A student or placement faculty is asking questions about an investigated job/internship offer.

=== INVESTIGATION CONTEXT ===
Case Number: ${caseRecord.caseNumber}
Company Claimed: ${caseRecord.extractedDetails.company_name}
Role: ${caseRecord.extractedDetails.job_title}
Risk Score: ${caseRecord.riskScore}/100 (${caseRecord.riskLevel})
Verification Status: ${caseRecord.verificationStatus}
Advance Payment Requested: ${caseRecord.extractedDetails.payment_requested ? `YES: ₹${caseRecord.extractedDetails.payment_amount} via ${caseRecord.extractedDetails.payment_method} (${caseRecord.extractedDetails.payment_reason})` : 'NO'}
Recruiter Email: ${caseRecord.extractedDetails.recruiter_email || 'None'}
Email Domain: ${caseRecord.extractedDetails.email_domain || 'None'}
Website: ${caseRecord.extractedDetails.website || 'None'}
Requested Documents: ${caseRecord.extractedDetails.requested_documents?.join(', ') || 'None'}

DETECTED RISK SIGNALS:
${caseRecord.detectedSignals.map((s) => `- ${s.name} (Severity: ${s.severity}, Impact: +${s.impact} pts) Evidence: ${s.evidence}`).join('\n')}

EVIDENCE CHAIN:
${caseRecord.evidenceChain.map((e) => `- [${e.status}] ${e.step}: "${e.signal}" (Source: ${e.source}) -> ${e.explanation}`).join('\n')}

REGULATORY POLICIES (AICTE / UGC INDIA):
- AICTE Internship Policy Section 4 strictly prohibits any company or intermediary from charging registration, onboarding, police clearance, security deposit, or training fees.
- Any demand for payment via UPI or personal banking before or during an internship is classified as predatory fraud.
- Legitimate employers issue letters from corporate enterprise domains, never personal consumer accounts (@gmail.com).

USER QUESTION:
"${question}"

INSTRUCTIONS:
1. Provide an authoritative, grounded, and concise answer directly addressing the user's question.
2. Rely ONLY on the evidence above. Never invent facts not supported by the evidence.
3. If asked whether to pay, provide a clear, unambiguous warning citing AICTE rules.
4. If asked what to do, provide 2-3 safe next steps.
5. Provide 3 relevant follow-up questions tailored to this case.

Respond in JSON format:
{
  "answer": "...",
  "suggestedQuestions": ["...", "...", "..."]
}`;

      const aiResponse = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const parsed = JSON.parse(aiResponse.text?.trim() || '{}');
      return {
        answer: parsed.answer || 'Analysis complete.',
        suggestedQuestions: Array.isArray(parsed.suggestedQuestions)
          ? parsed.suggestedQuestions.slice(0, 3)
          : [
              'What should I reply to this recruiter?',
              'Why is this fee illegal under AICTE rules?',
              'How can I verify the company on MCA?',
            ],
      };
    } catch (err: any) {
      console.warn('Chatbot Gemini fallback:', err.message);
      // Deterministic grounded fallback
      const hasFee = caseRecord.extractedDetails.payment_requested;
      return {
        answer: hasFee
          ? `🛑 DO NOT PAY ANY MONEY. The recruiter is demanding ₹${caseRecord.extractedDetails.payment_amount.toLocaleString()} for "${caseRecord.extractedDetails.payment_reason}" via ${caseRecord.extractedDetails.payment_method}. Under AICTE internship guidelines, demanding any upfront fee from students is strictly prohibited.`
          : `For Case ${caseRecord.caseNumber} (${caseRecord.extractedDetails.company_name}), the deterministic risk score is ${caseRecord.riskScore}/100 (${caseRecord.riskLevel}). Status: ${caseRecord.verificationStatus}. Recommended action: ${caseRecord.recommendedAction}`,
        suggestedQuestions: [
          'What are the main red flags in this offer?',
          'What should I independently verify next?',
          'How do I report this to placement faculty?',
        ],
      };
    }
  }
}
