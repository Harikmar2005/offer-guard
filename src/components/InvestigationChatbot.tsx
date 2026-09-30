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
  Loader2,
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
        ? `Hello! I am ready to answer your questions regarding Case ${currentCase.caseNumber} (${currentCase.extractedDetails.company_name}). I am connected directly to Gemini AI and grounded strictly in verified evidence, DNS records, and AICTE legal policies.`
        : `Welcome to OfferGuard Q&A Assistant. Please select or submit an investigation to ask questions like:
- "Why is this risk level high?"
- "What specific red flags were detected?"
- "Should I pay this registration fee?"
- "What should I independently verify next?"`,
      timestamp: 'Just now',
      suggestedQuestions: currentCase
        ? [
            'What are the main red flags in this offer?',
            'Why did this get this risk score?',
            'Should I pay the requested fee?',
            'How can I independently contact this employer?',
          ]
        : undefined,
    },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const handleSend = async (textToSend?: string) => {
    const q = (textToSend || input).trim();
    if (!q || isThinking) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    try {
      const res = await fetch('/api/chatbot/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          caseId: currentCase?.id,
        }),
      });

      if (!res.ok) {
        throw new Error('Chatbot service unavailable');
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'assistant',
          text: data.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedQuestions: data.suggestedQuestions,
        },
      ]);
    } catch {
      // Grounded fallback if network or API error occurs
      let responseText = '';
      if (!currentCase) {
        responseText =
          'Please select or submit an offer from the Verify or Cases tab first. I will then explain the specific evidence nodes and signals identified.';
      } else if (currentCase.extractedDetails.payment_requested) {
        responseText = `🛑 DO NOT PAY ANY MONEY.\nThe recruiter is demanding ₹${currentCase.extractedDetails.payment_amount.toLocaleString()} for "${currentCase.extractedDetails.payment_reason}" via ${currentCase.extractedDetails.payment_method}.\nAICTE Rule 4.1 and university placement policies strictly forbid requiring candidates to pay for internships.`;
      } else {
        responseText = `Case ${currentCase.caseNumber} Overview:\n- Employer: ${currentCase.extractedDetails.company_name}\n- Role: ${currentCase.extractedDetails.job_title}\n- Risk Score: ${currentCase.riskScore}/100 (${currentCase.riskLevel})\n- Recommendation: ${currentCase.recommendedAction}`;
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
    } finally {
      setIsThinking(false);
    }
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
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-900">
                Investigation Q&A Assistant
              </h4>
              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                Gemini 3.8 Flash
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {currentCase
                ? `Explaining Case ${currentCase.caseNumber} (${currentCase.extractedDetails.company_name})`
                : 'Select an investigation to begin case-specific inquiry'}
            </p>
          </div>
        </div>

        {currentCase && (
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                currentCase.riskLevel === 'CRITICAL'
                  ? 'bg-rose-100 text-rose-800'
                  : currentCase.riskLevel === 'HIGH'
                  ? 'bg-orange-100 text-orange-800'
                  : currentCase.riskLevel === 'MEDIUM'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              Risk: {currentCase.riskScore}/100 ({currentCase.riskLevel})
            </span>
          </div>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs font-sans">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-xs ${
                m.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-xs'
                  : 'bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200/60 leading-relaxed whitespace-pre-wrap'
              }`}
            >
              {m.text}

              {/* Suggested Questions */}
              {m.suggestedQuestions && m.suggestedQuestions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Suggested Questions:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {m.suggestedQuestions.map((sq, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSend(sq)}
                        className="text-[11px] text-left bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg transition-colors font-medium"
                      >
                        {sq}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 px-1">
              {m.timestamp}
            </span>
          </div>
        ))}

        {isThinking && (
          <div className="flex items-center gap-2 text-slate-500 text-xs p-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Analyzing investigation evidence with Gemini AI...</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="p-3.5 bg-slate-50 border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            disabled={isThinking}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              currentCase
                ? `Ask anything about ${currentCase.extractedDetails.company_name} (e.g. "Should I pay the ₹${currentCase.extractedDetails.payment_amount || 2000} fee?", "Why is this 78% risk?")`
                : 'Select an offer to ask grounded questions...'
            }
            className="flex-1 bg-white border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
          />
          <button
            type="submit"
            disabled={!input.trim() || isThinking}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            {isThinking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Ask</span>
          </button>
        </form>
      </div>
    </div>
  );
};
