'use client';

import React from 'react';
import { Sparkles, Database, Layers, Mail, Globe, CheckCircle2 } from 'lucide-react';

interface NavbarProps {
  activeTab: 'auditor' | 'leads' | 'outreach' | 'database';
  setActiveTab: (tab: 'auditor' | 'leads' | 'outreach' | 'database') => void;
  leadsCount: number;
  isSupabaseConnected: boolean;
  onQuickAuditClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  leadsCount,
  isSupabaseConnected,
  onQuickAuditClick,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between gap-4 sm:gap-8 px-3.5 sm:px-6 lg:px-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setActiveTab('auditor')}
            className="flex items-center gap-2 text-left focus:outline-none group"
            aria-label="Pitchr Home"
          >
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs transition-transform group-hover:scale-105 shrink-0">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <span className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900 font-heading">
              Pitchr
            </span>
          </button>
        </div>

        {/* Zone 2: Desktop Navigation Links (Clean text links with subtle hover) */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => setActiveTab('auditor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'auditor'
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            Website Auditor
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'leads'
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Lead Pipeline
            {leadsCount > 0 && (
              <span className="ml-1 text-[11px] font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-200/60 font-medium">
                {leadsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('outreach')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'outreach'
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            Email Studio
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'database'
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            Supabase DB
            {isSupabaseConnected && (
              <CheckCircle2 className="h-3 w-3 text-emerald-600 ml-1" />
            )}
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onQuickAuditClick}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white shadow-xs transition-all hover:bg-emerald-500 active:scale-[0.98] whitespace-nowrap min-h-[36px]"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            <span>New Audit</span>
          </button>
        </div>
      </div>

      {/* Mobile Nav Tabs Bar */}
      <div className="flex md:hidden border-t border-slate-100 px-2 py-1 gap-1 overflow-x-auto scrollbar-none bg-slate-50/60">
        <button
          onClick={() => setActiveTab('auditor')}
          className={`flex-1 min-w-[76px] py-1.5 px-2 text-xs font-medium rounded-md transition-colors text-center whitespace-nowrap min-h-[36px] ${
            activeTab === 'auditor'
              ? 'bg-white text-slate-900 font-semibold shadow-xs border border-slate-200'
              : 'text-slate-600'
          }`}
        >
          Auditor
        </button>
        <button
          onClick={() => setActiveTab('leads')}
          className={`flex-1 min-w-[80px] py-1.5 px-2 text-xs font-medium rounded-md transition-colors text-center whitespace-nowrap min-h-[36px] ${
            activeTab === 'leads'
              ? 'bg-white text-slate-900 font-semibold shadow-xs border border-slate-200'
              : 'text-slate-600'
          }`}
        >
          Leads {leadsCount > 0 ? `(${leadsCount})` : ''}
        </button>
        <button
          onClick={() => setActiveTab('outreach')}
          className={`flex-1 min-w-[84px] py-1.5 px-2 text-xs font-medium rounded-md transition-colors text-center whitespace-nowrap min-h-[36px] ${
            activeTab === 'outreach'
              ? 'bg-white text-slate-900 font-semibold shadow-xs border border-slate-200'
              : 'text-slate-600'
          }`}
        >
          Outreach
        </button>
        <button
          onClick={() => setActiveTab('database')}
          className={`flex-1 min-w-[76px] py-1.5 px-2 text-xs font-medium rounded-md transition-colors text-center whitespace-nowrap min-h-[36px] ${
            activeTab === 'database'
              ? 'bg-white text-slate-900 font-semibold shadow-xs border border-slate-200'
              : 'text-slate-600'
          }`}
        >
          Database
        </button>
      </div>
    </header>
  );
};
