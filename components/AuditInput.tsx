'use client';

import React, { useState } from 'react';
import {
  Globe2,
  ArrowRight,
  User,
  Mail,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface AuditInputProps {
  onStartAudit: (
    url: string,
    industry?: string,
    prospectName?: string,
    prospectEmail?: string
  ) => Promise<void>;
  isLoading: boolean;
}

export const AuditInput: React.FC<AuditInputProps> = ({ onStartAudit, isLoading }) => {
  const [url, setUrl] = useState('');
  const [prospectName, setProspectName] = useState('');
  const [prospectEmail, setProspectEmail] = useState('');
  const [showProspectFields, setShowProspectFields] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || isLoading) return;
    onStartAudit(
      url.trim(),
      undefined,
      prospectName.trim() || undefined,
      prospectEmail.trim() || undefined
    );
  };

  return (
    <section className="w-full flex flex-col items-center justify-center min-h-[60vh] py-8 sm:py-16 px-3 sm:px-6">
      <div className="w-full max-w-3xl mx-auto text-center space-y-6 sm:space-y-8">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 text-xs font-mono text-slate-500 tracking-wider">
          <span className="text-orange-600 font-semibold">WEBSITE AUDIT SCANNER</span>
          <span aria-hidden="true" className="text-slate-300">/</span>
          <span>PROSPECT-FIRST EXTRACTION</span>
        </div>

        {/* H1 locked to 2 lines with refined weight */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.65rem] font-medium tracking-tight text-slate-900 font-heading leading-tight sm:leading-[1.25] max-w-2xl mx-auto">
          <span className="block">Turn Outdated Websites Into</span>
          <span className="block font-semibold text-slate-900 mt-1 sm:mt-1.5">
            High-Converting Cold Outreach
          </span>
        </h1>

        <p className="mt-4 sm:mt-6 text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl mx-auto">
          Enter any website URL to automatically audit design, mobile, speed, and SEO flaws, extract key decision makers, and generate bespoke cold email proposals.
        </p>

        {/* Clean, Focused URL Input Box with Prospect-First Option */}
        <div className="w-full max-w-2xl mx-auto pt-2">
          <form
            onSubmit={handleSubmit}
            className="p-2 sm:p-2.5 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col gap-2 transition-all focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20"
          >
            {/* Primary Website URL Row */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
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
            </div>

            {/* Target Prospect Disclosure Trigger */}
            <div className="pt-1 px-1 flex items-center justify-between text-left">
              <button
                type="button"
                onClick={() => setShowProspectFields(!showProspectFields)}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-orange-600 transition-colors font-medium"
              >
                <User className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                <span>
                  {showProspectFields ? 'Hide specific prospect fields' : 'Know who to reach? Target specific decision maker (Optional)'}
                </span>
                {showProspectFields ? (
                  <ChevronUp className="h-3.5 w-3.5 opacity-60" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                )}
              </button>
              
              <span className="hidden sm:inline-block text-[11px] font-mono text-slate-400">
                Prospect-first discovery
              </span>
            </div>

            {/* Optional Specific Decision Maker Inputs */}
            {showProspectFields && (
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2.5 text-left animate-in fade-in zoom-in-95 duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="h-3.5 w-3.5" />
                    </div>
                    <input
                      type="text"
                      value={prospectName}
                      onChange={(e) => setProspectName(e.target.value)}
                      placeholder="Prospect name (e.g. John Doe, Founder)"
                      disabled={isLoading}
                      className="w-full pl-9 pr-3 py-2 bg-white text-slate-800 placeholder-slate-400 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-3.5 w-3.5" />
                    </div>
                    <input
                      type="email"
                      value={prospectEmail}
                      onChange={(e) => setProspectEmail(e.target.value)}
                      placeholder="Direct email (e.g. john@business.com)"
                      disabled={isLoading}
                      className="w-full pl-9 pr-3 py-2 bg-white text-slate-800 placeholder-slate-400 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pl-0.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>
                    If left blank, Pitchr crawls the website & about pages to identify founders, executives, and verified emails automatically.
                  </span>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Minimal Feature Highlights */}
        <div className="pt-8 sm:pt-12 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-2xl mx-auto">
          <div className="p-3.5 rounded-xl border border-slate-200/70 bg-white/80 text-xs space-y-1">
            <span className="font-mono text-[10px] text-orange-600 font-semibold uppercase block">Prospect First Discovery</span>
            <p className="text-slate-500">Finds founder/owner direct contact first, then verified site emails, eliminating generic fallbacks.</p>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200/70 bg-white/80 text-xs space-y-1">
            <span className="font-mono text-[10px] text-orange-600 font-semibold uppercase block">Live DOM & AI Inspection</span>
            <p className="text-slate-500">Evaluates mobile viewport, uncompressed assets, speed latency, and visual conversion bottlenecks.</p>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200/70 bg-white/80 text-xs space-y-1">
            <span className="font-mono text-[10px] text-orange-600 font-semibold uppercase block">4-Touch Pitch Studio</span>
            <p className="text-slate-500">Generates hyper-personalized cold outreach addressed directly to the decision maker.</p>
          </div>
        </div>
      </div>
    </section>
  );
};
