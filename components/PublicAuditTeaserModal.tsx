'use client';

import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  ArrowRight,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { AuditReport } from '@/lib/types';

interface PublicAuditTeaserModalProps {
  report: AuditReport | null;
  onClose: () => void;
}

export const PublicAuditTeaserModal: React.FC<PublicAuditTeaserModalProps> = ({
  report,
  onClose,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!report) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  let serializedParam = '';
  try {
    if (typeof window !== 'undefined') {
      serializedParam = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(report)))));
    }
  } catch (err) {
    console.warn('Serialization error:', err);
  }

  const publicUrl = serializedParam
    ? `${origin}/audit/${report.id}?data=${serializedParam}`
    : `${origin}/audit/${report.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy teaser link:', err);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Public Prospect Teaser Preview" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 sm:pb-4 border-b border-slate-100 gap-2">
          <div>
            <span className="text-[11px] font-mono font-medium text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md">
              Prospect Teaser Preview
            </span>
            <h3 className="text-base sm:text-lg font-medium text-slate-900 font-heading mt-1 leading-snug">
              What your prospect sees when clicking your email link
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Link Copy Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-xs font-mono text-slate-600 truncate flex-1 px-2 py-1">
            {publicUrl}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 text-xs font-semibold rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors shadow-xs shrink-0 min-h-[38px] sm:min-h-0"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Link for Cold Email'}</span>
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors shrink-0"
              title="Open teaser in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* The Client-Facing Card Preview Box */}
        <div className="border border-slate-200 rounded-2xl p-4 sm:p-6 bg-gradient-to-b from-slate-50/50 to-white shadow-xs space-y-4">
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] sm:text-xs uppercase font-mono tracking-wider text-slate-500 block">
                Official Redesign Audit
              </span>
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 font-heading truncate max-w-[200px] sm:max-w-md">
                {report.companyName}
              </h2>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] sm:text-xs text-slate-500 font-mono block">Audit Score</span>
              <span className="text-xl sm:text-2xl font-medium font-mono text-rose-600 tabular-nums">
                {report.scores.overall}/100
              </span>
            </div>
          </div>

          {/* Quick 4 Metrics Mini Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2 rounded-lg bg-white border border-slate-200">
              <span className="text-[10px] sm:text-[11px] text-slate-500 block">Design</span>
              <span className="text-xs sm:text-sm font-bold font-mono text-slate-900">{report.scores.design}%</span>
            </div>
            <div className="p-2 rounded-lg bg-white border border-slate-200">
              <span className="text-[10px] sm:text-[11px] text-slate-500 block">Speed</span>
              <span className="text-xs sm:text-sm font-bold font-mono text-slate-900">{report.scores.speed}%</span>
            </div>
            <div className="p-2 rounded-lg bg-white border border-slate-200">
              <span className="text-[10px] sm:text-[11px] text-slate-500 block">Mobile</span>
              <span className="text-xs sm:text-sm font-bold font-mono text-slate-900">{report.scores.mobile}%</span>
            </div>
            <div className="p-2 rounded-lg bg-white border border-slate-200">
              <span className="text-[10px] sm:text-[11px] text-slate-500 block">SEO</span>
              <span className="text-xs sm:text-sm font-bold font-mono text-slate-900">{report.scores.seo}%</span>
            </div>
          </div>

          {/* Top 3 Issues */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              Top Conversion Bottlenecks Identified:
            </span>
            {report.issues.slice(0, 3).map((issue, idx) => (
              <div
                key={issue.id}
                className="p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-1"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-slate-900 font-heading truncate">
                    {idx + 1}. {issue.title}
                  </span>
                  <span className="font-mono text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded shrink-0">
                    {issue.severity}
                  </span>
                </div>
                <p className="text-slate-600 leading-normal text-[11px] sm:text-xs">
                  {issue.description}
                </p>
                <p className="text-orange-700 font-medium pt-0.5 text-[11px] sm:text-xs">
                  💡 Fix: {issue.recommendation}
                </p>
              </div>
            ))}
          </div>

          {/* Client Action Callout */}
          <div className="p-4 rounded-xl bg-[#191C21] text-white text-center space-y-2 shadow-xs">
            <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-orange-400 block">
              Ready to recover lost mobile leads?
            </span>
            <h4 className="text-xs sm:text-sm font-bold font-heading">
              Request Your Free 2-Minute Wireframe Walkthrough
            </h4>
            <p className="text-[11px] sm:text-xs text-slate-300 max-w-md mx-auto">
              Our studio prepared a modern, high-speed mobile prototype tailored specifically for {report.companyName}.
            </p>
            <div className="pt-1">
              <span className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs rounded-lg shadow-xs w-full sm:w-auto">
                <span>Reply to Our Email to View Prototype</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-1">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors min-h-[38px]"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
