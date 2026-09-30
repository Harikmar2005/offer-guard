import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileText,
  User,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  HelpCircle,
  Copy,
  Check,
  Building,
  CreditCard,
  Mail,
  Phone,
  Clock,
  Send,
  Lock,
} from 'lucide-react';
import { CaseRecord } from '../types';
import { EvidenceChainView } from './EvidenceChainView';

interface InvestigationReportViewProps {
  caseRecord: CaseRecord;
  onEscalateCase: (caseId: string) => void;
  onOpenReviewModal: (caseRecord: CaseRecord) => void;
}

export const InvestigationReportView: React.FC<InvestigationReportViewProps> = ({
  caseRecord,
  onEscalateCase,
  onOpenReviewModal,
}) => {
  const [activeTab, setActiveTab] = useState<'report' | 'evidence_chain' | 'extracted_json' | 'audit_trail'>('report');
  const [copied, setCopied] = useState(false);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return {
          bg: 'bg-rose-50 text-rose-950 border-rose-200',
          badge: 'bg-rose-600 text-white',
          border: 'border-rose-300',
          text: 'text-rose-700',
        };
      case 'HIGH':
        return {
          bg: 'bg-rose-50/70 text-rose-950 border-rose-200',
          badge: 'bg-rose-500 text-white',
          border: 'border-rose-200',
          text: 'text-rose-600',
        };
      case 'MEDIUM':
        return {
          bg: 'bg-amber-50 text-amber-950 border-amber-200',
          badge: 'bg-amber-500 text-white',
          border: 'border-amber-200',
          text: 'text-amber-700',
        };
      default:
        return {
          bg: 'bg-emerald-50 text-emerald-950 border-emerald-200',
          badge: 'bg-emerald-600 text-white',
          border: 'border-emerald-200',
          text: 'text-emerald-700',
        };
    }
  };

  const colors = getRiskColor(caseRecord.riskLevel);

  const handleCopySummary = () => {
    const textToCopy = `OfferGuard Verification Report\nCase ID: ${caseRecord.caseNumber}\nCompany: ${caseRecord.extractedDetails.company_name}\nRisk Level: ${caseRecord.riskLevel} (${caseRecord.riskScore}/100)\nStatus: ${caseRecord.verificationStatus}\nSummary: ${caseRecord.summary}\nRecommended Action: ${caseRecord.recommendedAction}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Card: Risk Level + Score + Verification Status */}
      <div className={`border rounded-2xl p-6 shadow-sm ${colors.bg}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase font-bold text-slate-500 tracking-wider">
                {caseRecord.caseNumber}
              </span>
              <span className="text-slate-300">·</span>
              <span className={`text-[11px] font-mono font-bold uppercase px-2 py-0.5 rounded ${colors.badge}`}>
                {caseRecord.riskLevel} RISK
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs font-semibold text-slate-700 bg-white/80 border border-slate-200 px-2 py-0.5 rounded">
                Status: {caseRecord.verificationStatus}
              </span>
              {caseRecord.isDemoCase && (
                <span className="text-[10px] font-mono text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                  Fictional Demo Case
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {caseRecord.extractedDetails.company_name || 'Unspecified Employer'}
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              Role: <strong className="text-slate-900">{caseRecord.extractedDetails.job_title}</strong> · Submitted by {caseRecord.studentName} ({caseRecord.studentRoll})
            </p>
          </div>

          <div className="flex items-center gap-4 self-start md:self-auto bg-white/80 border border-slate-200 p-3.5 rounded-xl">
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400">Deterministic Risk Score</div>
              <div className="flex items-baseline gap-1 justify-end">
                <span className={`text-3xl font-black font-mono tabular-nums ${colors.text}`}>
                  {caseRecord.riskScore}
                </span>
                <span className="text-xs text-slate-400 font-mono">/ 100</span>
              </div>
            </div>

            <div className="w-12 h-12 rounded-full border-4 flex items-center justify-center font-bold text-sm bg-white shadow-xs">
              {caseRecord.riskScore >= 70 ? (
                <ShieldAlert className="w-6 h-6 text-rose-600" />
              ) : caseRecord.riskScore >= 40 ? (
                <AlertTriangle className="w-6 h-6 text-rose-500" />
              ) : caseRecord.riskScore >= 20 ? (
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              ) : (
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
              )}
            </div>
          </div>
        </div>

        {/* Action recommendation callout */}
        <div className="mt-5 p-3.5 bg-white rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="space-y-0.5">
            <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400 block">
              OfferGuard Recommended Action
            </span>
            <p className="font-semibold text-slate-900 leading-snug">
              {caseRecord.recommendedAction}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              onClick={handleCopySummary}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Report'}
            </button>

            {caseRecord.reviewStatus === 'PENDING_REVIEW' ? (
              <button
                onClick={() => onOpenReviewModal(caseRecord)}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <span>Placement Reviewer Decision</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : caseRecord.review ? (
              <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
                Reviewed: {caseRecord.review.verdict}
              </span>
            ) : (
              <button
                onClick={() => onEscalateCase(caseRecord.id)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Request Placement Review
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Report Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('report')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'report' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Explainable Report & Signals
        </button>

        <button
          onClick={() => setActiveTab('evidence_chain')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'evidence_chain' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          Visual Evidence Chain ({caseRecord.evidenceChain.length})
        </button>

        <button
          onClick={() => setActiveTab('extracted_json')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'extracted_json' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          Structured Entities
        </button>

        <button
          onClick={() => setActiveTab('audit_trail')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'audit_trail' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Audit Trail ({caseRecord.auditTrail.length})
        </button>
      </div>

      {/* TAB 1: Explainable Report */}
      {activeTab === 'report' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Summary, Reasoning, Unverified */}
          <div className="lg:col-span-7 space-y-6">
            {/* Executive Investigation Summary */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Investigation Summary
              </h3>
              <p className="text-xs text-slate-800 leading-relaxed font-medium">
                {caseRecord.summary}
              </p>
            </div>

            {/* Detailed Forensic Reasoning */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Forensic Reasoning & Norm Alignment
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {caseRecord.reasoning}
              </p>
            </div>

            {/* Unverified Information (Requirement 4: clearly distinguish unverified info) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                  Unverified Information (Never Claim 100% Certainty)
                </h3>
                <span className="text-[10px] font-mono text-slate-400">Requires Out-Of-Band Check</span>
              </div>
              <ul className="space-y-1 text-xs text-slate-600 list-disc list-inside leading-relaxed">
                {caseRecord.unverifiedInfo.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Original Input Text Preview */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Original Submitted Offer Text / Communication
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Submission Type: {caseRecord.submissionType.toUpperCase()}
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                {caseRecord.rawInput}
              </div>
            </div>
          </div>

          {/* Right Column: Detected Signals breakdown */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Detected Red Flags & Signals ({caseRecord.detectedSignals.length})
              </span>
              <span className="text-[11px] font-mono text-slate-500">Scoring Impact</span>
            </div>

            {caseRecord.detectedSignals.length === 0 ? (
              <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  No Security Red Flags Identified
                </p>
                <p className="text-[11px] text-emerald-700">
                  Communication complies with standard university recruitment parameters with zero advance fee demands.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {caseRecord.detectedSignals.map((sig) => (
                  <div
                    key={sig.id}
                    className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 hover:border-slate-300 transition-colors shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            sig.severity === 'critical'
                              ? 'bg-rose-600'
                              : sig.severity === 'high'
                              ? 'bg-rose-500'
                              : 'bg-amber-500'
                          }`}
                        />
                        {sig.name}
                      </h4>
                      <span className="font-mono text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                        +{sig.impact} pts
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {sig.description}
                    </p>

                    {sig.evidence && (
                      <div className="text-[11px] font-mono bg-slate-50 border border-slate-200 text-slate-800 p-2 rounded">
                        Evidence: {sig.evidence}
                      </div>
                    )}

                    {sig.policyRef && (
                      <div className="text-[10px] text-slate-500 font-medium">
                        Reference: <span className="text-slate-800">{sig.policyRef}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Visual Evidence Chain */}
      {activeTab === 'evidence_chain' && (
        <EvidenceChainView chain={caseRecord.evidenceChain} />
      )}

      {/* TAB 3: Structured Extracted JSON Entities */}
      {activeTab === 'extracted_json' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
            AI Extracted Entity Schema
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {Object.entries(caseRecord.extractedDetails).map(([key, val]) => (
              <div key={key} className="grid grid-cols-1 sm:grid-cols-4 px-5 py-3 gap-2">
                <span className="font-mono font-medium text-slate-500 capitalize">
                  {key.replace(/_/g, ' ')}
                </span>
                <span className="sm:col-span-3 text-slate-900 font-medium">
                  {typeof val === 'boolean'
                    ? val ? 'true (YES)' : 'false (NO)'
                    : Array.isArray(val)
                    ? val.length > 0 ? val.join(', ') : 'None'
                    : String(val) || 'N/A'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Audit Trail */}
      {activeTab === 'audit_trail' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Immutable Case Audit Trail
            </span>
            <span className="text-xs font-mono text-slate-400">
              Case Ref: {caseRecord.caseNumber}
            </span>
          </div>

          <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
            {caseRecord.auditTrail.map((log) => (
              <div key={log.id} className="relative group">
                <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-600" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{log.action}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-[11px] font-medium text-slate-600">
                      {log.actorName} ({log.actorType})
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-100">
                    {log.details}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
