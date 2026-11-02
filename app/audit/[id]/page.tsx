'use client';

import React, { useEffect, useState, use } from 'react';
import { AuditReport, AuditIssue } from '@/lib/types';
import { getStoredAudits } from '@/lib/storage';
import {
  Globe,
  Sparkles,
  ExternalLink,
  Smartphone,
  Gauge,
  Palette,
  Search,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface AuditPageProps {
  params: Promise<{ id: string }>;
}

export default function PublicAuditPage({ params }: AuditPageProps) {
  const resolvedParams = use(params);
  const auditId = resolvedParams.id;
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Try decoding report from URL query parameter
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const dataParam = searchParams.get('data');
      if (dataParam) {
        const decoded = JSON.parse(atob(decodeURIComponent(dataParam)));
        if (decoded && decoded.companyName) {
          setReport(decoded);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Could not parse report from query param:', e);
    }

    // 2. Try loading from localStorage
    const localAudits = getStoredAudits();
    if (localAudits[auditId]) {
      setReport(localAudits[auditId]);
      setLoading(false);
      return;
    }

    // Check if auditId matches an audit with URL slug
    const found = Object.values(localAudits).find(
      (a) => a.id === auditId || a.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-') === auditId
    );
    if (found) {
      setReport(found);
      setLoading(false);
      return;
    }

    setLoading(false);
  }, [auditId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F9] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-mono text-slate-500">Loading diagnostic report...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-[#FAF9F9] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto">
            <Globe className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-heading font-semibold text-slate-900">
            Report Not Found
          </h1>
          <p className="text-sm text-slate-500">
            This audit report link may have expired or is unavailable. Please check the URL or request an updated link.
          </p>
        </div>
      </div>
    );
  }

  const cleanDomain = report.url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
  const overallScore = report.scores.overall;

  const getScoreColorClass = (val: number) => {
    if (val >= 75) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (val >= 50) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'design':
        return <Palette className="w-4 h-4 text-purple-600" />;
      case 'mobile':
        return <Smartphone className="w-4 h-4 text-blue-600" />;
      case 'speed':
        return <Gauge className="w-4 h-4 text-amber-600" />;
      case 'seo':
      default:
        return <Search className="w-4 h-4 text-emerald-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F9] text-slate-900 antialiased py-8 sm:py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top Header Card */}
        <header className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-orange-600 font-semibold block">
                  Confidential Website Audit & Redesign Analysis
                </span>
                <h1 className="text-xl sm:text-2xl font-heading font-semibold text-slate-900 mt-0.5">
                  {report.companyName}
                </h1>
              </div>
            </div>

            <a
              href={report.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors self-start sm:self-auto"
            >
              <span>{cleanDomain}</span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            </a>
          </div>

          {/* Overall Score Dial + Core Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            {/* Score circle */}
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center gap-4 md:col-span-1">
              <div
                className={`h-16 w-16 rounded-full border-4 flex flex-col items-center justify-center shrink-0 ${
                  overallScore >= 70
                    ? 'border-emerald-500 text-emerald-600 bg-emerald-50/40'
                    : overallScore >= 45
                    ? 'border-amber-500 text-amber-600 bg-amber-50/40'
                    : 'border-rose-500 text-rose-600 bg-rose-50/40'
                }`}
              >
                <span className="text-xl font-mono font-bold leading-none">{overallScore}</span>
                <span className="text-[9px] font-mono text-slate-400 mt-0.5">/ 100</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-900 block font-heading">
                  Overall Health
                </span>
                <span className="text-[11px] text-slate-500">
                  {overallScore >= 70
                    ? 'Moderate conversion performance'
                    : overallScore >= 45
                    ? 'Multiple conversion leaks detected'
                    : 'Critical conversion bottlenecks'}
                </span>
              </div>
            </div>

            {/* 4 Diagnostic Pillars */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:col-span-3">
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/40 text-center space-y-1">
                <span className="text-[11px] font-mono text-slate-400 uppercase block">Design</span>
                <span className="text-lg font-mono font-bold text-slate-900">
                  {report.scores.design}
                  <span className="text-xs text-slate-400 font-normal">/100</span>
                </span>
              </div>
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/40 text-center space-y-1">
                <span className="text-[11px] font-mono text-slate-400 uppercase block">Mobile</span>
                <span className="text-lg font-mono font-bold text-slate-900">
                  {report.scores.mobile}
                  <span className="text-xs text-slate-400 font-normal">/100</span>
                </span>
              </div>
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/40 text-center space-y-1">
                <span className="text-[11px] font-mono text-slate-400 uppercase block">Speed</span>
                <span className="text-lg font-mono font-bold text-slate-900">
                  {report.scores.speed}
                  <span className="text-xs text-slate-400 font-normal">/100</span>
                </span>
              </div>
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/40 text-center space-y-1">
                <span className="text-[11px] font-mono text-slate-400 uppercase block">SEO</span>
                <span className="text-lg font-mono font-bold text-slate-900">
                  {report.scores.seo}
                  <span className="text-xs text-slate-400 font-normal">/100</span>
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Identified Conversion Bottlenecks */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-heading font-semibold text-slate-900">
              Identified Conversion Bottlenecks
            </h2>
            <span className="text-xs font-mono text-slate-500">
              {report.issues?.length || 0} issues analyzed
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {(report.issues || []).map((issue: AuditIssue, idx: number) => (
              <div
                key={issue.id || idx}
                className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/30 hover:bg-slate-50/70 transition-colors space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                      {getCategoryIcon(issue.category)}
                    </div>
                    <span className="text-sm font-semibold text-slate-900 font-heading">
                      {issue.title}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded border ${
                      issue.severity === 'critical'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : issue.severity === 'warning'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {issue.severity}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {issue.description}
                </p>

                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                  <div className="text-slate-700">
                    <strong className="text-slate-900">Recommended fix:</strong> {issue.recommendation}
                  </div>
                  {issue.impactEstimate && (
                    <span className="font-mono text-orange-600 font-medium shrink-0">
                      ★ {issue.impactEstimate}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Visual Critique & Proposed Redesign Blueprint */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-3">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400">
              01. First-Impression Evaluation
            </span>
            <h3 className="text-base font-heading font-semibold text-slate-900">
              Aesthetic & Credibility Critique
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {report.visualCritique}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-3">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-orange-600">
              02. Modern Conversion Solution
            </span>
            <h3 className="text-base font-heading font-semibold text-slate-900">
              Proposed Redesign Concept
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {report.redesignSuggestion}
            </p>
          </div>
        </section>

        {/* Client Response CTA Card */}
        <section className="rounded-2xl border border-orange-500/30 bg-[#191C21] text-white p-6 sm:p-8 space-y-4 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-orange-400 font-semibold">
                Next Step
              </span>
              <h3 className="text-lg sm:text-xl font-heading font-semibold text-white">
                Ready to review the 2-minute mobile wireframe?
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                We have prepared a frictionless interactive concept showing how fixing these bottlenecks recaptures lost customer inquiries for {report.companyName}.
              </p>
            </div>

            <a
              href={`mailto:${report.contactEmail || ''}?subject=Re: Website Redesign Wireframe for ${cleanDomain}`}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium text-xs sm:text-sm shadow-sm transition-all active:scale-[0.98] shrink-0"
            >
              <span>Reply to Proposal</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>

        <footer className="text-center text-xs font-mono text-slate-400 pb-8">
          Powered by Pitchr Website Intelligence Engine
        </footer>
      </div>
    </div>
  );
}
