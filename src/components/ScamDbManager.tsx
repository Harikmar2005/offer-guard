import React, { useState } from 'react';
import {
  Database,
  Search,
  Plus,
  Filter,
  Download,
  ShieldAlert,
  Building,
  CreditCard,
  Mail,
  Phone,
  Globe,
  Tag,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { ScamEntity } from '../types';

interface ScamDbManagerProps {
  entities: ScamEntity[];
  onAddEntity: (newEntity: Omit<ScamEntity, 'id' | 'matchCount' | 'dateAdded'>) => Promise<void>;
}

export const ScamDbManager: React.FC<ScamDbManagerProps> = ({
  entities,
  onAddEntity,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New entity form state
  const [newType, setNewType] = useState<ScamEntity['entity_type']>('upi_id');
  const [newValue, setNewValue] = useState('');
  const [newEvidence, setNewEvidence] = useState('');
  const [newRiskLevel, setNewRiskLevel] = useState<ScamEntity['risk_level']>('HIGH');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredEntities = entities.filter((item) => {
    const matchesSearch =
      item.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.evidence.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.createdBy.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || item.entity_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleCreateEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddEntity({
        entity_type: newType,
        value: newValue.trim(),
        evidence: newEvidence.trim() || 'Directly flagged by institutional placement cell.',
        risk_level: newRiskLevel,
        createdBy: 'Prof. R. Venkatesh (Placement Director)',
      });
      setShowAddModal(false);
      setNewValue('');
      setNewEvidence('');
    } catch (err) {
      console.error(err);
      alert('Error adding scam entity');
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportAsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(entities, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `SafeIntern_Scam_Database_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getEntityIcon = (type: ScamEntity['entity_type']) => {
    switch (type) {
      case 'upi_id':
        return <CreditCard className="w-4 h-4 text-rose-600" />;
      case 'company':
        return <Building className="w-4 h-4 text-purple-600" />;
      case 'email':
        return <Mail className="w-4 h-4 text-blue-600" />;
      case 'phone':
        return <Phone className="w-4 h-4 text-amber-600" />;
      case 'domain':
        return <Globe className="w-4 h-4 text-emerald-600" />;
      default:
        return <Tag className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-600" />
            Central Institutional Scam Database
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-referenced by SafeIntern bot during every student offer submission. All placement cell blacklists feed directly into this registry.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={exportAsJson}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export Registry
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Scam Entity
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by company name, UPI ID, phone, pattern, or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-500 font-medium pl-1">Type:</span>
          {[
            { id: 'all', label: 'All Entities' },
            { id: 'upi_id', label: 'UPI IDs' },
            { id: 'company', label: 'Companies' },
            { id: 'keyword_pattern', label: 'Patterns' },
            { id: 'email', label: 'Emails' },
            { id: 'phone', label: 'Phones' },
            { id: 'domain', label: 'Domains' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                typeFilter === tab.id
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Entities Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">Flagged Value / Pattern</th>
                <th className="py-3 px-4">Evidence / Reason</th>
                <th className="py-3 px-4">Intercepts</th>
                <th className="py-3 px-4">Added By</th>
                <th className="py-3 px-4 text-right">Date Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredEntities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No scam entities found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredEntities.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-800 capitalize">
                        {getEntityIcon(item.entity_type)}
                        {item.entity_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-semibold text-rose-700 bg-rose-50/70 border border-rose-200/80 px-2 py-0.5 rounded text-[11px]">
                        {item.value}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-600" title={item.evidence}>
                      {item.evidence}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                        {item.matchCount} checks
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-[11px]">
                      {item.createdBy}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-400">
                      {item.dateAdded}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Entity Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Add Entity to Central Blacklist
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="upi_id">UPI ID (e.g. name@okaxis)</option>
                  <option value="company">Company / Startup Name</option>
                  <option value="keyword_pattern">Keyword / Extortion Pattern</option>
                  <option value="email">Email Address / Domain</option>
                  <option value="phone">Phone / WhatsApp Number</option>
                  <option value="domain">Website URL / Domain</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Target Value (Exact string to flag)
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    newType === 'upi_id'
                      ? 'scammer@okaxis'
                      : newType === 'company'
                      ? 'FakeCorp Solutions Ltd'
                      : 'police clearance certificate'
                  }
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Evidence / Case Reference
                </label>
                <textarea
                  rows={3}
                  placeholder="E.g., Demanded ₹2,000 for fake laptop bond. Reported by 2 students from CSE."
                  value={newEvidence}
                  onChange={(e) => setNewEvidence(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Risk Severity</label>
                <select
                  value={newRiskLevel}
                  onChange={(e) => setNewRiskLevel(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="HIGH">HIGH (Immediate auto-flag to RED)</option>
                  <option value="MEDIUM">MEDIUM (Raises score by 35 points)</option>
                  <option value="LOW">LOW (Informational flag)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Saving...' : 'Add to Blacklist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
