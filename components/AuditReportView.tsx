'use client';

import React from 'react';
import {
  ExternalLink,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  Info,
  Smartphone,
  Gauge,
  Palette,
  Search,
  Mail,
  Share2,
  Check,
  BookmarkPlus,
  ArrowRight
} from 'lucide-react';
import { AuditReport, IssueCategory, IssueSeverity } from '@/lib/types';
import { formatAuditDate } from '@/lib/storage';

interface AuditReportViewProps {
  report: AuditReport;
  onGenerateOutreach: (report: AuditReport) => void;
  onOpenTeaserModal: (report: AuditReport) => void;
  onSaveLead: (report: AuditReport) => void;
  isSaved?: boolean;
}

export const AuditReportView: React.FC<AuditReportViewProps> = ({
  report,
  onGenerateOutreach,
  onOpenTeaserModal,
  onSaveLead,
  isSaved = false,
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-800 bg-emerald-50/60 border-emerald-200/80';
    if (score >= 60) return 'text-amber-800 bg-amber-50/60 border-amber-200/80';
    return 'text-rose-800 bg-rose-50/60 border-rose-200/80';
  };

  const getSeverityBadge = (severity: IssueSeverity) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-rose-800 bg-rose-50 border border-rose-200/70 px-2 py-0.5 rounded shrink-0">
            <AlertCircle className="w-3 h-3 shrink-0" />
            Critical Leak
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-amber-800 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded shrink-0">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            Warning
          </span>
        );
      case 'info':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded shrink-0">
            <Info className="w-3 h-3 shrink-0" />
            Opportunity
          </span>
        );
    }
  };

  const getCategoryIcon = (category: IssueCategory) => {
    switch (category) {
      case 'design':
        return <Palette className="w-3.5 h-3.5 text-purple-600" />;
      case 'mobile':
        return <Smartphone className="w-3.5 h-3.5 text-blue-600" />;
      case 'speed':
        return <Gauge className="w-3.5 h-3.5 text-amber-600" />;
      case 'seo':
        return <Search className="w-3.5 h-3.5 text-emerald-600" />;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500 mb-1.5">
              <span>{report.industry}</span>
              <span aria-hidden="true" className="text-slate-300">/</span>
              <span>Audited {formatAuditDate(report.analyzedAt)}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-medium text-slate-900 tracking-tight font-heading flex items-center gap-2 sm:gap-3 flex-wrap">
              <span className="truncate max-w-full font-semibold">{report.companyName}</span>
              <a
                href={report.url}
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-emerald-600 transition-colors shrink-0"
                title="Visit website"
              >
                <ExternalLink className="w-4 h-4 sm:w-4 sm:h-4" />
              </a>
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-1 truncate max-w-xl">
              {report.url}
            </p>
          </div>

          {/* Action Button Bar */}
          <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 pt-2 lg:pt-0">
            <button
              onClick={() => onGenerateOutreach(report)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-xs font-medium rounded-xl sm:rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 shadow-xs transition-all active:scale-[0.98] whitespace-nowrap min-h-[40px] order-1 sm:order-3"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Generate Cold Pitch</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onOpenTeaserModal(report)}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 sm:py-2 text-xs font-medium rounded-xl sm:rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all shadow-xs min-h-[40px] order-2"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Shareable Teaser Link</span>
            </button>

            <button
              onClick={() => onSaveLead(report)}
              className={`inline-flex items-center justify-center gap-2 px-3.5 py-2.5 sm:py-2 text-xs font-medium rounded-xl sm:rounded-lg border transition-all min-h-[40px] order-3 sm:order-1 ${
                isSaved
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {isSaved ? <Check className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
              <span>{isSaved ? 'Lead Saved' : 'Save to Pipeline'}</span>
            </button>
          </div>
        </div>

        {/* Core Scores Matrix - Taste Skill refined typography */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3 mt-5 pt-5 border-t border-slate-100">
          {/* Overall Health Score */}
          <div className={`p-3 sm:p-4 rounded-xl border flex flex-col justify-between ${getScoreColor(report.scores.overall)}`}>
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-slate-600">Overall Health</span>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-2xl sm:text-3xl font-medium font-mono tabular-nums">{report.scores.overall}</span>
              <span className="text-xs opacity-70 font-mono">/100</span>
            </div>
            <span className="text-[11px] font-medium truncate">
              {report.scores.overall < 50 ? 'Severe Redesign Need' : report.scores.overall < 75 ? 'Moderate Issues' : 'Healthy'}
            </span>
          </div>

          {/* Design Score */}
          <div className="p-3 sm:p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-600">Design & UX</span>
              <Palette className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            </div>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-xl sm:text-2xl font-medium text-slate-900 font-mono tabular-nums">{report.scores.design}</span>
              <span className="text-[10px] text-slate-400 font-mono">/100</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-500 truncate">Visual age</span>
          </div>

          {/* Speed Score */}
          <div className="p-3 sm:p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-600">Speed</span>
              <Gauge className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            </div>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-xl sm:text-2xl font-medium text-slate-900 font-mono tabular-nums">{report.scores.speed}</span>
              <span className="text-[10px] text-slate-400 font-mono">/100</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-500 truncate">{report.rawMetrics.loadTimeMs}ms load</span>
          </div>

          {/* Mobile Score */}
          <div className="p-3 sm:p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-600">Mobile</span>
              <Smartphone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            </div>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-xl sm:text-2xl font-medium text-slate-900 font-mono tabular-nums">{report.scores.mobile}</span>
              <span className="text-[10px] text-slate-400 font-mono">/100</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-500 truncate">
              {report.rawMetrics.viewportConfigured ? 'Viewport set' : 'Missing viewport'}
            </span>
          </div>

          {/* SEO Score */}
          <div className="p-3 sm:p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-600">Technical SEO</span>
              <Search className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            </div>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-xl sm:text-2xl font-medium text-slate-900 font-mono tabular-nums">{report.scores.seo}</span>
              <span className="text-[10px] text-slate-400 font-mono">/100</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-500 truncate">
              {report.rawMetrics.hasOpenGraph ? 'OpenGraph set' : 'No OpenGraph'}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Critique & Suggested Redesign Angle */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Aesthetic Assessment */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <h3 className="text-xs sm:text-sm font-semibold text-slate-900 uppercase tracking-wider font-heading">
              Aesthetic & UX Assessment
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
            {report.visualCritique}
          </p>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <span className="text-[11px] font-mono text-slate-500 block mb-2 uppercase tracking-wide">
              Detected Tech Signals
            </span>
            <div className="flex flex-wrap gap-1.5">
              {report.techStack.map((tech) => (
                <span
                  key={tech}
                  className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-700 border border-slate-200/70"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Agency Redesign Solution */}
        <div className="bg-gradient-to-br from-emerald-50/40 to-white rounded-2xl border border-emerald-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <Palette className="w-4 h-4 text-emerald-700 shrink-0" />
              <h3 className="text-xs sm:text-sm font-semibold text-emerald-900 uppercase tracking-wider font-heading">
                Recommended Redesign Value Angle
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-sans">
              {report.redesignSuggestion}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs text-emerald-800 font-medium">Ready to convert into pitch?</span>
            <button
              onClick={() => onGenerateOutreach(report)}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 transition-colors shrink-0"
            >
              <span>Draft Pitch</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Identified Bottlenecks & Flaws */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-slate-900 font-heading">
              Discovered Client Bottlenecks ({report.issues.length})
            </h3>
            <p className="text-xs text-slate-500">
              High-impact proof points to reference in your cold outreach
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Pitchr diagnostic engine</span>
        </div>

        <div className="space-y-2.5 sm:space-y-3">
          {report.issues.map((issue) => (
            <div
              key={issue.id}
              className="p-3.5 sm:p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-all bg-slate-50/30"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-white border border-slate-200/80 shrink-0">
                    {getCategoryIcon(issue.category)}
                  </div>
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-900 font-heading leading-tight">
                    {issue.title}
                  </h4>
                </div>
                <div className="flex items-center gap-2 pl-7 sm:pl-0">
                  <span className="text-[10px] sm:text-xs text-slate-500 font-mono uppercase">{issue.category}</span>
                  {getSeverityBadge(issue.severity)}
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-2 pl-0 sm:pl-7">
                {issue.description}
              </p>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pt-2 border-t border-slate-100 text-xs sm:pl-7">
                <div className="text-emerald-800 font-medium flex items-start sm:items-center gap-1.5">
                  <span className="font-semibold text-slate-700 shrink-0">Fix:</span>
                  <span>{issue.recommendation}</span>
                </div>
                {issue.impactEstimate && (
                  <span className="font-mono text-[11px] text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200/80 shrink-0 self-start sm:self-auto">
                    {issue.impactEstimate}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
