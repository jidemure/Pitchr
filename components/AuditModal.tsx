'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe,
  Check,
  Copy,
  Mail,
  MapPin,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  Layers,
  ArrowRight,
  Database,
  AlertCircle,
  RotateCw,
  User,
  Edit2
} from 'lucide-react';
import { AuditReport, EmailSequence, Lead, EmailProvider } from '@/lib/types';
import { formatAuditDate } from '@/lib/storage';
import { extractNameFromEmail } from '@/lib/auditHelpers';
import { triggerDirectProviderLaunch, EMAIL_PROVIDERS_META } from '@/lib/emailDispatcher';

interface AuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: AuditReport | null;
  sequence: EmailSequence | null;
  isScanning: boolean;
  scanningUrl: string;
  error?: string | null;
  onRetry?: (url: string) => void;
  onSaveToCrm?: (report: AuditReport) => void;
  onNavigateToCrm?: () => void;
  onOpenTeaser?: (report: AuditReport) => void;
  onUpdateAudit?: (updatedReport: AuditReport) => void;
}

export const AuditModal: React.FC<AuditModalProps> = ({
  isOpen,
  onClose,
  report,
  sequence,
  isScanning,
  scanningUrl,
  error,
  onRetry,
  onSaveToCrm,
  onNavigateToCrm,
  onOpenTeaser,
  onUpdateAudit,
}) => {
  const [activeTouchIndex, setActiveTouchIndex] = useState(0);
  const [isEditingLead, setIsEditingLead] = useState(false);
  const [editProspectName, setEditProspectName] = useState('');
  const [editProspectTitle, setEditProspectTitle] = useState('');
  const [editContactEmail, setEditContactEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Progressive scanning simulation steps for the radar screen (Screenshot 02)
  const [scanningStepIndex, setScanningStepIndex] = useState(0);
  const scanningSteps = [
    'Gathering Google Lighthouse mobile telemetry & Core Web Vitals...',
    'Analyzing viewport meta tags, touch targets & mobile responsiveness...',
    'Inspecting technical SEO, structured Schema.org JSON-LD & meta tags...',
    'Critiquing visual hierarchy, CTA placement & conversion gaps with Gemini...',
    'Synthesizing personalized 4-touch cold outreach proposal...',
  ];

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isScanning) return;
    const interval = setInterval(() => {
      setScanningStepIndex((prev) => (prev < scanningSteps.length - 1 ? prev + 1 : prev));
    }, 750);
    return () => {
      clearInterval(interval);
      setScanningStepIndex(0);
    };
  }, [isScanning, scanningSteps.length]);

  if (!isOpen) return null;

  // Display domain calculation
  const rawUrl = isScanning ? (scanningUrl || 'target-website.com') : (report?.url || scanningUrl || 'target-website.com');
  const derivedProspectName = report?.prospectName || extractNameFromEmail(report?.contactEmail || '') || '';
  const derivedProspectTitle = report?.prospectTitle || (derivedProspectName ? 'Owner / Decision Maker' : 'Team / Decision Maker');
  const cleanDomain = rawUrl
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');

  // Scores out of 10 (matching Screenshot 03: e.g. 5, 9, 7, 1)
  const designScore10 = report ? Math.max(1, Math.min(10, Math.round(report.scores.design / 10))) : 5;
  const seoScore10 = report ? Math.max(1, Math.min(10, Math.round(report.scores.seo / 10))) : 9;
  const respScore10 = report ? Math.max(1, Math.min(10, Math.round(report.scores.mobile / 10))) : 7;
  const speedScore10 = report ? Math.max(1, Math.min(10, Math.round(report.scores.speed / 10))) : 1;

  const getScoreCircleClass = (val: number) => {
    if (val >= 7) return 'text-emerald-700 bg-emerald-50 border-emerald-400';
    if (val >= 4) return 'text-amber-700 bg-amber-50 border-amber-400';
    return 'text-rose-700 bg-rose-50 border-rose-400';
  };

  const currentTouch = sequence?.touches?.[activeTouchIndex] || sequence?.touches?.[0];
  const subjectLine = currentTouch?.subjectLines?.[0] || `${cleanDomain} needs a little polish`;
  const emailBody = currentTouch?.body || '';

  const handleSaveLeadEdit = () => {
    if (!report) return;
    const updated: AuditReport = {
      ...report,
      prospectName: editProspectName.trim() || undefined,
      prospectTitle: editProspectTitle.trim() || undefined,
      contactEmail: editContactEmail.trim() || report.contactEmail,
      emailSource: editContactEmail.trim() !== report.contactEmail ? 'user' : report.emailSource,
    };
    if (onUpdateAudit) {
      onUpdateAudit(updated);
    }
    setIsEditingLead(false);
  };

  const handleCopy = () => {
    const fullText = `Subject: ${subjectLine}\n\n${emailBody}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategory(expandedCategory === cat ? null : cat);
  };

  // Filter issues by category
  const getIssuesForCategory = (cat: string) => {
    if (!report) return [];
    return report.issues.filter((i) => i.category === cat);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden my-auto flex flex-col max-h-[94vh]">
        {/* Modal Top Bar (Screenshots 02 & 03) */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <Globe className="h-4 w-4 text-slate-500 shrink-0" />
            <span className="font-medium text-xs sm:text-sm text-slate-900 truncate">
              {cleanDomain}
            </span>
            <span className="text-slate-300">·</span>
            {isScanning ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 truncate">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden sm:inline">Opening the site in a real browser...</span>
                <span className="sm:hidden">Scanning...</span>
              </span>
            ) : error && !report ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-rose-600 font-medium truncate">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span>Scan halted</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-slate-700 font-medium">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>Email ready</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-0.5 text-[11px] font-medium bg-emerald-100/70 text-emerald-800 rounded-full border border-emerald-200/60">
              Your free analysis
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-y-auto">
          {/* Left Column (Scores & Lead Info) */}
          <div className="md:col-span-4 p-4 sm:p-5 border-b md:border-b-0 md:border-r border-slate-100 bg-[#fbfcfd] flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-slate-500 block">
                  SITE SCORES
                </span>
                {report?.rawMetrics.coreWebVitals?.dataSource === 'google_pagespeed_api' && (
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 inline-flex items-center gap-1 font-medium">
                    ⚡ Lighthouse Verified
                  </span>
                )}
              </div>

              {/* State A: Loading Placeholder Cards (Screenshot 02) */}
              {isScanning && (
                <div className="space-y-2.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-14 rounded-xl border border-dashed border-slate-200 bg-white/60 animate-pulse"
                    />
                  ))}
                </div>
              )}

              {/* State A2: Scan Error on Left Column */}
              {!isScanning && error && !report && (
                <div className="p-3.5 rounded-xl border border-rose-200/80 bg-rose-50/50 text-xs text-rose-700 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-rose-800">
                    <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                    <span>Diagnostics Halted</span>
                  </div>
                  <p className="text-[11px] text-rose-600/90 leading-relaxed">
                    Live metrics could not be gathered for this URL.
                  </p>
                </div>
              )}

              {/* State B: Populated Interactive Scores (Screenshot 03) */}
              {!isScanning && report && (
                <div className="space-y-2">
                  {/* Design Score Card */}
                  <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs transition-all">
                    <button
                      type="button"
                      onClick={() => toggleCategory('design')}
                      className="w-full flex items-center justify-between text-left group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`h-7 w-7 rounded-full border-2 flex items-center justify-center font-bold text-xs font-mono shrink-0 ${getScoreCircleClass(
                            designScore10
                          )}`}
                        >
                          {designScore10}
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-slate-800 block">
                            Design
                          </span>
                          <span className="text-[10px] text-slate-400 group-hover:text-orange-600">
                            tap to see what Pitchr found
                          </span>
                        </div>
                      </div>
                      {expandedCategory === 'design' ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </button>

                    {expandedCategory === 'design' && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-1.5 animate-fade-in">
                        <p className="font-medium text-slate-800">
                          {report.visualCritique}
                        </p>
                        {getIssuesForCategory('design').map((iss) => (
                          <div key={iss.id} className="text-slate-500 pl-2 border-l-2 border-amber-300">
                            • {iss.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SEO Score Card */}
                  <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs transition-all">
                    <button
                      type="button"
                      onClick={() => toggleCategory('seo')}
                      className="w-full flex items-center justify-between text-left group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`h-7 w-7 rounded-full border-2 flex items-center justify-center font-bold text-xs font-mono shrink-0 ${getScoreCircleClass(
                            seoScore10
                          )}`}
                        >
                          {seoScore10}
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-slate-800 block">
                            SEO
                          </span>
                          <span className="text-[10px] text-slate-400 group-hover:text-emerald-700">
                            tap to see what Pitchr found
                          </span>
                        </div>
                      </div>
                      {expandedCategory === 'seo' ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </button>

                    {expandedCategory === 'seo' && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-1.5 animate-fade-in">
                        <p className="text-slate-700">
                          Title: {report.rawMetrics.hasTitle ? '✓ Configured' : '✕ Missing'} | Schema:{' '}
                          {report.rawMetrics.hasSchema ? '✓ Present' : '✕ Missing'}
                          {report.rawMetrics.coreWebVitals?.lighthouseSeo !== undefined && (
                            <span className="ml-1.5 text-[10px] text-emerald-700 font-mono">
                              (Lighthouse: {report.rawMetrics.coreWebVitals.lighthouseSeo}/100)
                            </span>
                          )}
                        </p>
                        {getIssuesForCategory('seo').map((iss) => (
                          <div key={iss.id} className="text-slate-500 pl-2 border-l-2 border-emerald-300">
                            • {iss.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Responsiveness Score Card */}
                  <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs transition-all">
                    <button
                      type="button"
                      onClick={() => toggleCategory('mobile')}
                      className="w-full flex items-center justify-between text-left group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`h-7 w-7 rounded-full border-2 flex items-center justify-center font-bold text-xs font-mono shrink-0 ${getScoreCircleClass(
                            respScore10
                          )}`}
                        >
                          {respScore10}
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-slate-800 block">
                            Responsiveness
                          </span>
                          <span className="text-[10px] text-slate-400 group-hover:text-emerald-700">
                            tap to see what Pitchr found
                          </span>
                        </div>
                      </div>
                      {expandedCategory === 'mobile' ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </button>

                    {expandedCategory === 'mobile' && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-1.5 animate-fade-in">
                        <p className="text-slate-700">
                          Viewport Tag:{' '}
                          {report.rawMetrics.viewportConfigured ? '✓ Configured' : '✕ Broken on mobile'}
                        </p>
                        {getIssuesForCategory('mobile').map((iss) => (
                          <div key={iss.id} className="text-slate-500 pl-2 border-l-2 border-emerald-300">
                            • {iss.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Speed Score Card */}
                  <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs transition-all">
                    <button
                      type="button"
                      onClick={() => toggleCategory('speed')}
                      className="w-full flex items-center justify-between text-left group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`h-7 w-7 rounded-full border-2 flex items-center justify-center font-bold text-xs font-mono shrink-0 ${getScoreCircleClass(
                            speedScore10
                          )}`}
                        >
                          {speedScore10}
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-slate-800 block">
                            Speed
                          </span>
                          <span className="text-[10px] text-slate-400 group-hover:text-emerald-700">
                            tap to see what Pitchr found
                          </span>
                        </div>
                      </div>
                      {expandedCategory === 'speed' ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </button>

                    {expandedCategory === 'speed' && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-1.5 animate-fade-in">
                        <div className="flex items-center justify-between text-slate-800 font-medium">
                          <span>
                            {report.rawMetrics.coreWebVitals?.dataSource === 'google_pagespeed_api' ? 'Mobile LCP:' : 'Estimated Load:'}{' '}
                            {report.rawMetrics.coreWebVitals?.lcpDisplay || `${(report.rawMetrics.loadTimeMs / 1000).toFixed(1)}s`}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {report.rawMetrics.coreWebVitals?.totalByteWeightDisplay || `${report.rawMetrics.pageSizeKb} KB`}
                          </span>
                        </div>
                        {report.rawMetrics.coreWebVitals?.tbtDisplay && (
                          <p className="text-[10px] text-slate-500">
                            Main Thread Block: <strong className="text-slate-700">{report.rawMetrics.coreWebVitals.tbtDisplay}</strong> | CLS: <strong className="text-slate-700">{report.rawMetrics.coreWebVitals.clsDisplay || '0.00'}</strong>
                          </p>
                        )}
                        {getIssuesForCategory('speed').map((iss) => (
                          <div key={iss.id} className="text-slate-500 pl-2 border-l-2 border-rose-300">
                            • {iss.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

              {/* Mobile Viewport Snapshot if available */}
              {!isScanning && report?.screenshotUrl && (
                <div className="p-2.5 rounded-xl border border-slate-200/80 bg-white shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-slate-400 block">
                      MOBILE VIEWPORT SNAPSHOT
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">375×812</span>
                  </div>
                  <div className="w-full h-32 rounded-lg overflow-hidden border border-slate-100 bg-slate-50 relative">
                    <img
                      src={report.screenshotUrl}
                      alt={`${report.companyName} Mobile View`}
                      className="w-full h-full object-cover object-top hover:object-contain transition-all duration-300"
                    />
                  </div>
                </div>
              )}

            {/* Bottom Lead Info Card with Prospect-First Status & Editing */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-slate-400">
                  LEAD & DECISION MAKER
                </span>
                {!isScanning && report && !isEditingLead && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditProspectName(report.prospectName || extractNameFromEmail(report.contactEmail || '') || '');
                      setEditProspectTitle(report.prospectTitle || (derivedProspectName ? 'Decision Maker' : ''));
                      setEditContactEmail(report.contactEmail || '');
                      setIsEditingLead(true);
                    }}
                    className="text-[11px] text-slate-400 hover:text-orange-600 transition-colors inline-flex items-center gap-1 font-medium cursor-pointer"
                    title="Edit prospect or email"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              {isEditingLead ? (
                <div className="p-2.5 rounded-xl border border-orange-200 bg-orange-50/40 space-y-2 animate-in fade-in duration-100">
                  <div>
                    <label className="text-[10px] font-mono text-slate-500 uppercase block mb-0.5">Prospect Name</label>
                    <input
                      type="text"
                      value={editProspectName}
                      onChange={(e) => setEditProspectName(e.target.value)}
                      placeholder="e.g. Dr. Sarah Jenkins"
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-500 uppercase block mb-0.5">Title / Role</label>
                    <input
                      type="text"
                      value={editProspectTitle}
                      onChange={(e) => setEditProspectTitle(e.target.value)}
                      placeholder="e.g. Founder, CEO"
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-500 uppercase block mb-0.5">Contact Email</label>
                    <input
                      type="email"
                      value={editContactEmail}
                      onChange={(e) => setEditContactEmail(e.target.value)}
                      placeholder="e.g. sarah@business.com"
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingLead(false)}
                      className="px-2 py-0.5 text-[11px] text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveLeadEdit}
                      className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-[11px] font-medium shadow-2xs cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl border border-slate-200/80 bg-white shadow-2xs space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-800 font-semibold flex items-center justify-center text-xs shrink-0">
                      {(!isScanning && report?.companyName?.[0]) || cleanDomain[0]?.toUpperCase() || 'P'}
                    </div>
                    <span className="text-xs font-medium text-slate-800 truncate">
                      {(!isScanning && report?.companyName) || cleanDomain}
                    </span>
                  </div>

                  {/* Prospect Person */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-700 pl-1 border-t border-slate-100 pt-1.5">
                    <User className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                    <span className="font-semibold text-slate-900 truncate">
                      {derivedProspectName || 'Key Decision Maker'}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate">
                      ({derivedProspectTitle})
                    </span>
                  </div>

                  {/* Email & Source Badge */}
                  <div className="space-y-1 pl-1">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate font-mono text-[11px]">
                        {report?.contactEmail || `contact@${cleanDomain}`}
                      </span>
                    </div>

                    {!isScanning && (
                      <div className="pt-0.5">
                        {report?.emailSource === 'user' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-orange-800 bg-orange-50 border border-orange-200/80 px-1.5 py-0.5 rounded-md">
                            <Check className="h-2.5 w-2.5" /> Target prospect
                          </span>
                        ) : report?.emailSource === 'website_prospect' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded-md">
                            <Check className="h-2.5 w-2.5" /> Verified prospect email
                          </span>
                        ) : report?.emailSource === 'website_general' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-800 bg-blue-50 border border-blue-200/80 px-1.5 py-0.5 rounded-md">
                            <Check className="h-2.5 w-2.5" /> Verified website contact
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-md">
                            Domain fallback
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {!isScanning && report?.location && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pl-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{report.location}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (Scan Progress or Cold Email Output) */}
          <div className="md:col-span-8 p-4 sm:p-6 flex flex-col justify-between bg-white overflow-y-auto">
            {/* Case 1: In-Flight Scanning State (Screenshot 02) */}
            {isScanning && (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16 space-y-6 text-center animate-fade-in my-auto">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  SUBJECT
                </span>

                {/* Animated Pulsing Radar Icon */}
                <div className="relative flex items-center justify-center">
                  <div className="absolute h-24 w-24 rounded-full border border-orange-300 animate-ping opacity-25" />
                  <div className="h-20 w-20 rounded-full border-2 border-orange-400/80 bg-orange-50/50 flex items-center justify-center relative shadow-sm">
                    <div className="h-10 w-10 rounded-lg bg-orange-500 text-white flex items-center justify-center shadow-xs">
                      <Globe className="h-5 w-5" />
                    </div>
                    {/* Orbiting dot */}
                    <div className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-orange-500 border-2 border-white shadow-xs animate-pulse" />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-slate-400 font-mono">Visiting</span>
                  <p className="text-sm sm:text-base font-semibold text-slate-900 font-mono">
                    {cleanDomain}
                  </p>
                </div>

                <div className="w-48 sm:w-64 h-[1px] bg-slate-100" />

                <div className="space-y-2.5 max-w-sm">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">
                    THINKING
                  </span>
                  <div className="inline-flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 font-sans">
                    <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{scanningSteps[scanningStepIndex]}</span>
                  </div>

                  {/* Visual Step Progress Dots */}
                  <div className="flex items-center justify-center gap-1.5 pt-1">
                    {scanningSteps.map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          idx === scanningStepIndex
                            ? 'w-6 bg-emerald-600'
                            : idx < scanningStepIndex
                            ? 'w-1.5 bg-emerald-400'
                            : 'w-1.5 bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Case 2: Scan Error State */}
            {!isScanning && error && !report && (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16 space-y-5 text-center animate-fade-in my-auto max-w-sm mx-auto">
                <div className="h-14 w-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-xs">
                  <AlertCircle className="h-7 w-7" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-semibold text-slate-900">
                    Audit could not complete
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {error || 'Unable to scan this website. Please check the URL and try again.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  {onRetry && (
                    <button
                      type="button"
                      onClick={() => onRetry(scanningUrl)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-[0.98]"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                      <span>Retry Scan</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium rounded-xl transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Case 3: Analysis Complete & Email Ready (Screenshot 03 - NO PAYWALL!) */}
            {!isScanning && report && (
              <div className="space-y-4 animate-fade-in">
                {/* Subject Line & Touch Stepper */}
                <div className="border-b border-slate-100 pb-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                      SUBJECT
                    </span>
                    {/* Touch tabs */}
                    {sequence && sequence.touches && sequence.touches.length > 1 && (
                      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                        {sequence.touches.map((t, idx) => (
                          <button
                            key={t.step}
                            onClick={() => setActiveTouchIndex(idx)}
                            className={`px-2 py-0.5 text-[11px] font-medium rounded transition-all ${
                              activeTouchIndex === idx
                                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Touch {t.step}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <p className="text-sm sm:text-base font-medium text-slate-900">
                    {subjectLine}
                  </p>
                </div>

                {/* Email Body with Highlighting (Screenshot 03) */}
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/40 text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3 font-sans whitespace-pre-line">
                  {emailBody ? (
                    emailBody.split(/\n{2,}/).map((para, i) => {
                      if (para.includes(cleanDomain)) {
                        const parts = para.split(cleanDomain);
                        return (
                          <p key={i}>
                            {parts.map((part, pIdx) => (
                              <React.Fragment key={pIdx}>
                                {part}
                                {pIdx < parts.length - 1 && (
                                  <mark className="bg-sky-100 text-sky-900 px-1 py-0.5 rounded font-mono text-[11px] sm:text-xs">
                                    {cleanDomain}
                                  </mark>
                                )}
                              </React.Fragment>
                            ))}
                          </p>
                        );
                      }
                      return <p key={i}>{para}</p>;
                    })
                  ) : (
                    <p className="text-slate-400 italic">No email body generated.</p>
                  )}

                  {currentTouch?.cta && !emailBody.includes(currentTouch.cta) && !emailBody.trim().endsWith('?') && (
                    <p className="font-semibold text-slate-900 pt-1">
                      {currentTouch.cta}
                    </p>
                  )}
                </div>

                {/* Email Providers Quick Dispatch Bar */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span className="font-semibold uppercase tracking-wider">1-Click Dispatch Provider</span>
                    <span>To: {report?.contactEmail || `contact@${cleanDomain}`}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const bodyText = emailBody.trim();
                        const ctaText = currentTouch?.cta?.trim() || '';
                        const fullBodyToSend = ctaText && !bodyText.includes(ctaText) && !bodyText.endsWith('?')
                          ? `${bodyText}\n\n${ctaText}`
                          : bodyText;
                        triggerDirectProviderLaunch('gmail', {
                          to: report?.contactEmail || `contact@${cleanDomain}`,
                          subject: subjectLine,
                          body: fullBodyToSend,
                        });
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-red-200 text-red-700 hover:bg-red-50 transition-colors shadow-2xs"
                    >
                      <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                        <path d={EMAIL_PROVIDERS_META.gmail.iconSvg} />
                      </svg>
                      <span>Gmail</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const bodyText = emailBody.trim();
                        const ctaText = currentTouch?.cta?.trim() || '';
                        const fullBodyToSend = ctaText && !bodyText.includes(ctaText) && !bodyText.endsWith('?')
                          ? `${bodyText}\n\n${ctaText}`
                          : bodyText;
                        triggerDirectProviderLaunch('outlook', {
                          to: report?.contactEmail || `contact@${cleanDomain}`,
                          subject: subjectLine,
                          body: fullBodyToSend,
                        });
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-sky-200 text-sky-700 hover:bg-sky-50 transition-colors shadow-2xs"
                    >
                      <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                        <path d={EMAIL_PROVIDERS_META.outlook.iconSvg} />
                      </svg>
                      <span>Outlook</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const bodyText = emailBody.trim();
                        const ctaText = currentTouch?.cta?.trim() || '';
                        const fullBodyToSend = ctaText && !bodyText.includes(ctaText) && !bodyText.endsWith('?')
                          ? `${bodyText}\n\n${ctaText}`
                          : bodyText;
                        triggerDirectProviderLaunch('yahoo', {
                          to: report?.contactEmail || `contact@${cleanDomain}`,
                          subject: subjectLine,
                          body: fullBodyToSend,
                        });
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors shadow-2xs"
                    >
                      <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                        <path d={EMAIL_PROVIDERS_META.yahoo.iconSvg} />
                      </svg>
                      <span>Yahoo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const bodyText = emailBody.trim();
                        const ctaText = currentTouch?.cta?.trim() || '';
                        const fullBodyToSend = ctaText && !bodyText.includes(ctaText) && !bodyText.endsWith('?')
                          ? `${bodyText}\n\n${ctaText}`
                          : bodyText;
                        triggerDirectProviderLaunch('mailto', {
                          to: report?.contactEmail || `contact@${cleanDomain}`,
                          subject: subjectLine,
                          body: fullBodyToSend,
                        });
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-orange-200 text-orange-800 hover:bg-orange-50 transition-colors shadow-2xs"
                    >
                      <Mail className="h-3.5 w-3.5 text-orange-600" />
                      <span>Custom Mail</span>
                    </button>
                  </div>
                </div>

                {/* Bottom Action Strip */}
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div className="text-[11px] text-slate-500 font-mono">
                    ✓ Saved to CRM Pipeline
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs transition-all active:scale-[0.98]"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-orange-600" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
                      <span>{copied ? 'Copied' : 'Copy Text'}</span>
                    </button>

                    {onNavigateToCrm && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigateToCrm();
                        }}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-orange-500 hover:bg-orange-600 text-white shadow-sm transition-all active:scale-[0.98]"
                      >
                        <span>Proceed to CRM Pipeline</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
