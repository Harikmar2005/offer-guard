import { GoogleGenAI } from '@google/genai';
import { CaseRecord } from '../src/types';

export class ChatbotService {
  static async answerQuestion(params: {
    question: string;
    caseRecord: CaseRecord | null;
    aiClient?: GoogleGenAI;
  }): Promise<{ answer: string; suggestedQuestions: string[] }> {
    const { question, caseRecord, aiClient } = params;

    if (!caseRecord) {
      return {
        answer:
          'Please select or submit an internship/job offer first. Once an investigation is active, I can explain its specific risk score, red flags, DNS verification results, and company verification status.',
        suggestedQuestions: [
          'How does OfferGuard assess recruitment risk?',
          'Why are upfront payment requests considered high risk?',
          'How can I check if a recruiter email domain technically resolves?',
        ],
      };
    }

    // Prepare structured evidence context
    const hasFee = caseRecord.extractedDetails.payment_requested;
    const feeInfo = hasFee
      ? `YES: ₹${caseRecord.extractedDetails.payment_amount} via ${caseRecord.extractedDetails.payment_method} (${caseRecord.extractedDetails.payment_reason})`
      : 'NO';

    const signalsSummary = caseRecord.detectedSignals.length > 0
      ? caseRecord.detectedSignals.map((s) => `- ${s.name} (Severity: ${s.severity}, Impact: +${s.impact} pts) Evidence: ${s.evidence}`).join('\n')
      : 'No specific risk signals detected.';

    const evidenceSummary = caseRecord.evidenceChain.length > 0
      ? caseRecord.evidenceChain.map((e) => `- [${e.status}] ${e.step}: "${e.signal}" (Source: ${e.source}) -> ${e.explanation}`).join('\n')
      : 'No evidence nodes recorded.';

    const unverifiedSummary = caseRecord.unverifiedInfo.length > 0
      ? caseRecord.unverifiedInfo.map((u) => `- ${u}`).join('\n')
      : 'None noted.';

    if (aiClient && process.env.GEMINI_API_KEY) {
      try {
        const prompt = `You are OfferGuard's AI Investigation Q&A Assistant.
A student or placement faculty is asking questions about an investigated job/internship offer.

=== INVESTIGATION CONTEXT ===
Case Number: ${caseRecord.caseNumber}
Company Claimed: ${caseRecord.extractedDetails.company_name}
Role: ${caseRecord.extractedDetails.job_title}
Risk Score: ${caseRecord.riskScore}/100 (${caseRecord.riskLevel})
Verification Status: ${caseRecord.verificationStatus}
Advance Payment Requested: ${feeInfo}
Recruiter Email: ${caseRecord.extractedDetails.recruiter_email || 'None'}
Email Domain: ${caseRecord.extractedDetails.email_domain || 'None'}
Website: ${caseRecord.extractedDetails.website || 'None'}
Requested Documents: ${caseRecord.extractedDetails.requested_documents?.join(', ') || 'None'}

DETECTED RISK SIGNALS:
${signalsSummary}

EVIDENCE CHAIN:
${evidenceSummary}

UNVERIFIED INFORMATION:
${unverifiedSummary}

POLICY CONTEXT:
- Upfront payment requests (registration fees, police clearance fees, hardware courier deposits, bootcamp training bonds) are treated as high-risk recruitment signals. Many institutional recruitment policies restrict or discourage upfront payments.
- Technical domain validity (DNS MX/A records) does NOT establish company legitimacy.
- Independent company verification requires official registry confirmation. If unavailable, state that it is unverified or unavailable.

USER QUESTION:
"${question}"

INSTRUCTIONS:
1. Provide a grounded, objective answer directly addressing the user's question.
2. Rely ONLY on the verified evidence above. Never invent facts not supported by the evidence.
3. If asked whether to pay, state clearly that upfront payment requests are treated as high-risk signals and advise withholding payment until independently confirmed.
4. If information is unavailable or unverified, state: "I don't have verified evidence for that."
5. Do NOT cite specific legal acts or statutes (such as AICTE Section 4.1 or penal code sections). Use neutral policy wording: "Upfront payment requests are treated as high-risk recruitment signals."
6. Provide 3 relevant follow-up questions tailored to this case.

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
            temperature: 0.1,
          },
        });

        const parsed = JSON.parse(aiResponse.text?.trim() || '{}');
        return {
          answer: parsed.answer || 'Analysis complete.',
          suggestedQuestions: Array.isArray(parsed.suggestedQuestions)
            ? parsed.suggestedQuestions.slice(0, 3)
            : [
                'What are the main red flags in this offer?',
                'Why did this offer receive this risk score?',
                'What should I independently verify next?',
              ],
        };
      } catch (err: any) {
        console.warn('Chatbot Gemini fallback triggered:', err.message);
      }
    }

    // Deterministic evidence-grounded fallback
    let fallbackAnswer = '';
    const qLower = question.toLowerCase();

    if (qLower.includes('pay') || qLower.includes('fee') || qLower.includes('money')) {
      fallbackAnswer = hasFee
        ? `⚠️ Caution: The recruiter is requesting ₹${caseRecord.extractedDetails.payment_amount.toLocaleString()} for "${caseRecord.extractedDetails.payment_reason}" via ${caseRecord.extractedDetails.payment_method}. Upfront payment requests are treated as a high-risk recruitment signal. Institutional guidelines recommend withholding all payments until the employer identity is independently confirmed with placement authorities.`
        : `No payment request was detected in this offer. However, ensure no fees are demanded at subsequent onboarding stages.`;
    } else if (qLower.includes('score') || qLower.includes('risk') || qLower.includes('why')) {
      fallbackAnswer = `Case ${caseRecord.caseNumber} scored ${caseRecord.riskScore}/100 (${caseRecord.riskLevel} Risk). Status: ${caseRecord.verificationStatus}. Score is driven by: ${caseRecord.detectedSignals.map((s) => s.name).join('; ') || 'Standard baseline indicators'}.`;
    } else if (qLower.includes('verified') || qLower.includes('company') || qLower.includes('legitimate')) {
      const compNode = caseRecord.evidenceChain.find((e) => e.step === 'CLAIMED_COMPANY');
      fallbackAnswer = compNode
        ? `Company verification status is ${compNode.status}: ${compNode.explanation}`
        : `I don't have verified evidence for that. Independent external company verification is unverified.`;
    } else if (qLower.includes('unverified') || qLower.includes('missing')) {
      fallbackAnswer = `The following information remains unverified from the submitted communication:\n${unverifiedSummary}`;
    } else {
      fallbackAnswer = `Investigation summary for Case ${caseRecord.caseNumber} (${caseRecord.extractedDetails.company_name}): Risk score is ${caseRecord.riskScore}/100 (${caseRecord.riskLevel}). Recommended action: ${caseRecord.recommendedAction}`;
    }

    return {
      answer: fallbackAnswer,
      suggestedQuestions: [
        'What evidence caused this risk score?',
        'Is the company independently verified?',
        'What should I do next?',
      ],
    };
  }
}
