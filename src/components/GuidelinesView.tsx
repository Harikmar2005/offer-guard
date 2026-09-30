import React from 'react';
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  FileCheck,
  ShieldAlert,
  ShieldCheck,
  Scale,
} from 'lucide-react';

export const GuidelinesView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600" />
          Institutional Internship Verification Guidelines & AICTE Norms
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Standardized verification rules aligned with AICTE Internship Policy Section 3.2, UGC directives, and Campus Cyber Vigilance Protocol. Both students and placement reviewers must adhere to these benchmarks.
        </p>
      </div>

      {/* Comparison Grid: Red Flags vs Green Flags */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Prohibited Practices (Red Flags) */}
        <div className="bg-white p-5 rounded-xl border border-rose-200 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-rose-100">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <h4 className="text-sm font-bold text-rose-950 uppercase tracking-wide">
              Strictly Prohibited Practices (Red Flags)
            </h4>
          </div>

          <div className="space-y-3 text-xs text-rose-900">
            <div className="p-3 bg-rose-50/60 rounded-lg space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-rose-950">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                1. Any Advance Fee Demand (Zero-Tolerance)
              </span>
              <p className="text-slate-600 leading-relaxed pl-5">
                Demanding fees for "police clearance certificates", "laptop security deposits", "training fees", or "registration fees" is strictly illegal. AICTE regulations state that students shall not be charged any fees for internships.
              </p>
            </div>

            <div className="p-3 bg-rose-50/60 rounded-lg space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-rose-950">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                2. Unofficial / Personal Email Domains
              </span>
              <p className="text-slate-600 leading-relaxed pl-5">
                Recruiters using Gmail, Yahoo, Hotmail, or ProtonMail for corporate appointments. Genuine corporate recruiters write from their official registered domain (e.g. name@tcs.com, hr@infosys.com).
              </p>
            </div>

            <div className="p-3 bg-rose-50/60 rounded-lg space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-rose-950">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                3. Artificial Urgency & Coercive Deadlines
              </span>
              <p className="text-slate-600 leading-relaxed pl-5">
                Phrases such as "Pay within 30 minutes or your offer expires" or "Transfer immediately to lock seat". Legitimate companies give at least 3 to 7 working days to evaluate written offer letters.
              </p>
            </div>

            <div className="p-3 bg-rose-50/60 rounded-lg space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-rose-950">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                4. Unsolicited High Stipends Without Technical Assessment
              </span>
              <p className="text-slate-600 leading-relaxed pl-5">
                Offers promising ₹40,000+ monthly for pre-final year students without video interviews or coding evaluation tests.
              </p>
            </div>
          </div>
        </div>

        {/* Verified Safe Indicators (Green Flags) */}
        <div className="bg-white p-5 rounded-xl border border-emerald-200 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-emerald-100">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h4 className="text-sm font-bold text-emerald-950 uppercase tracking-wide">
              Verified Legitimacy Standards (Green Flags)
            </h4>
          </div>

          <div className="space-y-3 text-xs text-emerald-900">
            <div className="p-3 bg-emerald-50/60 rounded-lg space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-emerald-950">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                1. Institutional MoU or On-Campus Drive
              </span>
              <p className="text-slate-600 leading-relaxed pl-5">
                The employer is listed on the college placement portal or recruited via formal on-campus/virtual placement drives facilitated by the Training & Placement Officer.
              </p>
            </div>

            <div className="p-3 bg-emerald-50/60 rounded-lg space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-emerald-950">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                2. Authenticated Enterprise Email & Domain
              </span>
              <p className="text-slate-600 leading-relaxed pl-5">
                All communications and offer documentation originate from verified corporate domain matching the company's official corporate registrar records (Ministry of Corporate Affairs / MCA).
              </p>
            </div>

            <div className="p-3 bg-emerald-50/60 rounded-lg space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-emerald-950">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                3. Clear Job Description & Mentor Allocation
              </span>
              <p className="text-slate-600 leading-relaxed pl-5">
                Detailed scope of work, designated company mentor, clear working hours, and formal Non-Disclosure / IPR terms without punitive financial penalty clauses.
              </p>
            </div>

            <div className="p-3 bg-emerald-50/60 rounded-lg space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-emerald-950">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                4. Formal Corporate Equipment Policy
              </span>
              <p className="text-slate-600 leading-relaxed pl-5">
                If laptops or equipment are provided, they are shipped directly at company expense with official asset tags, never requesting courier bonds or UPI deposits from candidates.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* College Placement Cell Escalation Protocol */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Scale className="w-4 h-4 text-indigo-600" />
          Standard Escalation & Redressal Protocol
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs text-slate-700">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <span className="font-mono text-indigo-600 font-bold">Step 1</span>
            <p className="font-bold text-slate-900">Forward to Bot</p>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Student forwards offer text, screenshot, or PDF to the SafeIntern WhatsApp / Telegram bot.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <span className="font-mono text-indigo-600 font-bold">Step 2</span>
            <p className="font-bold text-slate-900">Instant AI Triage</p>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Bot extracts details, runs scam database checks, and produces an explainable report card.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <span className="font-mono text-indigo-600 font-bold">Step 3</span>
            <p className="font-bold text-slate-900">Placement Review</p>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Ambiguous or RED cases are escalated to the web dashboard for faculty checklist verification.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <span className="font-mono text-indigo-600 font-bold">Step 4</span>
            <p className="font-bold text-slate-900">Resolution & Registry</p>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Reviewer issues verdict; student is notified in chat; new scam entities are added to the central registry.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
