import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  LayoutDashboard,
  Database,
  BarChart3,
  Sliders,
  MessageSquare,
  FileText,
  User,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Inbox,
  AlertCircle,
} from 'lucide-react';
import {
  CaseRecord,
  ScamPatternEntity,
  SuspiciousEntity,
  ScoringWeights,
  UserRole,
} from './types';
import { VerifyOpportunityForm } from './components/VerifyOpportunityForm';
import { InvestigationReportView } from './components/InvestigationReportView';
import { CaseHistoryView } from './components/CaseHistoryView';
import { ReviewerModal } from './components/ReviewerModal';
import { ScamIntelligenceView } from './components/ScamIntelligenceView';
import { InstitutionalAnalyticsView } from './components/InstitutionalAnalyticsView';
import { SettingsScoringView } from './components/SettingsScoringView';
import { InvestigationChatbot } from './components/InvestigationChatbot';

export default function App() {
  const [currentTab, setCurrentTab] = useState<
    'verify' | 'report' | 'cases' | 'reviewer' | 'intelligence' | 'analytics' | 'settings' | 'chatbot'
  >('verify');

  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('STUDENT');
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [activeCase, setActiveCase] = useState<CaseRecord | null>(null);
  const [scamPatterns, setScamPatterns] = useState<ScamPatternEntity[]>([]);
  const [suspiciousEntities, setSuspiciousEntities] = useState<SuspiciousEntity[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [scoringWeights, setScoringWeights] = useState<ScoringWeights>({
    registration_fee: 20,
    personal_upi: 20,
    recruiter_domain_mismatch: 15,
    company_inconsistency: 15,
    urgency_language: 10,
    sensitive_document_request: 10,
    unrealistic_salary: 8,
    suspicious_domain: 15,
    unverifiable_company: 12,
  });

  const [selectedReviewCase, setSelectedReviewCase] = useState<CaseRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial data
  const fetchData = async () => {
    try {
      const [casesRes, intelRes, analyticsRes, weightsRes] = await Promise.all([
        fetch('/api/cases'),
        fetch('/api/intelligence'),
        fetch('/api/analytics'),
        fetch('/api/settings/scoring'),
      ]);

      if (casesRes.ok) {
        const cData = await casesRes.json();
        setCases(cData.cases || []);
        if (cData.cases?.length > 0 && !activeCase) {
          setActiveCase(cData.cases[1]); // Default to Case 2 (ApexCyber scam demo)
        }
      }

      if (intelRes.ok) {
        const iData = await intelRes.json();
        setScamPatterns(iData.patterns || []);
        setSuspiciousEntities(iData.suspiciousEntities || []);
      }

      if (analyticsRes.ok) {
        const aData = await analyticsRes.json();
        setAnalyticsData(aData);
      }

      if (weightsRes.ok) {
        const wData = await weightsRes.json();
        if (wData.scoringWeights) setScoringWeights(wData.scoringWeights);
      }
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCaseAnalyzed = (newCase: CaseRecord) => {
    setCases((prev) => [newCase, ...prev]);
    setActiveCase(newCase);
    setCurrentTab('report');
  };

  const handleSelectDemoCase = (demoId: string) => {
    const target = cases.find((c) => c.id === demoId);
    if (target) {
      setActiveCase(target);
      setCurrentTab('report');
    }
  };

  const handleSelectCase = (c: CaseRecord) => {
    setActiveCase(c);
    setCurrentTab('report');
  };

  const handleEscalateCase = (caseId: string) => {
    const target = cases.find((c) => c.id === caseId);
    if (target) {
      target.reviewStatus = 'PENDING_REVIEW';
      target.humanReviewRequired = true;
      setCases((prev) => prev.map((item) => (item.id === caseId ? target : item)));
      alert(`Case ${target.caseNumber} has been escalated to the placement cell review queue.`);
    }
  };

  const handleSubmitReview = async (reviewData: any) => {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reviewData),
    });

    if (res.ok) {
      const data = await res.json();
      setCases((prev) => prev.map((c) => (c.id === data.case.id ? data.case : c)));
      if (activeCase?.id === data.case.id) {
        setActiveCase(data.case);
      }
      // Refresh intelligence
      const intelRes = await fetch('/api/intelligence');
      if (intelRes.ok) {
        const iData = await intelRes.json();
        setSuspiciousEntities(iData.suspiciousEntities || []);
      }
    }
  };

  const handleAddScamEntity = async (entity: any) => {
    const res = await fetch('/api/intelligence/entity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entity),
    });
    if (res.ok) {
      const data = await res.json();
      setSuspiciousEntities((prev) => [data.entity, ...prev]);
    }
  };

  const handleUpdateWeights = async (newWeights: ScoringWeights) => {
    const res = await fetch('/api/settings/scoring', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scoringWeights: newWeights }),
    });
    if (res.ok) {
      setScoringWeights(newWeights);
    }
  };

  const pendingReviewCount = cases.filter((c) => c.reviewStatus === 'PENDING_REVIEW').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Logo & Slogan */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black tracking-tight text-slate-900">
                  OFFERGUARD
                </span>
                <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                  v2.4
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium leading-none">
                Verify Before You Apply.
              </p>
            </div>
          </div>

          {/* Navigation Items (Requirement 21) */}
          <nav className="hidden lg:flex items-center gap-1 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setCurrentTab('verify')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                currentTab === 'verify'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              Verify Opportunity
            </button>

            <button
              onClick={() => setCurrentTab('report')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                currentTab === 'report'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Investigation Report
              {activeCase && (
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              )}
            </button>

            <button
              onClick={() => setCurrentTab('cases')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                currentTab === 'cases'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              Case History ({cases.length})
            </button>

            <button
              onClick={() => setCurrentTab('reviewer')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                currentTab === 'reviewer'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Reviewer Portal
              {pendingReviewCount > 0 && (
                <span className="font-mono text-[10px] bg-rose-600 text-white px-1.5 py-0.2 rounded-full">
                  {pendingReviewCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setCurrentTab('intelligence')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                currentTab === 'intelligence'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Scam Intelligence
            </button>

            <button
              onClick={() => setCurrentTab('analytics')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                currentTab === 'analytics'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Analytics
            </button>

            <button
              onClick={() => setCurrentTab('chatbot')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                currentTab === 'chatbot'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Ask AI
            </button>

            <button
              onClick={() => setCurrentTab('settings')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                currentTab === 'settings'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Scoring Rules
            </button>
          </nav>

          {/* User Role Selector (Requirement 24) */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
              {(['STUDENT', 'REVIEWER', 'ADMIN'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setCurrentUserRole(r);
                    if (r === 'REVIEWER') setCurrentTab('reviewer');
                  }}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    currentUserRole === r
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {currentTab === 'verify' && (
          <VerifyOpportunityForm
            onCaseAnalyzed={handleCaseAnalyzed}
            onSelectDemoCase={handleSelectDemoCase}
            isLoading={isLoading}
          />
        )}

        {currentTab === 'report' && (
          activeCase ? (
            <InvestigationReportView
              caseRecord={activeCase}
              onEscalateCase={handleEscalateCase}
              onOpenReviewModal={(c) => setSelectedReviewCase(c)}
            />
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
              <FileText className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No active investigation loaded</h3>
              <p className="text-xs text-slate-500">
                Submit an offer to investigate or select a demo case from the Verify tab.
              </p>
              <button
                onClick={() => setCurrentTab('verify')}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
              >
                Go to Verify Opportunity
              </button>
            </div>
          )
        )}

        {currentTab === 'cases' && (
          <CaseHistoryView
            cases={cases}
            onSelectCase={handleSelectCase}
            onOpenReviewModal={(c) => setSelectedReviewCase(c)}
          />
        )}

        {currentTab === 'reviewer' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    Placement Cell Faculty & Reviewer Dashboard
                  </span>
                  {pendingReviewCount > 0 && (
                    <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                      {pendingReviewCount} Action Required
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-1">
                  Human-in-the-Loop Decision Console
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Inspect ambiguous cases, review evidence chains, and record official institutional determinations.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Reviewer:</span>
                <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                  Prof. R. Venkatesh (Placement Director)
                </span>
              </div>
            </div>

            <CaseHistoryView
              cases={cases.filter((c) => c.reviewStatus === 'PENDING_REVIEW' || c.review)}
              onSelectCase={handleSelectCase}
              onOpenReviewModal={(c) => setSelectedReviewCase(c)}
            />
          </div>
        )}

        {currentTab === 'intelligence' && (
          <ScamIntelligenceView
            patterns={scamPatterns}
            entities={suspiciousEntities}
            onAddEntity={handleAddScamEntity}
          />
        )}

        {currentTab === 'analytics' && analyticsData && (
          <InstitutionalAnalyticsView data={analyticsData} />
        )}

        {currentTab === 'chatbot' && (
          <InvestigationChatbot
            currentCase={activeCase}
            onSelectCase={handleSelectCase}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsScoringView
            weights={scoringWeights}
            onUpdateWeights={handleUpdateWeights}
          />
        )}
      </main>

      {/* Reviewer Action Modal */}
      {selectedReviewCase && (
        <ReviewerModal
          caseRecord={selectedReviewCase}
          onClose={() => setSelectedReviewCase(null)}
          onSubmitReview={handleSubmitReview}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">OFFERGUARD</span>
            <span>·</span>
            <span>Verify Before You Apply.</span>
            <span>·</span>
            <span className="font-mono text-[11px]">Deterministic Risk Scoring + Evidence Graph</span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span>AICTE Policy Aligned</span>
            <span>·</span>
            <span>Data Minimization Enforced</span>
            <span>·</span>
            <button
              onClick={() => setCurrentTab('settings')}
              className="text-indigo-600 hover:underline font-semibold"
            >
              Risk Engine Weights
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
