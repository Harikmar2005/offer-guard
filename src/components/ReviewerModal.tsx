import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  Database,
  Building,
  User,
  Clock,
  FileText,
} from 'lucide-react';
import { CaseRecord, ReviewVerdict } from '../types';

interface ReviewerModalProps {
  caseRecord: CaseRecord;
  onClose: () => void;
  onSubmitReview: (reviewData: {
    caseId: string;
    verdict: ReviewVerdict;
    notes: string;
    reviewerName: string;
    reviewerRole: string;
    addToScamDb: boolean;
  }) => Promise<void>;
}

export const ReviewerModal: React.FC<ReviewerModalProps> = ({
  caseRecord,
  onClose,
  onSubmitReview,
}) => {
  const [verdict, setVerdict] = useState<ReviewVerdict>(
    caseRecord.review?.verdict ||
      (caseRecord.riskLevel === 'CRITICAL' || caseRecord.riskLevel === 'HIGH' ? 'SCAM' : 'VERIFIED')
  );
  const [notes, setNotes] = useState(
    caseRecord.review?.notes ||
      (caseRecord.riskLevel === 'CRITICAL'
        ? 'Do not proceed. The recruiter demands advance payment for police verification/equipment bond which violates AICTE norms. Similar reports logged in scam registry.'
        : 'Offer details verified. Conforms to university placement parameters.')
  );
  const [reviewerName, setReviewerName] = useState('Prof. R. Venkatesh');
  const [reviewerRole, setReviewerRole] = useState('Head of Placements & Career Cell');
  const [addToScamDb, setAddToScamDb] = useState(
    caseRecord.riskLevel === 'CRITICAL' || caseRecord.riskLevel === 'HIGH'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmitReview({
        caseId: caseRecord.id,
        verdict,
        notes,
        reviewerName,
        reviewerRole,
        addToScamDb,
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error submitting review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-500 uppercase">
                {caseRecord.caseNumber}
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs font-mono font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                Risk: {caseRecord.riskScore}/100 ({caseRecord.riskLevel})
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              Human-in-the-Loop Review & Decision
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Case Context Summary */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-500 font-medium">Employer:</span>
              <p className="font-bold text-slate-900">{caseRecord.extractedDetails.company_name}</p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Student:</span>
              <p className="font-bold text-slate-900">{caseRecord.studentName} ({caseRecord.studentRoll})</p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">AI Triage Status:</span>
              <p className="font-bold text-slate-800">{caseRecord.verificationStatus}</p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Payment Requested:</span>
              <p className="font-bold text-rose-600">
                {caseRecord.extractedDetails.payment_requested
                  ? `₹${caseRecord.extractedDetails.payment_amount.toLocaleString()} (${caseRecord.extractedDetails.payment_method})`
                  : 'Zero'}
              </p>
            </div>
          </div>

          {/* Verdict Options (Requirement 15: VERIFIED, WARNING, SCAM, NEEDS MORE INFORMATION) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Reviewer Final Verdict
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  id: 'SCAM',
                  title: 'SCAM (Fraudulent Offer)',
                  desc: 'Extortion, impersonation, or fake certificate fee.',
                  color: 'border-rose-200 hover:bg-rose-50 text-rose-950',
                },
                {
                  id: 'WARNING',
                  title: 'WARNING (High Risk / Unverified)',
                  desc: 'Unregulated pay-to-work terms or aggressive clauses.',
                  color: 'border-amber-200 hover:bg-amber-50 text-amber-950',
                },
                {
                  id: 'NEEDS MORE INFORMATION',
                  title: 'NEEDS MORE INFORMATION',
                  desc: 'Awaiting corporate registration or HR callback.',
                  color: 'border-slate-200 hover:bg-slate-50 text-slate-950',
                },
                {
                  id: 'VERIFIED',
                  title: 'VERIFIED (Legitimate Offer)',
                  desc: 'Confirmed genuine campus or off-campus hire.',
                  color: 'border-emerald-200 hover:bg-emerald-50 text-emerald-950',
                },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`p-3 border rounded-xl cursor-pointer flex flex-col justify-between transition-colors ${
                    verdict === opt.id ? 'ring-2 ring-indigo-600 bg-indigo-50/40 border-indigo-300' : opt.color
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="verdict"
                      value={opt.id}
                      checked={verdict === opt.id}
                      onChange={(e) => setVerdict(e.target.value as any)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold">{opt.title}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 pl-5">{opt.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Reviewer Notes & Justification */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reviewer Justification & Guidance for Student
            </label>
            <textarea
              rows={3}
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide clear institutional rationale explaining your verdict..."
              className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Add to Scam Intelligence DB toggle */}
          {(verdict === 'SCAM' || verdict === 'WARNING') && (
            <label className="flex items-center gap-2 text-xs text-slate-800 p-3 bg-rose-50 border border-rose-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={addToScamDb}
                onChange={(e) => setAddToScamDb(e.target.checked)}
                className="rounded text-rose-600 focus:ring-rose-500"
              />
              <span className="font-semibold">
                Add entity ({caseRecord.extractedDetails.company_name}) and associated identifiers to OfferGuard Scam Intelligence Registry
              </span>
            </label>
          )}

          {/* Reviewer Identity */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Reviewer Name</label>
              <input
                type="text"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-medium"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Role / Designation</label>
              <input
                type="text"
                value={reviewerRole}
                onChange={(e) => setReviewerRole(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-medium"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
            >
              {isSubmitting ? 'Recording...' : 'Record Official Decision'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
