import React, { useState } from 'react';
import {
  Sliders,
  ShieldAlert,
  Save,
  RotateCcw,
  CheckCircle,
  HelpCircle,
  Info,
} from 'lucide-react';
import { ScoringWeights } from '../types';

interface SettingsScoringViewProps {
  weights: ScoringWeights;
  onUpdateWeights: (newWeights: ScoringWeights) => Promise<void>;
}

export const SettingsScoringView: React.FC<SettingsScoringViewProps> = ({
  weights,
  onUpdateWeights,
}) => {
  const [localWeights, setLocalWeights] = useState<ScoringWeights>(weights);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleChange = (key: keyof ScoringWeights, val: number) => {
    setLocalWeights((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleResetDefaults = () => {
    setLocalWeights({
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
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdateWeights(localWeights);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Error updating scoring weights');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                Deterministic Risk Engine Configuration (Requirement 13)
              </h3>
              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                Deterministic Policy
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              OfferGuard enforces a deterministic rule-based risk calculation. The LLM does NOT decide the final score. Adjust the policy weights below to reflect institutional risk tolerance.
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
        </div>

        {saveSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            Scoring weights updated successfully across the investigation engine.
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                key: 'registration_fee',
                title: 'Registration / Onboarding Fee Demand',
                desc: 'Advance money required before job/internship joining date.',
                max: 30,
              },
              {
                key: 'personal_upi',
                title: 'Payment to Personal / Virtual UPI Handle',
                desc: 'Directing money to personal VPA instead of corporate escrow.',
                max: 30,
              },
              {
                key: 'recruiter_domain_mismatch',
                title: 'Recruiter Email Domain Mismatch',
                desc: 'Corporate recruiter using generic Gmail/Yahoo freemail.',
                max: 25,
              },
              {
                key: 'company_inconsistency',
                title: 'Company Information Inconsistency',
                desc: 'Contradictions between claimed website, ROC entity, and offer terms.',
                max: 25,
              },
              {
                key: 'urgency_language',
                title: 'Artificial Urgency & Coercive Language',
                desc: 'Imposing strict deadlines (e.g. 30-min timers) to force payment.',
                max: 20,
              },
              {
                key: 'sensitive_document_request',
                title: 'Sensitive Identity Document Harvesting',
                desc: 'Demanding Aadhaar/PAN cards over unencrypted communication.',
                max: 20,
              },
              {
                key: 'unrealistic_salary',
                title: 'Unrealistic Compensation vs Zero Assessment',
                desc: 'Disproportionately high stipend without any technical evaluation.',
                max: 15,
              },
              {
                key: 'suspicious_domain',
                title: 'Suspicious Domain / Lookalike URL',
                desc: 'Typosquatted domains (.xyz, spoofing enterprise career portals).',
                max: 25,
              },
              {
                key: 'unverifiable_company',
                title: 'Unverifiable / Newly Registered Startup',
                desc: 'Entity with zero public incorporation history or ROC filing.',
                max: 20,
              },
            ].map((item) => {
              const val = localWeights[item.key as keyof ScoringWeights];
              return (
                <div
                  key={item.key}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{item.title}</span>
                    <span className="font-mono font-bold text-indigo-600 bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px]">
                      +{val} pts
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
                  <div className="flex items-center gap-3 pt-1">
                    <input
                      type="range"
                      min={0}
                      max={item.max}
                      value={val}
                      onChange={(e) =>
                        handleChange(item.key as keyof ScoringWeights, parseInt(e.target.value, 10))
                      }
                      className="flex-1 accent-indigo-600 cursor-pointer"
                    />
                    <span className="font-mono text-[11px] text-slate-400 w-8 text-right">
                      {val}/{item.max}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Risk Level Bands Guide */}
          <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-2 text-xs">
            <h4 className="font-bold text-indigo-950 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-indigo-600" />
              Calibrated Risk Level Thresholds
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="p-2 bg-white rounded border border-indigo-100">
                <span className="font-bold text-emerald-700">0 – 19: LOW</span>
                <p className="text-slate-500 mt-0.5">Verified or zero-risk</p>
              </div>
              <div className="p-2 bg-white rounded border border-indigo-100">
                <span className="font-bold text-amber-700">20 – 39: MEDIUM</span>
                <p className="text-slate-500 mt-0.5">Ambiguous signals</p>
              </div>
              <div className="p-2 bg-white rounded border border-indigo-100">
                <span className="font-bold text-rose-600">40 – 69: HIGH</span>
                <p className="text-slate-500 mt-0.5">High-confidence red flags</p>
              </div>
              <div className="p-2 bg-white rounded border border-indigo-100">
                <span className="font-bold text-rose-700">70 – 100: CRITICAL</span>
                <p className="text-slate-500 mt-0.5">Confirmed extortion</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Updating Weights...' : 'Save Scoring Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
