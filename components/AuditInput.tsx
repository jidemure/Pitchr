'use client';

import React, { useState } from 'react';
import {
  Globe2,
  ArrowRight,
  Sparkles,
  Zap,
  Building2,
  CheckCircle2
} from 'lucide-react';

interface AuditInputProps {
  onStartAudit: (url: string, industry?: string) => Promise<void>;
  isLoading: boolean;
}

export const AuditInput: React.FC<AuditInputProps> = ({ onStartAudit, isLoading }) => {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || isLoading) return;
    onStartAudit(url.trim());
  };

  return (
    <section className="w-full flex flex-col items-center justify-center min-h-[60vh] py-8 sm:py-16 px-3 sm:px-6">
      <div className="w-full max-w-3xl mx-auto text-center space-y-6 sm:space-y-8">
        {/* Subtle Eyebrow */}
        <div className="inline-flex items-center gap-2 text-xs font-mono text-slate-500 tracking-wider">
          <span className="text-orange-600 font-semibold">WEBSITE AUDIT SCANNER</span>
          <span aria-hidden="true" className="text-slate-300">/</span>
          <span>GEMINI 3.8 FLASH</span>
        </div>

        {/* H1 strictly locked to 2 lines with refined font-medium weight */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.65rem] font-medium tracking-tight text-slate-900 font-heading leading-tight sm:leading-[1.25] max-w-2xl mx-auto">
          <span className="block">Turn Outdated Websites Into</span>
          <span className="block font-semibold text-slate-900 mt-1 sm:mt-1.5">
            High-Converting Cold Outreach
          </span>
        </h1>

        <p className="mt-4 sm:mt-6 text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl mx-auto">
          Enter any website URL to automatically audit design, mobile, speed, and SEO flaws, turning diagnostic findings into personalized cold email proposals.
        </p>

        {/* Clean, Focused URL Input Box */}
        <div className="w-full max-w-2xl mx-auto pt-2">
          <form
            onSubmit={handleSubmit}
            className="p-1.5 sm:p-2 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-stretch gap-2 transition-all focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20"
          >
            <div className="relative flex-1 flex items-center">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Globe2 className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter website URL (e.g. guthriekitchenandbath.com)"
                disabled={isLoading}
                className="w-full pl-10 pr-3 py-3 bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none text-xs sm:text-sm min-h-[46px]"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm whitespace-nowrap min-h-[46px] shrink-0"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <span>Scan Website</span>
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Minimal Feature Highlights */}
        <div className="pt-8 sm:pt-12 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-2xl mx-auto">
          <div className="p-3.5 rounded-xl border border-slate-200/70 bg-white/80 text-xs space-y-1">
            <span className="font-mono text-[10px] text-orange-600 font-semibold uppercase block">Live DOM Inspection</span>
            <p className="text-slate-500">Detects mobile viewport, uncompressed images, and SEO tags.</p>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200/70 bg-white/80 text-xs space-y-1">
            <span className="font-mono text-[10px] text-orange-600 font-semibold uppercase block">Gemini Visual Critique</span>
            <p className="text-slate-500">Evaluates aesthetic age, visual hierarchy, and conversion leaks.</p>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200/70 bg-white/80 text-xs space-y-1">
            <span className="font-mono text-[10px] text-orange-600 font-semibold uppercase block">4-Touch Pitch Studio</span>
            <p className="text-slate-500">Generates ready-to-send 4-touch sequences and saves to CRM.</p>
          </div>
        </div>
      </div>
    </section>
  );
};
