import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Building,
  User,
  Mail,
  Phone,
  CreditCard,
  ExternalLink,
  Clock,
  FileText,
  Lock,
  ArrowRight,
  Database,
  History,
} from 'lucide-react';
import { CaseRecord, ReviewerChecklist, ReviewerDecision } from '../types';

interface CaseDetailModalProps {
  caseRecord: CaseRecord;
  onClose: () => void;
  onUpdateCase: (updatedCase: CaseRecord) => void;
}

export const CaseDetailModal: React.FC<CaseDetailModalProps> = ({
  caseRecord,
  onClose,
  onUpdateCase,
}) => {
  const [checklist, setChecklist] = useState<ReviewerChecklist>(
    caseRecord.reviewer_checklist || {
      company_website_verified: { status: 'concern', notes: 'Unable to find registered ROC incorporation for entity.' },
      domain_matches_official: { status: 'concern', notes: 'Recruiter communication used personal Gmail domain.' },
      fee_request_prohibited: { status: 'concern', notes: 'Demanded advance UPI transfer for police verification.' },
      official_documentation_verified: { status: 'concern', notes: 'Provisional letter lacks digital corporate signature.' },
      stipend_scope_reasonable: { status: 'concern', notes: 'High stipend offered with zero technical interview.' },
    }
  );

  const [verdict, setVerdict] = useState<ReviewerDecision['verdict']>(
    caseRecord.reviewer_decision?.verdict ||
      (caseRecord.risk_level === 'RED' ? 'warn_high_risk' : 'approved_safe')
  );
  const [decisionNotes, setDecisionNotes] = useState(
    caseRecord.reviewer_decision?.decision_summary ||
      (caseRecord.risk_level === 'RED'
        ? 'Do not proceed. The recruiter is requesting fees for police clearance which directly violates College Placement Policy 4.1 and AICTE rules. Similar reports exist in our central database.'
        : 'Verified offer letter and company domain. Offer conforms to college guidelines.')
  );
  const [addToScamDb, setAddToScamDb] = useState(
    caseRecord.reviewer_decision?.addToScamDb ?? (caseRecord.risk_level === 'RED')
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'review' | 'raw_data' | 'audit_trail'>('review');

  const handleChecklistChange = (
    key: keyof ReviewerChecklist,
    status: 'pass' | 'concern' | 'na',
    notes: string
  ) => {
    setChecklist((prev) => ({
      ...prev,
      [key]: { status, notes },
    }));
  };

  const handleSubmitDecision = async () => {
    setIsSubmitting(true);
    try {
      const decisionData: ReviewerDecision = {
        verdict,
        decision_summary: decisionNotes,
        reviewer_name: 'Prof. R. Venkatesh (Placement Director)',
        timestamp: new Date().toISOString(),
        addToScamDb,
      };

      const res = await fetch(`/api/cases/${caseRecord.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewer_checklist: checklist,
          reviewer_decision: decisionData,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onUpdateCase(data.case);
        onClose();
      } else {
        alert('Failed to save decision. Please try again.');
      }
    } catch (err) {
      console.error('Error updating case decision:', err);
      alert('Error updating case decision.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'RED':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            HIGH RISK
          </span>
        );
      case 'AMBER':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            CAUTION (AMBER)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            SAFE (GREEN)
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {caseRecord.case_number}
                </span>
                <span className="text-slate-300">·</span>
                {getRiskBadge(caseRecord.risk_level)}
                <span className="text-slate-300">·</span>
                <span className="text-xs font-mono text-slate-500">
                  Risk Score: {caseRecord.risk_score}/100
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                {caseRecord.extracted_details.company_name || 'Unspecified Company'} —{' '}
                {caseRecord.extracted_details.role_title || 'Internship Offer'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="px-6 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('review')}
              className={`py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'review'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Verification & Decision
            </button>
            <button
              onClick={() => setActiveTab('raw_data')}
              className={`py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'raw_data'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              Raw Offer & Extracted Details
            </button>
            <button
              onClick={() => setActiveTab('audit_trail')}
              className={`py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'audit_trail'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-4 h-4" />
              Audit Trail ({caseRecord.audit_trail?.length || 0})
            </button>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Student: <span className="text-slate-900 font-medium">{caseRecord.student_name}</span> ({caseRecord.student_roll})
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'review' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Case Overview & Red Flags */}
              <div className="lg:col-span-6 space-y-5">
                {/* Student & Submission context */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Student Submission Metadata
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">Student Name:</span>
                      <p className="font-medium text-slate-900">{caseRecord.student_name}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Roll Number:</span>
                      <p className="font-mono font-medium text-slate-900">{caseRecord.student_roll}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Department:</span>
                      <p className="font-medium text-slate-900">{caseRecord.student_department}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Submitted Via:</span>
                      <p className="font-medium text-slate-900 capitalize flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        {caseRecord.channel}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Red Flags Identified */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Identified Red Flags ({caseRecord.red_flags.length})
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      Policy Rule 4.1
                    </span>
                  </div>

                  {caseRecord.red_flags.length === 0 ? (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      No critical red flags detected. Communication matches verified campus placement parameters.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {caseRecord.red_flags.map((flag, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 bg-rose-50/60 border border-rose-200/80 rounded-lg space-y-1.5"
                        >
                          <div className="flex items-start justify-between">
                            <h4 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              {flag.title}
                            </h4>
                            <span className="text-[10px] font-mono text-rose-600 uppercase font-semibold">
                              {flag.severity}
                            </span>
                          </div>
                          <p className="text-xs text-rose-800 leading-relaxed">
                            {flag.explanation}
                          </p>
                          {flag.evidence && (
                            <div className="text-[11px] font-mono bg-white/70 border border-rose-200 text-rose-900 px-2 py-1 rounded">
                              Evidence: {flag.evidence}
                            </div>
                          )}
                          {flag.policy_ref && (
                            <div className="text-[10px] text-slate-600">
                              Violates: <span className="font-medium text-slate-800">{flag.policy_ref}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Student Checklist answers */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2.5">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Student Guided Q&A Responses
                  </div>
                  <div className="space-y-2 text-xs">
                    {caseRecord.checklist_answers?.map((ans, i) => (
                      <div key={i} className="pb-2 border-b border-slate-100 last:border-0 last:pb-0">
                        <p className="text-slate-500">{ans.question_text}</p>
                        <p className={`font-semibold mt-0.5 ${
                          ans.concern_level === 'critical'
                            ? 'text-rose-700'
                            : ans.concern_level === 'warning'
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}>
                          Answer: {ans.student_answer}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Institutional Verification Checklist & Reviewer Decision */}
              <div className="lg:col-span-6 space-y-5">
                <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Faculty Verification Checklist
                    </span>
                    <span className="text-[11px] text-indigo-600 font-medium">
                      College SOP v2.4
                    </span>
                  </div>

                  {/* Checklist item 1 */}
                  <div className="p-3 bg-white border border-slate-200 rounded-md space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        1. Company Legitimacy & ROC Verification
                      </span>
                      <div className="flex gap-1">
                        {(['pass', 'concern', 'na'] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() =>
                              handleChecklistChange(
                                'company_website_verified',
                                st,
                                checklist.company_website_verified.notes
                              )
                            }
                            className={`px-2 py-0.5 text-[11px] font-semibold rounded uppercase transition-colors ${
                              checklist.company_website_verified.status === st
                                ? st === 'pass'
                                  ? 'bg-emerald-600 text-white'
                                  : st === 'concern'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-700 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="text"
                      value={checklist.company_website_verified.notes}
                      onChange={(e) =>
                        handleChecklistChange(
                          'company_website_verified',
                          checklist.company_website_verified.status,
                          e.target.value
                        )
                      }
                      placeholder="Reviewer notes on company verification..."
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Checklist item 2 */}
                  <div className="p-3 bg-white border border-slate-200 rounded-md space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        2. Domain & Email Authentication
                      </span>
                      <div className="flex gap-1">
                        {(['pass', 'concern', 'na'] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() =>
                              handleChecklistChange(
                                'domain_matches_official',
                                st,
                                checklist.domain_matches_official.notes
                              )
                            }
                            className={`px-2 py-0.5 text-[11px] font-semibold rounded uppercase transition-colors ${
                              checklist.domain_matches_official.status === st
                                ? st === 'pass'
                                  ? 'bg-emerald-600 text-white'
                                  : st === 'concern'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-700 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="text"
                      value={checklist.domain_matches_official.notes}
                      onChange={(e) =>
                        handleChecklistChange(
                          'domain_matches_official',
                          checklist.domain_matches_official.status,
                          e.target.value
                        )
                      }
                      placeholder="Reviewer notes on email domain..."
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Checklist item 3 */}
                  <div className="p-3 bg-white border border-slate-200 rounded-md space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        3. Prohibition of Candidate Fees (AICTE Policy)
                      </span>
                      <div className="flex gap-1">
                        {(['pass', 'concern', 'na'] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() =>
                              handleChecklistChange(
                                'fee_request_prohibited',
                                st,
                                checklist.fee_request_prohibited.notes
                              )
                            }
                            className={`px-2 py-0.5 text-[11px] font-semibold rounded uppercase transition-colors ${
                              checklist.fee_request_prohibited.status === st
                                ? st === 'pass'
                                  ? 'bg-emerald-600 text-white'
                                  : st === 'concern'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-700 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="text"
                      value={checklist.fee_request_prohibited.notes}
                      onChange={(e) =>
                        handleChecklistChange(
                          'fee_request_prohibited',
                          checklist.fee_request_prohibited.status,
                          e.target.value
                        )
                      }
                      placeholder="Reviewer notes on fee policy..."
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Checklist item 4 */}
                  <div className="p-3 bg-white border border-slate-200 rounded-md space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        4. Documentation Authenticity & Signatures
                      </span>
                      <div className="flex gap-1">
                        {(['pass', 'concern', 'na'] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() =>
                              handleChecklistChange(
                                'official_documentation_verified',
                                st,
                                checklist.official_documentation_verified.notes
                              )
                            }
                            className={`px-2 py-0.5 text-[11px] font-semibold rounded uppercase transition-colors ${
                              checklist.official_documentation_verified.status === st
                                ? st === 'pass'
                                  ? 'bg-emerald-600 text-white'
                                  : st === 'concern'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-700 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="text"
                      value={checklist.official_documentation_verified.notes}
                      onChange={(e) =>
                        handleChecklistChange(
                          'official_documentation_verified',
                          checklist.official_documentation_verified.status,
                          e.target.value
                        )
                      }
                      placeholder="Reviewer notes on signatures/stamps..."
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Reviewer Verdict & Action Panel */}
                <div className="bg-white border-2 border-indigo-100 rounded-lg p-4 space-y-4">
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                    <span>Record Official Placement Cell Decision</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Prof. R. Venkatesh
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Placement Cell Verdict
                    </label>
                    <select
                      value={verdict}
                      onChange={(e) => setVerdict(e.target.value as any)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="warn_high_risk">
                        ⚠️ WARN STUDENT — High Risk / Potential Scam
                      </option>
                      <option value="blacklist_scam">
                        🚫 BLACKLIST ENTITY — Confirmed Scam Operation
                      </option>
                      <option value="approved_with_reservations">
                        ⚠️ Approved with Academic Reservations
                      </option>
                      <option value="approved_safe">
                        ✅ MARK AS SAFE — Verified Legitimate Offer
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Decision Justification (Pushed to Student Chat & Audit Trail)
                    </label>
                    <textarea
                      rows={3}
                      value={decisionNotes}
                      onChange={(e) => setDecisionNotes(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="State the official placement cell rationale..."
                    />
                  </div>

                  {(verdict === 'warn_high_risk' || verdict === 'blacklist_scam') && (
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-2.5 bg-rose-50/50 border border-rose-200/60 rounded">
                      <input
                        type="checkbox"
                        checked={addToScamDb}
                        onChange={(e) => setAddToScamDb(e.target.checked)}
                        className="rounded text-rose-600 focus:ring-rose-500"
                      />
                      <span className="font-semibold text-rose-900">
                        Add entity ({caseRecord.extracted_details.company_name}) and UPI IDs to Central Institutional Blacklist
                      </span>
                    </label>
                  )}

                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleSubmitDecision}
                      className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
                    >
                      {isSubmitting ? 'Recording...' : 'Submit Official Verdict'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'raw_data' && (
            <div className="space-y-6">
              {/* Raw recruiter communication */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Forwarded Recruiter Messages / Offer Text
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    Channel: {caseRecord.channel.toUpperCase()}
                  </span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                  {caseRecord.raw_input_text || 'No raw message text provided.'}
                </div>
              </div>

              {/* Attachments */}
              {caseRecord.attached_files && caseRecord.attached_files.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Attached Files ({caseRecord.attached_files.length})
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {caseRecord.attached_files.map((file, i) => (
                      <div
                        key={i}
                        className="p-3 bg-white border border-slate-200 rounded flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-indigo-600" />
                          <div>
                            <p className="font-semibold text-slate-900">{file.name}</p>
                            <p className="text-[10px] text-slate-500">{file.size} · {file.type}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          OCR Extracted
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extracted Details Table */}
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Normalized JSON Extraction Fields
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="grid grid-cols-3 px-4 py-2.5">
                    <span className="font-medium text-slate-500">Company Name</span>
                    <span className="col-span-2 font-semibold text-slate-900">
                      {caseRecord.extracted_details.company_name || 'N/A'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 px-4 py-2.5">
                    <span className="font-medium text-slate-500">Role Title</span>
                    <span className="col-span-2 text-slate-900 font-medium">
                      {caseRecord.extracted_details.role_title || 'N/A'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 px-4 py-2.5">
                    <span className="font-medium text-slate-500">Stipend Amount</span>
                    <span className="col-span-2 font-mono text-slate-900">
                      {caseRecord.extracted_details.stipend_amount || 'Unspecified'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 px-4 py-2.5">
                    <span className="font-medium text-slate-500">Recruiter Contact</span>
                    <span className="col-span-2 text-slate-900">
                      {caseRecord.extracted_details.recruiter_name || 'Unspecified'} ·{' '}
                      {caseRecord.extracted_details.recruiter_email || 'No email'} ·{' '}
                      {caseRecord.extracted_details.recruiter_phone || 'No phone'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 px-4 py-2.5">
                    <span className="font-medium text-slate-500">Detected UPI IDs</span>
                    <div className="col-span-2 flex flex-wrap gap-1.5">
                      {caseRecord.extracted_details.upi_ids?.length ? (
                        caseRecord.extracted_details.upi_ids.map((upi, i) => (
                          <span
                            key={i}
                            className="font-mono text-[11px] bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded"
                          >
                            {upi}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400">None detected</span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 px-4 py-2.5">
                    <span className="font-medium text-slate-500">Demanded Fees</span>
                    <div className="col-span-2 space-y-1">
                      {caseRecord.extracted_details.requested_fees?.length ? (
                        caseRecord.extracted_details.requested_fees.map((fee, i) => (
                          <div key={i} className="text-rose-700 font-semibold font-mono">
                            ₹{fee.amount.toLocaleString()} — {fee.reason}
                          </div>
                        ))
                      ) : (
                        <span className="text-slate-400">No advance fee demanded</span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 px-4 py-2.5">
                    <span className="font-medium text-slate-500">High-Pressure Tactics</span>
                    <span className="col-span-2 font-medium">
                      {caseRecord.extracted_details.deadlines_or_pressure ? (
                        <span className="text-rose-600">Yes — Artificial urgency detected</span>
                      ) : (
                        <span className="text-slate-600">No pressure signals detected</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audit_trail' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Case Event Log & Chain of Custody
                </span>
                <span className="text-xs font-mono text-slate-500">
                  Immutable Record
                </span>
              </div>

              <div className="relative pl-6 border-l-2 border-indigo-200 space-y-6">
                {caseRecord.audit_trail?.map((log, i) => (
                  <div key={log.id || i} className="relative group">
                    <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-600"></div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {log.action}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-[11px] font-medium text-slate-600">
                          {log.actor_name} ({log.actor_type})
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
      </div>
    </div>
  );
};
