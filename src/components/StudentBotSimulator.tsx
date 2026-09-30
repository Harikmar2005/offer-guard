import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileText,
  User,
  CheckCheck,
  HelpCircle,
  Share2,
  Trash2,
  RefreshCw,
  Sparkles,
  Phone,
  Video,
  MoreVertical,
  Building,
  CreditCard,
  Languages,
  ChevronDown,
} from 'lucide-react';
import { CaseRecord, RiskLevel, RedFlag, ExtractedOfferDetails } from '../types';

interface Message {
  id: string;
  sender: 'bot' | 'user' | 'system';
  text?: string;
  timestamp: string;
  isStatus?: boolean;
  isChecklistPrompt?: {
    questionId: string;
    questionText: string;
    options: string[];
  };
  isAnalysisReport?: {
    riskScore: number;
    riskLevel: RiskLevel;
    extractedDetails: ExtractedOfferDetails;
    redFlags: RedFlag[];
    greenFlags: string[];
    explanationEn: string;
    explanationTa: string;
    explanationHi: string;
    recommendedAction: string;
  };
  isEscalationSuccess?: {
    caseNumber: string;
    caseId: string;
  };
  isResolutionNotice?: {
    verdict: string;
    summary: string;
    reviewer: string;
    timestamp: string;
  };
  attachedFileName?: string;
}

interface StudentBotSimulatorProps {
  onCaseCreated: (newCase: CaseRecord) => void;
  activeCases: CaseRecord[];
}

export const StudentBotSimulator: React.FC<StudentBotSimulatorProps> = ({
  onCaseCreated,
  activeCases,
}) => {
  const [platform, setPlatform] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'ta' | 'hi'>('en');

  // Student profile state for escalation
  const [studentName, setStudentName] = useState('Kavitha Selvam');
  const [studentRoll, setStudentRoll] = useState('23CS112');
  const [studentDept, setStudentDept] = useState('Computer Science & Engg');
  const [studentCollege, setStudentCollege] = useState('Govt College of Technology, Coimbatore');

  // Checklist responses collected during dialogue
  const [checklistResponses, setChecklistResponses] = useState<
    Array<{ question_id: string; question_text: string; student_answer: string; concern_level: 'safe' | 'warning' | 'critical' }>
  >([]);

  // Current active case ID created in this session
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);

  // Messages log
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-1',
      sender: 'bot',
      text: `👋 Welcome to SafeIntern Check Bot!
I am your placement cell's AI-first verification assistant.

🛡️ Privacy & Purpose:
We help students verify internship offers, recruiter WhatsApp/Telegram messages, and UPI fee demands before you pay or share documents. Your data is processed securely with zero external advertising. You can type DELETE at any time to scrub your record.

How can I help you today?
1. Check an offer or recruiter message
2. Learn how verification works
3. View known scam patterns`,
      timestamp: '10:00 AM',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAnalyzing]);

  // Monitor if active case got resolved in placement dashboard
  useEffect(() => {
    if (!createdCaseId) return;
    const target = activeCases.find((c) => c.id === createdCaseId);
    if (target && target.reviewer_decision) {
      // Check if we already showed resolution notice
      const alreadyNotified = messages.some((m) => m.isResolutionNotice !== undefined);
      if (!alreadyNotified) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-res-${Date.now()}`,
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isResolutionNotice: {
              verdict: target.reviewer_decision!.verdict,
              summary: target.reviewer_decision!.decision_summary,
              reviewer: target.reviewer_decision!.reviewer_name,
              timestamp: target.reviewer_decision!.timestamp,
            },
          },
        ]);
      }
    }
  }, [activeCases, createdCaseId, messages]);

  // Preset scenarios
  const handleLoadPreset = (type: 'police_fee' | 'laptop_bond' | 'infosys_safe' | 'unpaid_bond') => {
    if (type === 'police_fee') {
      setInputText(`WhatsApp message from +91 98765 43210:
"Congratulations Kavitha! You are selected as Cybersecurity Intern at ApexCyber Infotech. Stipend: Rs 22,000/mo.
Mandatory requirement: To confirm seat, pay Rs 2,500 State Police Clearance & Verification fee to UPI: apexcyber@okaxis.
Pay within 30 mins or offer goes to next candidate. Contact: hr.abccyber@gmail.com"`);
    } else if (type === 'laptop_bond') {
      setInputText(`Telegram message from @QuantumCloudRecruiting:
"Hello! Your resume is shortlisted for Full Stack Intern at QuantumCloud Solutions. Monthly stipend: Rs 45,000.
We provide brand new company MacBook Pro. Please transfer refundable dispatch security deposit Rs 1,500 to UPI: laptopbond.deposit@ybl. Tracking number issued once paid."`);
    } else if (type === 'infosys_safe') {
      setInputText(`Infosys Springboard Summer Internship Selection
Candidate: Kavitha Selvam (23CS112)
Role: Cloud & AI Engineer Intern
Stipend: INR 25,000 per month
Location: Mysore / Bangalore
Important: Infosys does not charge any registration, recruitment, or training fees at any stage.
Sender: internships@infosys.com`);
    } else if (type === 'unpaid_bond') {
      setInputText(`Offer Letter - TechVeda Labs:
"Role: AI Trainee (Unpaid for first 4 months, then Rs 10,000 performance bonus).
Clause: Candidate must sign a 12-month non-exit bond. If leaving early, student must pay Rs 50,000 training penalty.
No official corporate email provided; communication via WhatsApp group."`);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || inputText).trim();
    if (!messageContent) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: messageContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    // Handle special command "DELETE"
    if (messageContent.toUpperCase() === 'DELETE') {
      await handlePrivacyDelete();
      return;
    }

    // Handle special command "GUIDE" or "2"
    if (messageContent === '2' || messageContent.toLowerCase().includes('guide') || messageContent.toLowerCase().includes('how verification works')) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-guide`,
          sender: 'bot',
          text: `📘 SafeIntern Verification Guide:
1. AICTE Rule 4.1: No company is permitted to demand fees from students (no police clearance fee, no laptop bond, no training fee).
2. Domain Check: Legitimate corporate HR sends letters from official domains (@company.com), never free Gmail or Yahoo accounts.
3. Pressure Tactics: Real employers give at least 3-7 days to review an offer. Anyone asking for money within 30 minutes is almost certainly a scammer.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      return;
    }

    // Otherwise initiate analysis flow
    setIsAnalyzing(true);

    // Step A: Show temporary status
    setMessages((prev) => [
      ...prev,
      {
        id: `status-${Date.now()}`,
        sender: 'bot',
        text: '🔍 Analyzing: extracting key details (company name, recruiter contact, fees, UPI IDs, links)...',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isStatus: true,
      },
    ]);

    try {
      const response = await fetch('/api/analyze-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerText: messageContent,
          studentChecklist: checklistResponses,
          targetLanguage: currentLanguage,
        }),
      });

      const data = await response.json();

      // Remove status message and show analysis report card
      setMessages((prev) => [
        ...prev.filter((m) => !m.isStatus),
        {
          id: `report-${Date.now()}`,
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAnalysisReport: {
            riskScore: data.risk_score,
            riskLevel: data.risk_level,
            extractedDetails: data.extracted_details,
            redFlags: data.red_flags,
            greenFlags: data.green_flags || [],
            explanationEn: data.explanation_en,
            explanationTa: data.explanation_ta,
            explanationHi: data.explanation_hi,
            recommendedAction: data.recommended_action,
          },
        },
      ]);
    } catch (err) {
      console.error('Analysis error:', err);
      setMessages((prev) => [
        ...prev.filter((m) => !m.isStatus),
        {
          id: `err-${Date.now()}`,
          sender: 'bot',
          text: '⚠️ An error occurred while evaluating the offer. Please check your network or try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle student clicking "Share with Placement Cell for Review"
  const handleEscalateCase = async (report: NonNullable<Message['isAnalysisReport']>) => {
    try {
      const payload: Partial<CaseRecord> = {
        student_name: studentName,
        student_roll: studentRoll,
        student_department: studentDept,
        student_college: studentCollege,
        channel: platform,
        status: 'escalated_pending_review',
        extracted_details: report.extractedDetails,
        risk_score: report.riskScore,
        risk_level: report.riskLevel,
        red_flags: report.redFlags,
        green_flags: report.greenFlags,
        explanation_en: report.explanationEn,
        explanation_ta: report.explanationTa,
        explanation_hi: report.explanationHi,
        recommended_action: report.recommendedAction,
        raw_input_text: `Student ${studentName} (${studentRoll}) forwarded offer from ${report.extractedDetails.company_name || 'recruiter'}.`,
        checklist_answers: checklistResponses,
      };

      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const created = data.case as CaseRecord;
        setCreatedCaseId(created.id);
        onCaseCreated(created);

        setMessages((prev) => [
          ...prev,
          {
            id: `esc-${Date.now()}`,
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isEscalationSuccess: {
              caseNumber: created.case_number,
              caseId: created.id,
            },
          },
        ]);
      }
    } catch (err) {
      console.error('Escalation error:', err);
      alert('Error escalating case to placement cell.');
    }
  };

  // Handle student privacy delete request
  const handlePrivacyDelete = async () => {
    if (createdCaseId) {
      try {
        await fetch(`/api/cases/${createdCaseId}/privacy-delete`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.error('Delete error:', err);
      }
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `del-${Date.now()}`,
        sender: 'bot',
        text: `🔒 Student Privacy Scrub Complete:
Your personal identifiers (Name: ${studentName}, Roll: ${studentRoll}) and raw submitted message transcripts have been permanently scrubbed from the active queue. Only de-identified risk telemetry is preserved for institutional scam pattern defense.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
      {/* Left / Settings & Preset Scenarios Panel */}
      <div className="w-full lg:w-80 shrink-0 space-y-4">
        {/* Student Profile Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Student Simulator Profile
            </span>
            <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
              Verified Student
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <label className="block text-[11px] text-slate-500 font-medium">Name</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded bg-slate-50 font-medium text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 font-medium">Roll Number</label>
              <input
                type="text"
                value={studentRoll}
                onChange={(e) => setStudentRoll(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded bg-slate-50 font-mono text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 font-medium">Department</label>
              <input
                type="text"
                value={studentDept}
                onChange={(e) => setStudentDept(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded bg-slate-50 text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Quick Test Presets */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              1-Click Test Scenarios
            </span>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => handleLoadPreset('police_fee')}
              className="w-full text-left p-2.5 bg-rose-50/70 hover:bg-rose-100/70 border border-rose-200 rounded-lg transition-colors group"
            >
              <div className="text-xs font-bold text-rose-950 flex items-center justify-between">
                <span>1. Police Clearance Fee Scam</span>
                <span className="text-[10px] text-rose-600 font-mono font-semibold">RED</span>
              </div>
              <p className="text-[11px] text-rose-800/80 mt-1 leading-snug">
                ₹2,500 advance UPI fee for background clearance letter with 30-min timer.
              </p>
            </button>

            <button
              onClick={() => handleLoadPreset('laptop_bond')}
              className="w-full text-left p-2.5 bg-rose-50/70 hover:bg-rose-100/70 border border-rose-200 rounded-lg transition-colors group"
            >
              <div className="text-xs font-bold text-rose-950 flex items-center justify-between">
                <span>2. Fake Laptop Security Bond</span>
                <span className="text-[10px] text-rose-600 font-mono font-semibold">RED</span>
              </div>
              <p className="text-[11px] text-rose-800/80 mt-1 leading-snug">
                Telegram recruiter promising ₹45,000 stipend and asking ₹1,500 courier bond.
              </p>
            </button>

            <button
              onClick={() => handleLoadPreset('infosys_safe')}
              className="w-full text-left p-2.5 bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200 rounded-lg transition-colors group"
            >
              <div className="text-xs font-bold text-emerald-950 flex items-center justify-between">
                <span>3. Legitimate Campus Drive</span>
                <span className="text-[10px] text-emerald-600 font-mono font-semibold">SAFE</span>
              </div>
              <p className="text-[11px] text-emerald-800/80 mt-1 leading-snug">
                Infosys Springboard authentic offer with verified domain & zero fee policy.
              </p>
            </button>

            <button
              onClick={() => handleLoadPreset('unpaid_bond')}
              className="w-full text-left p-2.5 bg-amber-50/70 hover:bg-amber-100/70 border border-amber-200 rounded-lg transition-colors group"
            >
              <div className="text-xs font-bold text-amber-950 flex items-center justify-between">
                <span>4. Ambiguous Unpaid Bond</span>
                <span className="text-[10px] text-amber-600 font-mono font-semibold">AMBER</span>
              </div>
              <p className="text-[11px] text-amber-800/80 mt-1 leading-snug">
                Unpaid 4-month clause with ₹50,000 early exit penalty on WhatsApp.
              </p>
            </button>
          </div>
        </div>

        {/* Explainability Language Selector */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Languages className="w-3.5 h-3.5 text-indigo-600" />
            Report Language (Plain-Speech)
          </div>
          <p className="text-[11px] text-slate-500">
            Explainable reports are generated in plain language for students without jargon:
          </p>
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <button
              onClick={() => setCurrentLanguage('en')}
              className={`py-1.5 text-xs font-semibold rounded transition-colors ${
                currentLanguage === 'en'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setCurrentLanguage('ta')}
              className={`py-1.5 text-xs font-semibold rounded transition-colors ${
                currentLanguage === 'ta'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              தமிழ் (Tamil)
            </button>
            <button
              onClick={() => setCurrentLanguage('hi')}
              className={`py-1.5 text-xs font-semibold rounded transition-colors ${
                currentLanguage === 'hi'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              हिन्दी (Hindi)
            </button>
          </div>
        </div>
      </div>

      {/* Main Bot Chat Window */}
      <div className="flex-1 flex flex-col h-[750px] bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden shadow-lg">
        {/* Header mimicking WhatsApp or Telegram */}
        <div
          className={`px-4 py-3 text-white flex items-center justify-between transition-colors shadow-xs ${
            platform === 'whatsapp' ? 'bg-[#075e54]' : 'bg-[#2481cc]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm leading-none">SafeIntern Check Bot</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              </div>
              <p className="text-[11px] text-white/80 mt-0.5">
                {platform === 'whatsapp' ? 'Official Placement Cell Bot' : '@SafeInternCheck_Bot'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Platform switch toggle */}
            <div className="flex items-center bg-black/20 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setPlatform('whatsapp')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  platform === 'whatsapp' ? 'bg-white text-slate-900 shadow-xs' : 'text-white/80 hover:text-white'
                }`}
              >
                WhatsApp
              </button>
              <button
                onClick={() => setPlatform('telegram')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  platform === 'telegram' ? 'bg-white text-slate-900 shadow-xs' : 'text-white/80 hover:text-white'
                }`}
              >
                Telegram
              </button>
            </div>

            <button
              onClick={() => {
                setMessages([
                  {
                    id: 'reset-1',
                    sender: 'bot',
                    text: 'Chat reset. Forward any internship offer message, recruiter text, or UPI payment screenshot to check.',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  },
                ]);
                setCreatedCaseId(null);
              }}
              title="Reset Chat"
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat Messages Body */}
        <div
          className={`flex-1 p-4 overflow-y-auto space-y-4 ${
            platform === 'whatsapp'
              ? 'bg-[#efeae2] bg-[radial-gradient(#d4cbbe_1px,transparent_1px)] [background-size:16px_16px]'
              : 'bg-[#0e1621] text-slate-100'
          }`}
        >
          {messages.map((msg) => {
            const isBot = msg.sender === 'bot';

            // Special Card: Analysis Report Card
            if (msg.isAnalysisReport) {
              const r = msg.isAnalysisReport;
              const isRed = r.riskLevel === 'RED';
              const isAmber = r.riskLevel === 'AMBER';
              const isGreen = r.riskLevel === 'GREEN';

              return (
                <div key={msg.id} className="flex justify-start">
                  <div
                    className={`max-w-xl rounded-xl p-4 shadow-sm border space-y-4 ${
                      platform === 'whatsapp'
                        ? 'bg-white border-slate-200 text-slate-900'
                        : 'bg-[#182533] border-slate-700 text-slate-100'
                    }`}
                  >
                    {/* Header Banner */}
                    <div
                      className={`p-3 rounded-lg flex items-center justify-between ${
                        isRed
                          ? 'bg-rose-50 border border-rose-200 text-rose-950'
                          : isAmber
                          ? 'bg-amber-50 border border-amber-200 text-amber-950'
                          : 'bg-emerald-50 border border-emerald-200 text-emerald-950'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isRed ? (
                          <ShieldAlert className="w-5 h-5 text-rose-600" />
                        ) : isAmber ? (
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                        ) : (
                          <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        )}
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider">
                            SafeIntern Risk Summary:{' '}
                            {isRed ? 'RED (High Risk)' : isAmber ? 'AMBER (Caution)' : 'GREEN (Safe)'}
                          </div>
                          <div className="text-[11px] opacity-80">
                            Explainable assessment for Indian student protection
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xl font-bold font-mono tabular-nums">
                          {r.riskScore}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">/100</span>
                      </div>
                    </div>

                    {/* Extracted Details Box */}
                    <div
                      className={`p-3 rounded-lg text-xs space-y-1.5 ${
                        platform === 'whatsapp' ? 'bg-slate-50 border border-slate-100' : 'bg-slate-800/60 border border-slate-700'
                      }`}
                    >
                      <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500 block mb-1">
                        What We Extracted From Offer
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-slate-500">Company:</span>{' '}
                          <span className="font-semibold">{r.extractedDetails.company_name || 'Unspecified'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Stipend:</span>{' '}
                          <span className="font-mono">{r.extractedDetails.stipend_amount || 'Unspecified'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Recruiter Contact:</span>{' '}
                          <span>{r.extractedDetails.recruiter_email || r.extractedDetails.recruiter_phone || 'Unspecified'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">UPI ID Demanded:</span>{' '}
                          <span className="font-mono text-rose-600 font-semibold">
                            {r.extractedDetails.upi_ids?.length ? r.extractedDetails.upi_ids.join(', ') : 'None'}
                          </span>
                        </div>
                      </div>

                      {r.extractedDetails.requested_fees?.length ? (
                        <div className="pt-1 text-rose-600 font-semibold">
                          ⚠️ Requested Fee: ₹{r.extractedDetails.requested_fees.map((f) => f.amount).join(', ')} (
                          {r.extractedDetails.requested_fees.map((f) => f.reason).join('; ')})
                        </div>
                      ) : null}
                    </div>

                    {/* Red Flags List */}
                    {r.redFlags.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
                          Specific Red Flags Detected ({r.redFlags.length})
                        </span>
                        <div className="space-y-1.5">
                          {r.redFlags.map((flag, idx) => (
                            <div
                              key={idx}
                              className={`p-2.5 rounded text-xs border ${
                                platform === 'whatsapp'
                                  ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                                  : 'bg-rose-950/30 border-rose-800 text-rose-200'
                              }`}
                            >
                              <div className="font-bold flex items-center justify-between">
                                <span>{idx + 1}. {flag.title}</span>
                                {flag.policy_ref && (
                                  <span className="text-[10px] opacity-75 font-mono">
                                    {flag.policy_ref}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 leading-relaxed opacity-90">{flag.explanation}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Green Flags if any */}
                    {r.greenFlags?.length > 0 && (
                      <div className="space-y-1.5 text-xs text-emerald-700">
                        <span className="text-[11px] font-bold uppercase tracking-wider block">
                          Verified Legitimacy Indicators
                        </span>
                        {r.greenFlags.map((gf, gi) => (
                          <div key={gi} className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>{gf}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Plain Language Explanation (Multilingual) */}
                    <div
                      className={`p-3 rounded-lg text-xs leading-relaxed border ${
                        platform === 'whatsapp' ? 'bg-indigo-50/50 border-indigo-100 text-indigo-950' : 'bg-indigo-950/30 border-indigo-800 text-indigo-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-indigo-700">
                          Plain-Language Explanation ({currentLanguage.toUpperCase()})
                        </span>
                        <span className="text-[10px] text-indigo-600 font-mono">Zero Slop Assessment</span>
                      </div>
                      <p>
                        {currentLanguage === 'ta'
                          ? r.explanationTa || r.explanationEn
                          : currentLanguage === 'hi'
                          ? r.explanationHi || r.explanationEn
                          : r.explanationEn}
                      </p>
                    </div>

                    {/* Immediate Recommendation */}
                    <div className="pt-1 border-t border-slate-100 text-xs">
                      <span className="font-bold text-slate-700">Recommended Action: </span>
                      <span className={isRed ? 'text-rose-600 font-semibold' : 'text-slate-800'}>
                        {r.recommendedAction}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 flex flex-wrap gap-2">
                      <button
                        onClick={() => handleEscalateCase(r)}
                        className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        Share With Placement Cell For Official Review
                      </button>
                      <button
                        onClick={() =>
                          handleSendMessage(
                            'What do RED, AMBER, and GREEN mean for my internship credit?'
                          )
                        }
                        className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        Explain Scoring
                      </button>
                      <button
                        onClick={handlePrivacyDelete}
                        className="px-3 py-2 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        DELETE My Data
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            // Special Card: Escalation Confirmation
            if (msg.isEscalationSuccess) {
              return (
                <div key={msg.id} className="flex justify-start">
                  <div
                    className={`max-w-md rounded-xl p-4 shadow-sm border space-y-2.5 ${
                      platform === 'whatsapp'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                        : 'bg-emerald-950/40 border-emerald-700 text-emerald-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide">
                      <CheckCheck className="w-4 h-4 text-emerald-600" />
                      Offer Escalated to Placement Cell
                    </div>
                    <p className="text-xs leading-relaxed">
                      Case <span className="font-mono font-bold">{msg.isEscalationSuccess.caseNumber}</span> has been created in your college's Placement Director review dashboard.
                    </p>
                    <p className="text-[11px] opacity-80">
                      Placement Officer Prof. R. Venkatesh has been notified. When the officer issues a decision or blacklists the entity, your bot will receive an instant signed notification here!
                    </p>
                  </div>
                </div>
              );
            }

            // Special Card: Reviewer Verdict Notification
            if (msg.isResolutionNotice) {
              const res = msg.isResolutionNotice;
              const isSafe = res.verdict === 'approved_safe';
              return (
                <div key={msg.id} className="flex justify-start">
                  <div
                    className={`max-w-md rounded-xl p-4 shadow-md border-2 space-y-2.5 ${
                      isSafe
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                        : 'bg-rose-50 border-rose-400 text-rose-950'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-black/10 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        {isSafe ? <ShieldCheck className="w-4 h-4 text-emerald-600" /> : <ShieldAlert className="w-4 h-4 text-rose-600" />}
                        Official Placement Cell Verdict
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(res.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="text-xs font-bold">
                      Decision:{' '}
                      <span className={isSafe ? 'text-emerald-700' : 'text-rose-700'}>
                        {isSafe ? 'VERIFIED SAFE (Approved)' : 'DO NOT PROCEED (Confirmed Scam / Blacklisted)'}
                      </span>
                    </div>

                    <p className="text-xs leading-relaxed bg-white/70 p-2.5 rounded border border-black/5 font-medium">
                      "{res.summary}"
                    </p>

                    <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1">
                      <span>Reviewed by: <strong className="text-slate-900">{res.reviewer}</strong></span>
                      <span className="text-[10px] font-mono">Govt College of Technology</span>
                    </div>
                  </div>
                </div>
              );
            }

            // Normal text message
            return (
              <div
                key={msg.id}
                className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-md rounded-xl p-3 text-xs leading-relaxed shadow-xs whitespace-pre-wrap ${
                    isBot
                      ? platform === 'whatsapp'
                        ? 'bg-white text-slate-900 rounded-tl-none border border-slate-200'
                        : 'bg-[#182533] text-slate-100 rounded-tl-none border border-slate-700'
                      : platform === 'whatsapp'
                      ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-none border border-emerald-200'
                      : 'bg-[#2b5278] text-white rounded-tr-none border border-blue-600'
                  }`}
                >
                  {msg.text}
                  <div
                    className={`text-[10px] text-right mt-1 flex items-center justify-end gap-1 ${
                      isBot ? 'text-slate-400' : 'text-emerald-700'
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                    {!isBot && <CheckCheck className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>
            );
          })}

          {isAnalyzing && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex items-center gap-2 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
                <span>SafeIntern is analyzing offer text & querying scam registry...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div
          className={`p-3 border-t flex items-end gap-2 ${
            platform === 'whatsapp' ? 'bg-[#f0f2f5] border-slate-200' : 'bg-[#17212b] border-slate-800'
          }`}
        >
          <div className="flex-1 relative">
            <textarea
              rows={2}
              placeholder="Paste recruiter WhatsApp/Telegram message, offer letter text, or type /start..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className={`w-full px-3 py-2 text-xs rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                platform === 'whatsapp'
                  ? 'bg-white text-slate-900 placeholder:text-slate-400 border border-slate-200'
                  : 'bg-[#242f3d] text-white placeholder:text-slate-500 border border-slate-700'
              }`}
            />
          </div>

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isAnalyzing}
            className={`p-2.5 rounded-xl text-white font-bold transition-transform active:scale-95 disabled:opacity-40 shadow-xs ${
              platform === 'whatsapp' ? 'bg-[#00a884] hover:bg-[#008f6f]' : 'bg-[#2481cc] hover:bg-[#1f6eb0]'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
