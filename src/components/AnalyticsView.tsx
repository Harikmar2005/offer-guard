import React, { useState } from 'react';
import {
  TrendingUp,
  ShieldCheck,
  AlertOctagon,
  IndianRupee,
  Users,
  Clock,
  Download,
  FileSpreadsheet,
  Share2,
  Copy,
  Check,
  BookOpen,
  Lock,
} from 'lucide-react';
import { AnalyticsMetrics, CaseRecord } from '../types';

interface AnalyticsViewProps {
  metrics: AnalyticsMetrics;
  cases: CaseRecord[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ metrics, cases }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Anonymized scam case studies for college orientation and student training
  const awarenessCaseStudies = [
    {
      title: 'Case Study 1: The "Police Clearance Certificate" Fee Scam',
      target: 'Final Year CSE / IT Students (Mandatory 6-Month Internship)',
      modusOperandi:
        'Scammers send professional-looking provisional appointment letters offering ₹20,000/month. Before issuing joining date credentials, recruiter instructs student to deposit ₹2,500 via personal UPI for "government police verification". Recruiter claims fee will be reimbursed on day one.',
      redFlags: [
        'Mandatory advance fee payment via UPI',
        'Personal Gmail address (hr.abccyber@gmail.com) used for corporate correspondence',
        'High-pressure deadline ("Pay within 30 minutes or slot will be cancelled")',
      ],
      institutionalAction:
        'SafeIntern bot intercepted 14 attempts. UPI ID blacklisted; warning broadcast sent to all final-year students.',
    },
    {
      title: 'Case Study 2: The "MacBook Courier Insurance Deposit" Scam',
      target: 'Pre-final Year ECE / Mech / BCA Students via Telegram',
      modusOperandi:
        'Recruiter reaches out on Telegram offering ₹45,000/month for an entry-level remote internship without an interview. Demands ₹1,500 "laptop dispatch insurance bond" via UPI before courier tracking number is generated.',
      redFlags: [
        'Outrageously high stipend with zero technical assessment',
        'Requesting money for employer equipment delivery',
        'All communications conducted exclusively on Telegram with deleted message timers',
      ],
      institutionalAction:
        'Entity blacklisted in institutional database. Telegram handle reported to cyber cell.',
    },
    {
      title: 'Case Study 3: Typosquatted Campus Portal Lookalike',
      target: 'Mass Hiring Applicants via WhatsApp Groups',
      modusOperandi:
        'SMS/WhatsApp links leading to fake portal "career-infosys-portal.xyz" designed to mimic genuine university recruitments. Collects Aadhaar numbers, PAN cards, and ₹500 "test registration fee".',
      redFlags: [
        '.xyz top-level domain instead of authentic enterprise .com',
        'Collection of national identity documents without privacy consent',
        'Legitimate IT services firms never charge registration fees for campus drives',
      ],
      institutionalAction:
        'URL added to campus DNS blocklist; domain reported to CERT-In registrar.',
    },
  ];

  const handleCopyCaseStudy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleExportAwarenessDeck = () => {
    const markdownContent = `# SafeIntern Institutional Awareness Repository — 2026 Edition
Prepared by: University Placement Cell & Campus Cyber Vigilance Team

## Overview
SafeIntern has screened ${metrics.totalChecks} internship offers, intercepting ${metrics.highRiskIntercepted} high-risk fraudulent offers and protecting an estimated ₹${metrics.totalMoneyProtectedInr.toLocaleString()} in student savings.

---

${awarenessCaseStudies
  .map(
    (cs, i) => `### ${cs.title}
- Target Batch: ${cs.target}
- Modus Operandi: ${cs.modusOperandi}
- Key Red Flags:
${cs.redFlags.map((rf) => `  * ${rf}`).join('\n')}
- Institutional Countermeasure: ${cs.institutionalAction}
`
  )
  .join('\n---\n')}
`;

    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SafeIntern_Awareness_Curriculum_${new Date().toISOString().slice(0, 10)}.md`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6">
      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Screened</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {metrics.totalChecks}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Offers evaluated by bot</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Scams Intercepted</span>
            <AlertOctagon className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-rose-600">
            {metrics.highRiskIntercepted}
          </div>
          <p className="text-[11px] text-rose-600 mt-1">Flagged RED before payment</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Student Funds Saved</span>
            <IndianRupee className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700">
            ₹{metrics.totalMoneyProtectedInr.toLocaleString()}
          </div>
          <p className="text-[11px] text-emerald-600 mt-1">Direct fee extortion prevented</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Triage Speed</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-indigo-600">
            {metrics.averageReviewTimeHours} hrs
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Faculty decision turnaround</p>
        </div>
      </div>

      {/* Vector Distribution and Policy Compliance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Scam Vectors Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Dominant Scam Vectors (Current Season)
            </h4>
            <span className="text-[11px] font-mono text-slate-500">Based on {metrics.highRiskIntercepted} intercepts</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-medium mb-1">
                <span className="text-slate-800">Police Clearance & Background Verification Fees</span>
                <span className="font-mono text-slate-600">44%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-rose-500 h-2 rounded-full" style={{ width: '44%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between font-medium mb-1">
                <span className="text-slate-800">Laptop / Hardware Courier Insurance Bond</span>
                <span className="font-mono text-slate-600">28%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: '28%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between font-medium mb-1">
                <span className="text-slate-800">Telegram/WhatsApp Instant Unverified Task Offers</span>
                <span className="font-mono text-slate-600">18%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-indigo-500 h-2 rounded-full" style={{ width: '18%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between font-medium mb-1">
                <span className="text-slate-800">Typosquatted Lookalike Corporate Domains</span>
                <span className="font-mono text-slate-600">10%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: '10%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy & Compliance Summary */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-600" />
              Student Privacy & Data Governance (Section 7.5)
            </h4>
            <span className="text-[11px] font-mono text-emerald-600 font-semibold">100% Compliant</span>
          </div>

          <div className="space-y-2.5 text-xs text-slate-600">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-800">Data Minimization on Ingestion</span>
                <span className="text-emerald-700 font-mono text-[11px]">Enforced</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Aadhaar numbers and personal bank account numbers are redacted at ingestion. Hashed UPI identifiers are retained strictly for scam matching.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-800">Right to Erasure ("DELETE" command)</span>
                <span className="text-emerald-700 font-mono text-[11px]">Active</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Students can type "DELETE" or click the scrub button in the bot at any time to purge personal identifiers, roll numbers, and raw messages immediately.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-800">Zero Unauthorized Access Incidents</span>
                <span className="text-emerald-700 font-mono text-[11px]">0 breaches</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Placement Cell role-based access control with comprehensive audit logging for every decision.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Repository & Awareness Materials */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              Anonymized Learning Repository for Student Awareness Sessions
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Curated de-identified real cases ready for inclusion in college orientation slides and pre-placement training.
            </p>
          </div>

          <button
            onClick={handleExportAwarenessDeck}
            className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5" />
            Download Curriculum (.md)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {awarenessCaseStudies.map((study, idx) => (
            <div
              key={idx}
              className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h5 className="text-xs font-bold text-slate-900 leading-snug">
                    {study.title}
                  </h5>
                  <button
                    onClick={() =>
                      handleCopyCaseStudy(
                        `${study.title}\nTarget: ${study.target}\nModus Operandi: ${study.modusOperandi}\nRed Flags:\n${study.redFlags.join('\n')}`,
                        idx
                      )
                    }
                    className="text-slate-400 hover:text-slate-700 p-1"
                    title="Copy for presentation slides"
                  >
                    {copiedIndex === idx ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <div className="text-[11px] font-mono text-indigo-600 font-medium">
                  {study.target}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {study.modusOperandi}
                </p>
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Key Red Flags to Teach
                  </span>
                  <ul className="text-[11px] text-rose-800 space-y-1">
                    {study.redFlags.map((flag, fi) => (
                      <li key={fi} className="flex items-start gap-1">
                        <span className="text-rose-500 font-bold">•</span>
                        <span>{flag}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">Outcome: </span>
                {study.institutionalAction}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
