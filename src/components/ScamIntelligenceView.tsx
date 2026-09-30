import React, { useState } from 'react';
import {
  Database,
  Search,
  Plus,
  Download,
  AlertTriangle,
  Building,
  CreditCard,
  Mail,
  Phone,
  Globe,
  Tag,
  ShieldAlert,
  ShieldCheck,
  Check,
  Info,
} from 'lucide-react';
import { ScamPatternEntity, SuspiciousEntity } from '../types';

interface ScamIntelligenceViewProps {
  patterns: ScamPatternEntity[];
  entities: SuspiciousEntity[];
  onAddEntity: (entity: Omit<SuspiciousEntity, 'id' | 'dateAdded' | 'matchCount'>) => Promise<void>;
}

export const ScamIntelligenceView: React.FC<ScamIntelligenceViewProps> = ({
  patterns,
  entities,
  onAddEntity,
}) => {
  const [activeTab, setActiveTab] = useState<'patterns' | 'entities'>('patterns');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New entity form state
  const [newType, setNewType] = useState<SuspiciousEntity['type']>('UPI_ID');
  const [newValue, setNewValue] = useState('');
  const [newClaimed, setNewClaimed] = useState('');
  const [newEvidence, setNewEvidence] = useState('');
  const [newRisk, setNewRisk] = useState<SuspiciousEntity['riskLevel']>('HIGH');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredPatterns = patterns.filter(
    (p) =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.indicators.some((ind) => ind.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredEntities = entities.filter(
    (e) =>
      e.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.evidence.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.claimedEntity?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddEntity({
        type: newType,
        value: newValue.trim(),
        claimedEntity: newClaimed.trim() || newValue.trim(),
        evidence: newEvidence.trim() || 'Directly submitted to OfferGuard Intelligence Registry.',
        riskLevel: newRisk,
        isFictionalDemoData: false,
      });
      setShowAddModal(false);
      setNewValue('');
      setNewClaimed('');
      setNewEvidence('');
    } catch (err) {
      console.error(err);
      alert('Error adding suspicious entity');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ patterns, entities }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `OfferGuard_Scam_Intelligence_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getEntityIcon = (type: SuspiciousEntity['type']) => {
    switch (type) {
      case 'UPI_ID':
        return <CreditCard className="w-4 h-4 text-rose-600" />;
      case 'COMPANY':
        return <Building className="w-4 h-4 text-purple-600" />;
      case 'EMAIL':
        return <Mail className="w-4 h-4 text-blue-600" />;
      case 'PHONE':
        return <Phone className="w-4 h-4 text-amber-600" />;
      case 'DOMAIN':
        return <Globe className="w-4 h-4 text-emerald-600" />;
      default:
        return <Tag className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600" />
              Scam Intelligence Registry
            </h3>
            <span className="text-[10px] font-mono text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
              Contains Fictional Demo Data
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Centralized fraud vectors, known extortion patterns, and cross-referenced suspicious handles across college placement networks.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportJson}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Threat Entity
          </button>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('patterns')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              activeTab === 'patterns' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Modus Operandi Patterns ({patterns.length})
          </button>
          <button
            onClick={() => setActiveTab('entities')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              activeTab === 'entities' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Suspicious Identifiers ({entities.length})
          </button>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search patterns, UPI handles, companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* TAB 1: Modus Operandi Patterns */}
      {activeTab === 'patterns' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPatterns.map((pat) => (
            <div
              key={pat.id}
              className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {pat.category.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                    {pat.riskLevel}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-slate-900 leading-snug">
                  {pat.title}
                </h4>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {pat.description}
                </p>

                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Observable Indicators
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {pat.indicators.map((ind, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-mono text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded"
                      >
                        {ind}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Intercepts: <strong className="text-slate-900">{pat.reportCount} cases</strong></span>
                <span>Logged: {pat.dateLogged}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: Suspicious Entities */}
      {activeTab === 'entities' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Entity Type</th>
                  <th className="py-3 px-4">Value / Handle</th>
                  <th className="py-3 px-4">Claimed Employer</th>
                  <th className="py-3 px-4">Evidence Log</th>
                  <th className="py-3 px-4">Risk</th>
                  <th className="py-3 px-4 text-right">Intercepts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredEntities.map((ent) => (
                  <tr key={ent.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-800 capitalize">
                        {getEntityIcon(ent.type)}
                        {ent.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-rose-700 bg-rose-50/50">
                      {ent.value}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {ent.claimedEntity || 'N/A'}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-600" title={ent.evidence}>
                      {ent.evidence}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[11px] text-rose-600">
                      {ent.riskLevel}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {ent.matchCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Entity Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Add Threat Identifier to Registry
              </h4>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-semibold"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateEntity} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Entity Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="UPI_ID">UPI Handle (VPA)</option>
                  <option value="COMPANY">Company / Organization</option>
                  <option value="EMAIL">Email Address / Domain</option>
                  <option value="DOMAIN">Website URL</option>
                  <option value="PHONE">Phone / WhatsApp</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Value (Exact match)</label>
                <input
                  type="text"
                  required
                  placeholder={newType === 'UPI_ID' ? 'scammer@okaxis' : 'example.com'}
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Claimed Employer Name</label>
                <input
                  type="text"
                  placeholder="ApexCyber Infotech"
                  value={newClaimed}
                  onChange={(e) => setNewClaimed(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Evidence & Incident Report</label>
                <textarea
                  rows={3}
                  placeholder="Reported by students for advance onboarding fee extortion..."
                  value={newEvidence}
                  onChange={(e) => setNewEvidence(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Saving...' : 'Add to Registry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
