import React from 'react';
import {
  TrendingUp,
  ShieldAlert,
  ShieldCheck,
  IndianRupee,
  Users,
  Clock,
  PieChart as PieIcon,
  BarChart2,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface InstitutionalAnalyticsProps {
  data: {
    metrics: {
      totalCases: number;
      verifiedOffers: number;
      lowRisk: number;
      mediumRisk: number;
      highRisk: number;
      criticalRisk: number;
      pendingReview: number;
      totalMoneyProtectedInr: number;
      scamPatternsIdentified: number;
      averageReviewTurnaroundHours: number;
    };
    monthlyTrends: Array<{ month: string; totalChecks: number; highRisk: number; verified: number }>;
    scamCategoryDistribution: Array<{ name: string; value: number; color: string }>;
  };
}

export const InstitutionalAnalyticsView: React.FC<InstitutionalAnalyticsProps> = ({ data }) => {
  const { metrics, monthlyTrends, scamCategoryDistribution } = data;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Evaluated</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 tabular-nums">
            {metrics.totalCases}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Offers investigated across season</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Critical Intercepts</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black font-mono text-rose-600 tabular-nums">
            {metrics.criticalRisk + metrics.highRisk}
          </div>
          <p className="text-[11px] text-rose-600 mt-1">Flagged before student paid</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Student Funds Saved</span>
            <IndianRupee className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-700 tabular-nums">
            ₹{metrics.totalMoneyProtectedInr.toLocaleString()}
          </div>
          <p className="text-[11px] text-emerald-600 mt-1">Estimated direct savings</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Review Turnaround</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black font-mono text-indigo-600 tabular-nums">
            {metrics.averageReviewTurnaroundHours} hrs
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Faculty decision speed</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recharts Monthly Investigation Volume & High Risk Trends */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-indigo-600" />
                Monthly Verification Volume vs Risk Intercepts
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Seasonal surge correlates with pre-final semester internship deadlines.
              </p>
            </div>
            <span className="text-[10px] font-mono text-slate-400">2026 Season</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="totalChecks" name="Total Evaluated" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="verified" name="Verified Safe" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="highRisk" name="High Risk Intercepts" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recharts Pie: Scam Category Distribution */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <PieIcon className="w-4 h-4 text-indigo-600" />
                Dominant Extortion Vectors
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Distribution of identified malicious recruitment methods.
              </p>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={scamCategoryDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {scamCategoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                  formatter={(val: any) => [`${val}%`, 'Share']}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
