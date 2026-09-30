import React, { useState } from 'react';
import {
  Inbox,
  Database,
  BarChart3,
  BookOpen,
  Search,
  Filter,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ChevronRight,
  ExternalLink,
  Building,
  User,
  CheckCircle2,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { CaseRecord, ScamEntity, AnalyticsMetrics } from '../types';
import { CaseDetailModal } from './CaseDetailModal';
import { ScamDbManager } from './ScamDbManager';
import { AnalyticsView } from './AnalyticsView';
import { GuidelinesView } from './GuidelinesView';

interface PlacementDashboardProps {
  cases: CaseRecord[];
  scamEntities: ScamEntity[];
  metrics: AnalyticsMetrics;
  onRefreshData: () => Promise<void>;
  onUpdateCase: (updatedCase: CaseRecord) => void;
  onAddScamEntity: (entity: Omit<ScamEntity, 'id' | 'matchCount' | 'dateAdded'>) => Promise<void>;
  avatarUrl: string;
}

export const PlacementDashboard: React.FC<PlacementDashboardProps> = ({
  cases,
  scamEntities,
  metrics,
  onRefreshData,
  onUpdateCase,
  onAddScamEntity,
  avatarUrl,
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'scam_db' | 'analytics' | 'guidelines'>('queue');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefreshData();
    setIsRefreshing(false);
  };

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.student_roll.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.extracted_details.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.case_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.extracted_details.upi_ids && c.extracted_details.upi_ids.some((u) => u.toLowerCase().includes(searchQuery.toLowerCase())));

    if (!matchesSearch) return false;

    if (filterStatus === 'all') return true;
    if (filterStatus === 'pending') return c.status === 'escalated_pending_review';
    if (filterStatus === 'red') return c.risk_level === 'RED';
    if (filterStatus === 'amber') return c.risk_level === 'AMBER';
    if (filterStatus === 'safe') return c.status === 'resolved_safe' || c.risk_level === 'GREEN';
    if (filterStatus === 'blacklisted') return c.status === 'resolved_blacklisted';
    return true;
  });

  const getStatusBadge = (status: CaseRecord['status'], riskLevel: CaseRecord['risk_level']) => {
    switch (status) {
      case 'escalated_pending_review':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            <Clock className="w-3 h-3 text-amber-600" />
            Pending Review
          </span>
        );
      case 'resolved_safe':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Approved Safe
          </span>
        );
      case 'resolved_blacklisted':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
            <ShieldAlert className="w-3 h-3 text-rose-600" />
            Blacklisted Scam
          </span>
        );
      case 'resolved_warned':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Student Warned
          </span>
        );
      case 'privacy_anonymized':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
            Scrubbed (GDPR)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
            {status}
          </span>
        );
    }
  };

  const getRiskIndicator = (riskLevel: CaseRecord['risk_level'], score: number) => {
    if (riskLevel === 'RED') {
      return (
        <span className="font-mono font-bold text-xs text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded tabular-nums">
          RED ({score})
        </span>
      );
    }
    if (riskLevel === 'AMBER') {
      return (
        <span className="font-mono font-bold text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded tabular-nums">
          AMBER ({score})
        </span>
      );
    }
    return (
      <span className="font-mono font-bold text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded tabular-nums">
        SAFE ({score})
      </span>
    );
  };

  const pendingCount = cases.filter((c) => c.status === 'escalated_pending_review').length;

  return (
    <div className="space-y-6">
      {/* Top Bar with Contextual Breadcrumbs & Reviewer Profile */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>SafeIntern</span>
            <span>/</span>
            <span>Placement Review Cell</span>
            <span>/</span>
            <span className="text-slate-900 font-semibold capitalize">{activeTab.replace('_', ' ')}</span>
          </div>
          <h2 className="text-base font-bold text-slate-900 mt-1">
            Government College of Technology — Placement Verification Portal
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh cases from server"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
            <img
              src={avatarUrl}
              alt="Prof. R. Venkatesh"
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-cover border border-slate-200"
            />
            <div className="text-left text-xs">
              <p className="font-bold text-slate-900 leading-none">Prof. R. Venkatesh</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Placement Director & Faculty Chair</p>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'queue'
              ? 'bg-white border-t border-x border-slate-200 text-indigo-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Inbox className="w-4 h-4" />
          Cases Triage Queue
          {pendingCount > 0 && (
            <span className="font-mono text-[10px] bg-rose-600 text-white font-bold px-1.5 py-0.5 rounded-full">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('scam_db')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'scam_db'
              ? 'bg-white border-t border-x border-slate-200 text-indigo-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Database className="w-4 h-4" />
          Central Scam Database ({scamEntities.length})
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'bg-white border-t border-x border-slate-200 text-indigo-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Learning Repository & Analytics
        </button>

        <button
          onClick={() => setActiveTab('guidelines')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'guidelines'
              ? 'bg-white border-t border-x border-slate-200 text-indigo-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          AICTE & Verification SOP
        </button>
      </div>

      {/* TAB CONTENT 1: Cases Queue */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by student, roll number, company name, UPI ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: 'All Cases' },
                { id: 'pending', label: 'Pending Review' },
                { id: 'red', label: 'High Risk (RED)' },
                { id: 'amber', label: 'Caution (AMBER)' },
                { id: 'safe', label: 'Safe Offers' },
                { id: 'blacklisted', label: 'Blacklisted' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                    filterStatus === tab.id
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cases Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Case ID</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Entity / Company</th>
                    <th className="py-3 px-4">Risk Evaluation</th>
                    <th className="py-3 px-4">Red Flags</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredCases.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No cases found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCases.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedCase(item)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-medium text-slate-900">
                          {item.case_number}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900">{item.student_name}</p>
                          <p className="text-[11px] font-mono text-slate-500">
                            {item.student_roll} · {item.channel.toUpperCase()}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900">
                            {item.extracted_details.company_name || 'Unspecified Entity'}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate max-w-[200px]">
                            {item.extracted_details.role_title || 'Role Unspecified'}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          {getRiskIndicator(item.risk_level, item.risk_score)}
                        </td>
                        <td className="py-3 px-4">
                          {item.red_flags.length > 0 ? (
                            <span className="font-mono text-rose-700 font-bold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px]">
                              {item.red_flags.length} red flags
                            </span>
                          ) : (
                            <span className="text-emerald-700 text-[11px] font-medium">0 flags</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(item.status, item.risk_level)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCase(item);
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors inline-flex items-center gap-1"
                          >
                            <span>Inspect & Verify</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: Scam Database */}
      {activeTab === 'scam_db' && (
        <ScamDbManager
          entities={scamEntities}
          onAddEntity={onAddScamEntity}
        />
      )}

      {/* TAB CONTENT 3: Analytics & Learning Repository */}
      {activeTab === 'analytics' && (
        <AnalyticsView
          metrics={metrics}
          cases={cases}
        />
      )}

      {/* TAB CONTENT 4: Verification Guidelines */}
      {activeTab === 'guidelines' && <GuidelinesView />}

      {/* Case Detail Modal */}
      {selectedCase && (
        <CaseDetailModal
          caseRecord={selectedCase}
          onClose={() => setSelectedCase(null)}
          onUpdateCase={(updated) => {
            onUpdateCase(updated);
            setSelectedCase(updated);
          }}
        />
      )}
    </div>
  );
};
