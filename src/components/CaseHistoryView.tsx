import React, { useState } from 'react';
import {
  Inbox,
  Search,
  Filter,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Calendar,
  Building,
  User,
  ArrowUpDown,
} from 'lucide-react';
import { CaseRecord, RiskLevel } from '../types';

interface CaseHistoryViewProps {
  cases: CaseRecord[];
  onSelectCase: (caseRecord: CaseRecord) => void;
  onOpenReviewModal: (caseRecord: CaseRecord) => void;
}

export const CaseHistoryView: React.FC<CaseHistoryViewProps> = ({
  cases,
  onSelectCase,
  onOpenReviewModal,
}) => {
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.caseNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.studentName.toLowerCase().includes(search.toLowerCase()) ||
      c.extractedDetails.company_name.toLowerCase().includes(search.toLowerCase()) ||
      c.extractedDetails.job_title.toLowerCase().includes(search.toLowerCase());

    const matchesRisk = riskFilter === 'ALL' || c.riskLevel === riskFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PENDING' && c.reviewStatus === 'PENDING_REVIEW') ||
      (statusFilter === 'REVIEWED' && c.reviewStatus === 'REVIEWED') ||
      (statusFilter === 'VERIFIED' && c.verificationStatus === 'VERIFIED');

    return matchesSearch && matchesRisk && matchesStatus;
  });

  const getRiskBadge = (level: RiskLevel, score: number) => {
    switch (level) {
      case 'CRITICAL':
        return (
          <span className="font-mono text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
            CRITICAL ({score})
          </span>
        );
      case 'HIGH':
        return (
          <span className="font-mono text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
            HIGH ({score})
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            MEDIUM ({score})
          </span>
        );
      default:
        return (
          <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            LOW ({score})
          </span>
        );
    }
  };

  const getStatusBadge = (c: CaseRecord) => {
    if (c.review) {
      const isScam = c.review.verdict === 'SCAM';
      const isSafe = c.review.verdict === 'VERIFIED';
      return (
        <span
          className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
            isScam
              ? 'text-rose-700 bg-rose-50 border-rose-200'
              : isSafe
              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
              : 'text-amber-700 bg-amber-50 border-amber-200'
          }`}
        >
          {c.review.verdict}
        </span>
      );
    }

    if (c.reviewStatus === 'PENDING_REVIEW') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
          <Clock className="w-3 h-3 text-amber-600" />
          Pending Review
        </span>
      );
    }

    return (
      <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
        {c.verificationStatus}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by case ID, student, employer name, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-medium text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="CRITICAL">Critical Risk</option>
            <option value="HIGH">High Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="LOW">Low Risk</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-medium text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="REVIEWED">Reviewed Cases</option>
            <option value="VERIFIED">Verified Legitimate</option>
          </select>
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Case Ref</th>
                <th className="py-3.5 px-4">Claimed Employer & Role</th>
                <th className="py-3.5 px-4">Applicant Student</th>
                <th className="py-3.5 px-4">Risk Evaluation</th>
                <th className="py-3.5 px-4">Fee Demanded</th>
                <th className="py-3.5 px-4">Review Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No cases match the specified filters.
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => onSelectCase(c)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {c.caseNumber}
                      {c.isDemoCase && (
                        <span className="block text-[9px] font-mono text-amber-600">Demo</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{c.extractedDetails.company_name}</p>
                      <p className="text-[11px] text-slate-500 truncate max-w-[200px]">
                        {c.extractedDetails.job_title}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800">{c.studentName}</p>
                      <p className="text-[11px] font-mono text-slate-400">{c.studentRoll}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      {getRiskBadge(c.riskLevel, c.riskScore)}
                    </td>
                    <td className="py-3.5 px-4">
                      {c.extractedDetails.payment_requested ? (
                        <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[11px]">
                          ₹{c.extractedDetails.payment_amount.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-400">Zero</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(c)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onSelectCase(c)}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <span>Inspect</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        {c.reviewStatus === 'PENDING_REVIEW' && (
                          <button
                            onClick={() => onOpenReviewModal(c)}
                            className="px-2.5 py-1 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            Review
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
