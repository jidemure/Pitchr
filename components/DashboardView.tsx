'use client';

import React from 'react';
import {
  Globe,
  Layers,
  Mail,
  Zap,
  TrendingUp,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Lead, AuditReport, EmailSequence } from '@/lib/types';
import { formatAuditDate } from '@/lib/storage';

interface DashboardViewProps {
  leads: Lead[];
  audits: Record<string, AuditReport>;
  sequences: Record<string, EmailSequence>;
  onSelectLeadForAuditModal: (lead: Lead) => void;
  onNavigateToScanner: () => void;
  onNavigateToCrm: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  leads,
  audits,
  sequences,
  onSelectLeadForAuditModal,
  onNavigateToScanner,
  onNavigateToCrm,
}) => {
  const totalAudits = leads.length;
  const avgScore =
    totalAudits > 0
      ? Math.round(leads.reduce((acc, curr) => acc + curr.overallScore, 0) / totalAudits)
      : 0;

  const draftedSequencesCount = leads.filter((l) => l.campaignId || l.status === 'drafted' || l.status === 'contacted').length;

  const lowHealthCount = leads.filter((l) => l.overallScore < 60).length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-medium tracking-tight text-slate-900 font-heading">
            Agency Outreach Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time pipeline metrics, website health diagnostics, and cold outreach activity.
          </p>
        </div>

        <button
          onClick={onNavigateToScanner}
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-medium rounded-lg shadow-sm transition-all active:scale-[0.98] self-start sm:self-auto"
        >
          <Sparkles className="h-4 w-4" />
          <span>New Website Scan</span>
        </button>
      </div>

      {/* 4 Executive Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Scanned */}
        <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
              Total Audited
            </span>
            <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600">
              <Globe className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-semibold font-mono text-slate-900">
            {totalAudits}
          </div>
          <p className="text-[11px] text-slate-500">
            Prospect domains scanned
          </p>
        </div>

        {/* Avg Health Score */}
        <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
              Average Health
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-semibold font-mono text-slate-900">
            {avgScore > 0 ? (
              <>
                {avgScore}<span className="text-base text-slate-400 font-normal">/100</span>
              </>
            ) : (
              <span className="text-slate-400 font-normal text-2xl">--</span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            {lowHealthCount > 0 ? `${lowHealthCount} candidates need redesign` : 'No scans performed yet'}
          </p>
        </div>

        {/* Cold Emails Ready */}
        <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
              Emails Drafted
            </span>
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-700">
              <Mail className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-semibold font-mono text-orange-600">
            {draftedSequencesCount}
          </div>
          <p className="text-[11px] text-slate-500">
            Ready to copy or export
          </p>
        </div>

        {/* Response Rate Metric */}
        <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
              Expected Reply Rate
            </span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-700">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-semibold font-mono text-slate-900">
            {totalAudits > 0 ? '38%' : '--'}
          </div>
          <p className="text-[11px] text-slate-500">
            With technical teardown hooks
          </p>
        </div>
      </div>

      {/* Recent Scans Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-slate-900">
              Recent Website Scans & Dates
            </h2>
            <p className="text-xs text-slate-500">
              Click any scan to reopen the exact analysis modal and generated outreach email
            </p>
          </div>
          <button
            onClick={onNavigateToCrm}
            className="text-xs font-medium text-orange-600 hover:text-orange-700 inline-flex items-center gap-1"
          >
            <span>View Full CRM</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-mono text-[11px] uppercase">
                <th className="pb-2.5 font-medium">Date Scanned</th>
                <th className="pb-2.5 font-medium">Domain / Company</th>
                <th className="pb-2.5 font-medium">Health Score</th>
                <th className="pb-2.5 font-medium">Contact</th>
                <th className="pb-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2.5 max-w-sm mx-auto">
                      <div className="p-3 bg-orange-50 rounded-2xl text-orange-600">
                        <Globe className="h-5 w-5" />
                      </div>
                      <p className="font-semibold text-slate-900 text-sm">
                        No live websites scanned yet
                      </p>
                      <p className="text-xs text-slate-500 text-center leading-relaxed">
                        Enter any live website URL on the scanner to generate your first audit diagnostics, health scores, and cold outreach sequence.
                      </p>
                      <button
                        onClick={onNavigateToScanner}
                        className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-all shadow-sm"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Run First Live Scan</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const cleanDomain = lead.url.replace(/^https?:\/\//, '').replace(/^www\./, '');
                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="py-3 font-mono text-slate-500 whitespace-nowrap">
                        {formatAuditDate(lead.lastAuditedAt || lead.createdAt)}
                      </td>
                      <td className="py-3">
                        <div className="font-medium text-slate-800">{lead.companyName}</div>
                        <div className="text-[11px] text-slate-400 font-mono truncate max-w-[200px]">
                          {cleanDomain}
                        </div>
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-mono font-semibold text-xs ${
                            lead.overallScore >= 70
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : lead.overallScore >= 50
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {lead.overallScore}/100
                        </span>
                      </td>
                      <td className="py-3 text-slate-500">
                        {lead.contactEmail || `contact@${cleanDomain}`}
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => onSelectLeadForAuditModal(lead)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-orange-50 hover:text-orange-800 text-slate-700 font-medium rounded-lg text-xs transition-colors"
                        >
                          <span>Open Modal</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
