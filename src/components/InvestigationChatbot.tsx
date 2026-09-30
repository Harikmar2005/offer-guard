import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  HelpCircle,
  Building,
  CreditCard,
  CheckCircle,
} from 'lucide-react';
import { CaseRecord } from '../types';

interface InvestigationChatbotProps {
  currentCase: CaseRecord | null;
  onSelectCase: (caseRecord: CaseRecord) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedQuestions?: string[];
}

export const InvestigationChatbot: React.FC<InvestigationChatbotProps> = ({
  currentCase,
  onSelectCase,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-init',
      sender: 'assistant',
      text: currentCase
        ? `Hello! I am ready to answer your questions regarding Case ${currentCase.caseNumber} (${currentCase.extractedDetails.company_name}). I use strictly verified evidence and structured signals from our investigation engine.`
        : `Welcome to OfferGuard Q&A Assistant. Please select or submit an investigation to ask questions like:
- "Why is this risk level high?"
- "What specific red flags were detected?"
- "Should I pay this registration fee?"
- "What should I independently verify next?"`,
      timestamp: 'Just now',
      suggestedQuestions: currentCase
        ? [
            'What are the main red flags in this offer?',
            'Why did this get a high risk score?',
            'Should I pay the requested fee?',
            'How can I independently contact this employer?',
          ]
        : undefined,
    },
  ]);
  const [input, setInput] = useState('');

  const handleSend = (textToSend?: string) => {
    const q = (textToSend || input).trim();
    if (!q) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // Answer grounded in currentCase structured evidence (Requirement 19: Do NOT let chatbot invent evidence)
    setTimeout(() => {
      let responseText = '';
      const lower = q.toLowerCase();

      if (!currentCase) {
        responseText = 'Please select or submit an offer from the Verify or Cases tab first. I will then explain the specific evidence nodes and signals identified.';
      } else if (lower.includes('pay') || lower.includes('fee') || lower.includes('money')) {
        if (currentCase.extractedDetails.payment_requested) {
          responseText = `🛑 DO NOT PAY ANY MONEY.
The recruiter is demanding ₹${currentCase.extractedDetails.payment_amount.toLocaleString()} for "${currentCase.extractedDetails.payment_reason}" via ${currentCase.extractedDetails.payment_method}.
AICTE Rule 4.1 and university placement policies strictly forbid requiring candidates to pay for internships or police clearance.`;
        } else {
          responseText = `✅ No advance fee or payment demands were detected in this offer.
However, continue to ensure you do not share banking credentials or one-time passwords (OTPs).`;
        }
      } else if (lower.includes('red flag') || lower.includes('flags') || lower.includes('signals')) {
        if (currentCase.detectedSignals.length > 0) {
          responseText = `Identified Red Flags for Case ${currentCase.caseNumber}:
${currentCase.detectedSignals.map((s, i) => `${i + 1}. ${s.name} (+${s.impact} risk pts)\n   Evidence: ${s.evidence}`).join('\n\n')}`;
        } else {
          responseText = `No security red flags were detected for ${currentCase.extractedDetails.company_name}. Communications originate from official domain ${currentCase.extractedDetails.email_domain}.`;
        }
      } else if (lower.includes('why') || lower.includes('score') || lower.includes('risk')) {
        responseText = `Risk Score Breakdown for ${currentCase.extractedDetails.company_name}:
- Deterministic Score: ${currentCase.riskScore}/100 (${currentCase.riskLevel})
- Verification Status: ${currentCase.verificationStatus}
- Key Reasoning: ${currentCase.reasoning}`;
      } else if (lower.includes('verify') || lower.includes('what should i do') || lower.includes('next')) {
        responseText = `Recommended Next Steps:
1. ${currentCase.recommendedAction}
2. Unverified Items to confirm independently:
${currentCase.unverifiedInfo.map((u) => `   • ${u}`).join('\n')}
3. Contact your campus placement coordinator for guidance.`;
      } else {
        responseText = `Case ${currentCase.caseNumber} Overview:
- Employer: ${currentCase.extractedDetails.company_name}
- Role: ${currentCase.extractedDetails.job_title}
- Risk Level: ${currentCase.riskLevel} (${currentCase.riskScore}/100)
- Summary: ${currentCase.summary}
- Recommendation: ${currentCase.recommendedAction}`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'assistant',
          text: responseText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 400);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col h-[650px]">
      {/* Header */}
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">
              Investigation Q&A Assistant
            </h4>
            <p className="text-[11px] text-slate-500">
              {currentCase
                ? `Explaining Case ${currentCase.caseNumber} (${currentCase.extractedDetails.company_name})`
                : 'Select an active case to ask grounded questions'}
            </p>
          </div>
        </div>

        {currentCase && (
          <span className="text-[11px] font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
            Risk: {currentCase.riskLevel} ({currentCase.riskScore})
          </span>
        )}
      </div>

      {/* Messages Viewport */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-lg p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-xs'
              }`}
            >
              {msg.text}

              {msg.suggestedQuestions && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Suggested Questions
                  </span>
                  <div className="flex flex-col gap-1">
                    {msg.suggestedQuestions.map((q, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSend(q)}
                        className="text-left text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        → {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div
                className={`text-[9px] text-right mt-1.5 font-mono ${
                  msg.sender === 'user' ? 'text-indigo-200' : 'text-slate-400'
                }`}
              >
                {msg.timestamp}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
          placeholder={
            currentCase
              ? `Ask about ${currentCase.extractedDetails.company_name} (e.g. "What are the red flags?")`
              : 'Ask a question about offer verification...'
          }
          className="flex-1 px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim()}
          className="p-2.5 text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors shadow-xs"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
