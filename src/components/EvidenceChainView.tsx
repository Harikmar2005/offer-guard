import React from 'react';
import {
  Building2,
  Globe,
  Mail,
  UserCheck,
  Briefcase,
  FileCheck2,
  CreditCard,
  CheckCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ArrowDown,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { EvidenceNode } from '../types';

interface EvidenceChainViewProps {
  chain: EvidenceNode[];
}

export const EvidenceChainView: React.FC<EvidenceChainViewProps> = ({ chain }) => {
  const getStepIcon = (step: EvidenceNode['step']) => {
    switch (step) {
      case 'CLAIMED_COMPANY':
        return <Building2 className="w-4 h-4" />;
      case 'WEBSITE':
        return <Globe className="w-4 h-4" />;
      case 'EMAIL_DOMAIN':
        return <Mail className="w-4 h-4" />;
      case 'RECRUITER':
        return <UserCheck className="w-4 h-4" />;
      case 'JOB_POSTING':
        return <Briefcase className="w-4 h-4" />;
      case 'OFFER_LETTER':
        return <FileCheck2 className="w-4 h-4" />;
      case 'PAYMENT_REQUEST':
        return <CreditCard className="w-4 h-4" />;
      case 'CONSISTENCY':
        return <ShieldCheck className="w-4 h-4" />;
      default:
        return <Building2 className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: EvidenceNode['status']) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            VERIFIED
          </span>
        );
      case 'MISMATCH':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
            <XCircle className="w-3 h-3 text-rose-600" />
            MISMATCH
          </span>
        );
      case 'SUSPICIOUS':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            SUSPICIOUS
          </span>
        );
      case 'UNAVAILABLE':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
            UNAVAILABLE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
            <HelpCircle className="w-3 h-3 text-slate-500" />
            UNVERIFIED
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-indigo-600" />
            Evidence Chain / Graph
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Step-by-step forensic correlation explaining how OfferGuard arrived at this risk posture.
          </p>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
          {chain.length} Verification Nodes
        </span>
      </div>

      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
        {chain.map((node, index) => {
          const isDanger = node.status === 'MISMATCH' || node.status === 'SUSPICIOUS';
          const isVerified = node.status === 'VERIFIED';

          return (
            <div
              key={node.id || index}
              className={`relative bg-white border rounded-xl p-4 transition-all shadow-xs ${
                isDanger
                  ? 'border-rose-200 hover:border-rose-300'
                  : isVerified
                  ? 'border-emerald-200 hover:border-emerald-300'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Timeline Indicator Dot */}
              <div
                className={`absolute -left-[27px] top-4 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                  isDanger
                    ? 'border-rose-600 text-rose-600'
                    : isVerified
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-slate-400 text-slate-400'
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    isDanger ? 'bg-rose-600' : isVerified ? 'bg-emerald-600' : 'bg-slate-400'
                  }`}
                />
              </div>

              {/* Node Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1.5 rounded-md ${
                      isDanger
                        ? 'bg-rose-50 text-rose-700'
                        : isVerified
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {getStepIcon(node.step)}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
                      {node.step.replace(/_/g, ' ')}
                    </span>
                    <h5 className="text-xs font-bold text-slate-900 leading-none mt-0.5">
                      {node.signal}
                    </h5>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {getStatusBadge(node.status)}
                  {node.impactScore > 0 && (
                    <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                      +{node.impactScore} risk pts
                    </span>
                  )}
                </div>
              </div>

              {/* Explanation & Source Details */}
              <div className="pt-2.5 space-y-1.5 text-xs">
                <p className="text-slate-700 leading-relaxed font-normal">
                  {node.explanation}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400 font-mono">
                  <span>Source: <strong className="text-slate-600">{node.source}</strong></span>
                  <span>·</span>
                  <span>Confidence: <strong className="text-slate-600">{Math.round(node.confidence * 100)}%</strong></span>
                  {node.isFictionalDemoData && (
                    <>
                      <span>·</span>
                      <span className="text-amber-600 bg-amber-50 px-1 rounded">Fictional Demo Signal</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
