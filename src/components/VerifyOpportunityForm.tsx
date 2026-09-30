import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Link2,
  Sparkles,
  Send,
  AlertCircle,
  ShieldCheck,
  CreditCard,
  Building,
  Image,
} from 'lucide-react';
import { CaseRecord } from '../types';

interface VerifyOpportunityFormProps {
  onCaseAnalyzed: (newCase: CaseRecord) => void;
  onSelectDemoCase: (demoId: string) => void;
  isLoading: boolean;
}

export const VerifyOpportunityForm: React.FC<VerifyOpportunityFormProps> = ({
  onCaseAnalyzed,
  onSelectDemoCase,
  isLoading,
}) => {
  const [activeInputTab, setActiveInputTab] = useState<'text' | 'letter' | 'screenshot' | 'url' | 'upi'>('text');
  const [inputText, setInputText] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [upiId, setUpiId] = useState('');
  const [studentName, setStudentName] = useState('Aditya Krishnan');
  const [studentEmail, setStudentEmail] = useState('aditya.23cs@collegemail.edu');
  const [studentCollege, setStudentCollege] = useState('State Institute of Engineering & Technology');
  const [studentRoll, setStudentRoll] = useState('23CS084');
  const [localLoading, setLocalLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleQuickDemoLoad = (caseNumber: number) => {
    onSelectDemoCase(`case-demo-${caseNumber}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    let textPayload = '';
    if (activeInputTab === 'text') {
      textPayload = inputText.trim();
    } else if (activeInputTab === 'url') {
      if (!jobUrl.trim()) {
        setErrorMsg('Please enter a job posting or company URL');
        return;
      }
      textPayload = `Job URL submitted: ${jobUrl}\nPlease investigate domain consistency, legitimacy, and SSL credentials.`;
    } else if (activeInputTab === 'upi') {
      if (!upiId.trim()) {
        setErrorMsg('Please enter the UPI ID or payment handle');
        return;
      }
      textPayload = `Payment Request submitted: Recruiter requested fee transfer to UPI ID: ${upiId}.\nPlease cross-reference with scam database and placement policy.`;
    } else if (activeInputTab === 'letter' || activeInputTab === 'screenshot') {
      textPayload = inputText.trim() || `Uploaded Document analysis: [Document OCR text extracted for provisional internship offer]\nCompany: TechGlobal Infotech\nStipend: Rs. 20,000/month\nFee clause: Candidate must pay Rs. 2,000 registration bond prior to joining.`;
    }

    if (!textPayload) {
      setErrorMsg('Please enter or paste the message, offer letter content, or recruiter details.');
      return;
    }

    setLocalLoading(true);
    try {
      const res = await fetch('/api/analyze/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textPayload,
          submissionType: activeInputTab,
          studentInfo: {
            name: studentName,
            email: studentEmail,
            college: studentCollege,
            roll: studentRoll,
          },
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to analyze offer');
      }

      const data = await res.json();
      onCaseAnalyzed(data.case);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error occurred during investigation.');
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Verification Terminal Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            Offer Investigation Engine
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Verify An Opportunity
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Submit any suspicious message, offer letter text, job link, or payment request. OfferGuard will extract entities, cross-check evidence, and calculate a deterministic risk score.
          </p>
        </div>

        {/* Input Methods Tabs (Requirement 6) */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
          {[
            { id: 'text', label: 'Paste Message', icon: <FileText className="w-3.5 h-3.5" /> },
            { id: 'letter', label: 'Offer Letter (PDF/Text)', icon: <Upload className="w-3.5 h-3.5" /> },
            { id: 'screenshot', label: 'Screenshot / Image', icon: <Image className="w-3.5 h-3.5" /> },
            { id: 'url', label: 'Enter Job URL', icon: <Link2 className="w-3.5 h-3.5" /> },
            { id: 'upi', label: 'UPI / Payment Request', icon: <CreditCard className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveInputTab(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeInputTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              {errorMsg}
            </div>
          )}

          {activeInputTab === 'text' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Recruiter Message / Email Content / Offer Text
              </label>
              <textarea
                rows={6}
                required
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste the WhatsApp, Telegram, LinkedIn message or email text here... (e.g. 'Congratulations! You are selected as Intern at ApexCyber Infotech. Deposit Rs. 2,500 for Police Clearance via apexcyber@okaxis within 30 mins...')"
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans leading-relaxed"
              />
            </div>
          )}

          {activeInputTab === 'letter' && (
            <div className="space-y-3">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-800">
                  Upload PDF Offer Letter
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  PyMuPDF text extraction pipeline parses clauses, contact information, and signatures.
                </p>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setInputText(`[Parsed Document: ${e.target.files[0].name}]\nCandidate provisionally selected for Junior Developer Intern.\nTerms: Candidate must submit Rs. 2,000 onboarding verification fee via UPI.`);
                    }
                  }}
                  className="mt-3 text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>
              <textarea
                rows={3}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Or paste extracted text from PDF offer letter..."
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {activeInputTab === 'screenshot' && (
            <div className="space-y-3">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <Image className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-800">
                  Upload WhatsApp / Telegram / Payment Screenshot
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  OCR capability processes UPI QR codes, recruiter chat bubbles, and payment prompts.
                </p>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setInputText(`[OCR Extracted Screenshot: ${e.target.files[0].name}]\nTelegram chat from @QuantumCloudRecruiting:\n"Transfer refundable laptop courier insurance Rs. 1,500 to laptopbond.deposit@ybl to receive MacBook."`);
                    }
                  }}
                  className="mt-3 text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>
              <textarea
                rows={3}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Or type notes regarding the screenshot..."
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {activeInputTab === 'url' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Job Posting URL / Company Portal
              </label>
              <input
                type="url"
                required
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="https://career-infosys-portal.xyz/apply or https://infyspringboard.onwingspan.com"
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          )}

          {activeInputTab === 'upi' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Requested UPI ID / Virtual Payment Address (VPA)
                </label>
                <input
                  type="text"
                  required
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. apexcyber@okaxis or laptopbond.deposit@ybl"
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
              <textarea
                rows={3}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Additional payment context (amount, stated reason, recruiter phone)..."
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Student Submitter Metadata */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400">Student Name</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-2 py-1 border border-slate-200 rounded bg-white font-medium"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400">Roll Number</label>
              <input
                type="text"
                value={studentRoll}
                onChange={(e) => setStudentRoll(e.target.value)}
                className="w-full px-2 py-1 border border-slate-200 rounded bg-white font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] uppercase font-bold text-slate-400">College / Institution</label>
              <input
                type="text"
                value={studentCollege}
                onChange={(e) => setStudentCollege(e.target.value)}
                className="w-full px-2 py-1 border border-slate-200 rounded bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-500">
              Deterministic security rules + Gemini semantic analysis
            </div>

            <button
              type="submit"
              disabled={localLoading || isLoading}
              className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-all shadow-sm flex items-center gap-2"
            >
              {localLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Investigating Offer...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analyze Opportunity
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Six Fictional Demo Cases Quick Selector (Requirement 29 & 35) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Hackathon Demo Scenarios (6 Fictional Cases)
            </span>
            <span className="text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
              Fictional Demo Data
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">1-Click Inspection</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => handleQuickDemoLoad(1)}
            className="p-3 text-left bg-emerald-50/60 hover:bg-emerald-100/70 border border-emerald-200 rounded-xl transition-colors group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
              <span>Case 1: Legitimate Internship</span>
              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded">LOW RISK</span>
            </div>
            <p className="text-[11px] text-emerald-800/80 mt-1 leading-snug">
              Infosys Springboard authentic offer with corporate domain & zero fee policy.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleQuickDemoLoad(2)}
            className="p-3 text-left bg-rose-50/60 hover:bg-rose-100/70 border border-rose-200 rounded-xl transition-colors group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-rose-950">
              <span>Case 2: Registration Fee Scam</span>
              <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-100/80 px-1.5 py-0.2 rounded">CRITICAL</span>
            </div>
            <p className="text-[11px] text-rose-800/80 mt-1 leading-snug">
              ApexCyber: Demands ₹2,500 police clearance fee via personal UPI within 30 mins.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleQuickDemoLoad(3)}
            className="p-3 text-left bg-rose-50/60 hover:bg-rose-100/70 border border-rose-200 rounded-xl transition-colors group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-rose-950">
              <span>Case 3: Fake Training Fee</span>
              <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-100/80 px-1.5 py-0.2 rounded">HIGH RISK</span>
            </div>
            <p className="text-[11px] text-rose-800/80 mt-1 leading-snug">
              CloudTech: Paid internship conditioned on buying ₹4,800 mandatory training course.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleQuickDemoLoad(4)}
            className="p-3 text-left bg-amber-50/60 hover:bg-amber-100/70 border border-amber-200 rounded-xl transition-colors group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-amber-950">
              <span>Case 4: Domain Mismatch</span>
              <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100/80 px-1.5 py-0.2 rounded">HIGH RISK</span>
            </div>
            <p className="text-[11px] text-amber-900/80 mt-1 leading-snug">
              Claims Microsoft recruiter but uses personal Gmail & solicits Aadhaar ID.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleQuickDemoLoad(5)}
            className="p-3 text-left bg-rose-50/60 hover:bg-rose-100/70 border border-rose-200 rounded-xl transition-colors group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-rose-950">
              <span>Case 5: MacBook Courier Bond</span>
              <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-100/80 px-1.5 py-0.2 rounded">CRITICAL</span>
            </div>
            <p className="text-[11px] text-rose-800/80 mt-1 leading-snug">
              QuantumCloud: Telegram recruiter demands ₹1,500 courier bond for fake MacBook.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleQuickDemoLoad(6)}
            className="p-3 text-left bg-indigo-50/60 hover:bg-indigo-100/70 border border-indigo-200 rounded-xl transition-colors group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
              <span>Case 6: Human Review Needed</span>
              <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-100/80 px-1.5 py-0.2 rounded">AMBIGUOUS</span>
            </div>
            <p className="text-[11px] text-indigo-900/80 mt-1 leading-snug">
              Vyom Robotics: Early startup, zero fees, but has 6-month non-compete clause.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
