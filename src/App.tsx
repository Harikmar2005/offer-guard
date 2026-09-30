import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  MessageSquare,
  LayoutDashboard,
  ShieldAlert,
  Database,
  BarChart3,
  HelpCircle,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { CaseRecord, ScamEntity, AnalyticsMetrics } from './types';
import { StudentBotSimulator } from './components/StudentBotSimulator';
import { PlacementDashboard } from './components/PlacementDashboard';

export default function App() {
  const [currentView, setCurrentView] = useState<'student_bot' | 'placement_dashboard'>('student_bot');
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [scamEntities, setScamEntities] = useState<ScamEntity[]>([]);
  const [metrics, setMetrics] = useState<AnalyticsMetrics>({
    totalChecks: 152,
    activeCases: 3,
    highRiskIntercepted: 54,
    amberCautionFlags: 32,
    verifiedSafeOffers: 66,
    resolvedByReviewers: 45,
    totalMoneyProtectedInr: 147500,
    scamEntitiesTracked: 9,
    averageReviewTimeHours: 2.4,
  });
  const [isLoading, setIsLoading] = useState(true);

  const officerAvatar = '/src/assets/images/placement_officer_avatar_1790747894553.jpg';

  const fetchData = async () => {
    try {
      const [casesRes, scamRes, analyticsRes] = await Promise.all([
        fetch('/api/cases'),
        fetch('/api/scam-database'),
        fetch('/api/analytics'),
      ]);

      if (casesRes.ok) {
        const cData = await casesRes.json();
        setCases(cData.cases || []);
      }
      if (scamRes.ok) {
        const sData = await scamRes.json();
        setScamEntities(sData.scamEntities || []);
      }
      if (analyticsRes.ok) {
        const aData = await analyticsRes.json();
        if (aData.metrics) setMetrics(aData.metrics);
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCaseCreated = (newCase: CaseRecord) => {
    setCases((prev) => [newCase, ...prev]);
    setMetrics((prev) => ({
      ...prev,
      totalChecks: prev.totalChecks + 1,
      activeCases: prev.activeCases + 1,
      highRiskIntercepted: newCase.risk_level === 'RED' ? prev.highRiskIntercepted + 1 : prev.highRiskIntercepted,
    }));
  };

  const handleUpdateCase = (updated: CaseRecord) => {
    setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleAddScamEntity = async (
    entity: Omit<ScamEntity, 'id' | 'matchCount' | 'dateAdded'>
  ) => {
    const res = await fetch('/api/scam-database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entity),
    });
    if (res.ok) {
      const data = await res.json();
      setScamEntities((prev) => [data.scamEntity, ...prev]);
      setMetrics((prev) => ({ ...prev, scamEntitiesTracked: prev.scamEntitiesTracked + 1 }));
    }
  };

  const pendingEscalations = cases.filter((c) => c.status === 'escalated_pending_review').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Bar Contract: 3 zones */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <a href="/" className="text-base font-bold tracking-tight text-slate-900">
              SafeIntern Check Bot
            </a>
          </div>

          {/* Zone 2: Navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setCurrentView('student_bot')}
              className={`transition-colors flex items-center gap-1.5 py-1 ${
                currentView === 'student_bot'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Student Chatbot
            </button>

            <button
              onClick={() => setCurrentView('placement_dashboard')}
              className={`transition-colors flex items-center gap-1.5 py-1 ${
                currentView === 'placement_dashboard'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Placement Cell Dashboard
              {pendingEscalations > 0 && (
                <span className="font-mono text-[10px] bg-rose-600 text-white font-bold px-1.5 py-0.2 rounded-full">
                  {pendingEscalations}
                </span>
              )}
            </button>
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-2.5">
            {currentView === 'student_bot' ? (
              <button
                onClick={() => setCurrentView('placement_dashboard')}
                className="px-3.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Placement Officer View</span>
                {pendingEscalations > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                )}
              </button>
            ) : (
              <button
                onClick={() => setCurrentView('student_bot')}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Test Student Chatbot</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Viewport Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {currentView === 'student_bot' ? (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div>
                <h1 className="text-sm font-bold text-slate-900">
                  Student Verification Simulator (WhatsApp & Telegram)
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Forward any recruiter chat, offer letter, or UPI fee request to see instant explainable risk triage and escalate directly to your placement officer.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs font-semibold text-slate-600 font-mono">
                  Protected: ₹{metrics.totalMoneyProtectedInr.toLocaleString()}
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-xs font-semibold text-emerald-700 font-mono">
                  {metrics.highRiskIntercepted} Scams Intercepted
                </span>
              </div>
            </div>

            <StudentBotSimulator
              onCaseCreated={handleCaseCreated}
              activeCases={cases}
            />
          </div>
        ) : (
          <PlacementDashboard
            cases={cases}
            scamEntities={scamEntities}
            metrics={metrics}
            onRefreshData={fetchData}
            onUpdateCase={handleUpdateCase}
            onAddScamEntity={handleAddScamEntity}
            avatarUrl={officerAvatar}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">SafeIntern Check Bot</span>
            <span>·</span>
            <span>AICTE & UGC Policy Aligned</span>
            <span>·</span>
            <span className="font-mono">Govt College of Technology, Coimbatore</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>Zero-Pill Discipline</span>
            <span>·</span>
            <span>Student Privacy Protected</span>
            <span>·</span>
            <button
              onClick={() => setCurrentView(currentView === 'student_bot' ? 'placement_dashboard' : 'student_bot')}
              className="text-indigo-600 hover:underline font-semibold"
            >
              Toggle {currentView === 'student_bot' ? 'Faculty Portal' : 'Student Bot'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
