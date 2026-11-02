'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Copy,
  Check,
  Download,
  Send,
  RefreshCw,
  SlidersHorizontal,
  ArrowRight,
  ExternalLink,
  Server,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Sparkles,
  Settings,
  ChevronRight
} from 'lucide-react';
import { EmailSequence, OutreachTone, AuditReport, EmailProvider, UserProfile, Lead } from '@/lib/types';
import {
  EMAIL_PROVIDERS_META,
  getProviderComposeUrl,
  sendViaCustomSmtp,
  triggerDirectProviderLaunch
} from '@/lib/emailDispatcher';
import { getStoredUserProfile, updateLeadFollowUp, recordSequenceEvent } from '@/lib/storage';

interface EmailStudioViewProps {
  sequence: EmailSequence | null;
  audit: AuditReport | null;
  onRegenerateSequence: (tone: OutreachTone, agencyName: string, senderName: string, offer: string) => Promise<void>;
  isGenerating: boolean;
  onLeadStatusUpdated?: () => void;
  onOpenSettings?: () => void;
}

export const EmailStudioView: React.FC<EmailStudioViewProps> = ({
  sequence,
  audit,
  onRegenerateSequence,
  isGenerating,
  onLeadStatusUpdated,
  onOpenSettings,
}) => {
  const userProfile = getStoredUserProfile();
  const [selectedTouchStep, setSelectedTouchStep] = useState<number>(1);
  const [selectedSubjectIndex, setSelectedSubjectIndex] = useState<number>(0);
  const [copiedSubjectIndex, setCopiedSubjectIndex] = useState<number | null>(null);
  const [copiedBody, setCopiedBody] = useState<boolean>(false);
  const [activeTone, setActiveTone] = useState<OutreachTone>(sequence?.tone || 'boutique_agency');
  const [agencyName, setAgencyName] = useState<string>(userProfile.agencyName || 'Apex Digital Studio');
  const [senderName, setSenderName] = useState<string>(userProfile.senderName || 'Jordan');
  const [customOffer, setCustomOffer] = useState<string>(userProfile.defaultOffer || 'Free 2-minute mobile wireframe walkthrough');
  const [showConfig, setShowConfig] = useState<boolean>(false);

  // Provider choice
  const [selectedProvider, setSelectedProvider] = useState<EmailProvider>(
    userProfile.preferredProvider || 'gmail'
  );

  // Recipient email derived state with user edit override
  const defaultRecipientEmail = audit?.contactEmail
    ? audit.contactEmail
    : audit?.url
    ? `contact@${audit.url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '')}`
    : 'contact@domain.com';
  const [editedRecipientEmail, setEditedRecipientEmail] = useState<string | null>(null);
  const recipientEmail = editedRecipientEmail !== null ? editedRecipientEmail : defaultRecipientEmail;

  // Custom SMTP send states
  const [isSendingSmtp, setIsSendingSmtp] = useState<boolean>(false);
  const [sendFeedback, setSendFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [touchSentMap, setTouchSentMap] = useState<Record<number, { provider: EmailProvider; timestamp: string }>>({});

  // Active touch
  const currentTouch = sequence?.touches.find((t) => t.step === selectedTouchStep) || sequence?.touches[0];
  const activeSubject = currentTouch?.subjectLines[selectedSubjectIndex] || currentTouch?.subjectLines[0] || '';

  const handleStepSelect = (step: number) => {
    setSelectedTouchStep(step);
    setSelectedSubjectIndex(0);
    setSendFeedback(null);
  };

  const handleCopy = async (text: string, type: 'subject' | 'body', index?: number) => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'subject' && typeof index === 'number') {
        setCopiedSubjectIndex(index);
        setTimeout(() => setCopiedSubjectIndex(null), 2000);
      } else {
        setCopiedBody(true);
        setTimeout(() => setCopiedBody(false), 2000);
      }
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  const handleExportCSV = () => {
    if (!sequence) return;
    const rows = [
      ['Step', 'Timing', 'Title', 'Subject Option 1', 'Subject Option 2', 'Hook', 'Body', 'CTA'],
      ...sequence.touches.map((t) => [
        t.step.toString(),
        `"${t.timing}"`,
        `"${t.title}"`,
        `"${t.subjectLines[0] || ''}"`,
        `"${t.subjectLines[1] || ''}"`,
        `"${t.hook.replace(/"/g, '""')}"`,
        `"${t.body.replace(/"/g, '""')}"`,
        `"${t.cta.replace(/"/g, '""')}"`,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${sequence.companyName.toLowerCase().replace(/\s+/g, '_')}_cold_sequence.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFullBodyText = () => {
    if (!currentTouch) return '';
    const hasCta = currentTouch.body.includes(currentTouch.cta);
    const bodyWithCta = hasCta ? currentTouch.body : `${currentTouch.body}\n\n${currentTouch.cta}`;
    return `${bodyWithCta}\n\nBest,\n${senderName}\n${agencyName}`;
  };

  // Dispatch email through selected or explicit provider
  const handleDispatchEmail = async (overrideProvider?: EmailProvider) => {
    if (!sequence || !currentTouch) return;
    const providerToUse = overrideProvider || selectedProvider;
    const payload = {
      to: recipientEmail,
      subject: activeSubject,
      body: getFullBodyText(),
      touchStep: currentTouch.step,
      leadId: sequence.leadId,
      senderName,
      senderEmail: userProfile.gmailAccountEmail || userProfile.email || 'alex@apexstudio.io',
      agencyName,
    };

    if (providerToUse === 'custom_smtp') {
      const smtpConfig = userProfile.customSmtp;
      if (!smtpConfig || !smtpConfig.host || !smtpConfig.auth?.user) {
        setSendFeedback({
          success: false,
          message: 'Custom SMTP is not configured. Please enter your SMTP credentials in Settings.',
        });
        if (onOpenSettings) onOpenSettings();
        return;
      }

      setIsSendingSmtp(true);
      setSendFeedback(null);
      const result = await sendViaCustomSmtp(smtpConfig, payload);
      setIsSendingSmtp(false);

      if (result.success) {
        setSendFeedback({
          success: true,
          message: `Touch #${currentTouch.step} sent successfully to ${recipientEmail} via Custom SMTP!`,
        });
        recordTouchSent(currentTouch.step, 'custom_smtp');
      } else {
        setSendFeedback({
          success: false,
          message: result.error || 'Failed to dispatch email via SMTP server.',
        });
      }
      return;
    }

    // Gmail, Outlook, Yahoo, or Mailto deep-link launch
    triggerDirectProviderLaunch(providerToUse, payload);
    setSendFeedback({
      success: true,
      message: `Opened in ${EMAIL_PROVIDERS_META[providerToUse].name}! Review and hit send.`,
    });
    recordTouchSent(currentTouch.step, providerToUse);
  };

  const recordTouchSent = (step: number, provider: EmailProvider) => {
    setTouchSentMap((prev) => ({
      ...prev,
      [step]: { provider, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    }));

    if (sequence?.leadId) {
      updateLeadFollowUp(sequence.leadId, step, provider);
      if (sequence?.id) {
        recordSequenceEvent(sequence.id, 'sent', step);
      }
      if (onLeadStatusUpdated) onLeadStatusUpdated();
    }
  };

  const getTouchLabel = (step: number) => {
    switch (step) {
      case 1:
        return 'Initial Pitch';
      case 2:
        return 'Follow-up #1';
      case 3:
        return 'Follow-up #2';
      case 4:
        return 'Breakup';
      default:
        return `Touch #${step}`;
    }
  };

  if (!sequence) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-2xs font-sans animate-fade-in">
        <div className="h-12 w-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-4 border border-orange-200/60">
          <Mail className="h-6 w-6" />
        </div>
        <h3 className="text-base sm:text-lg font-medium text-slate-900 font-heading mb-2">
          No Email Sequence Generated Yet
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
          Scan any live website URL using the Prospect Scanner to automatically synthesize a high-converting 4-touch cold outreach sequence ready to send with Gmail, Outlook, Yahoo, or Custom Mail.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in font-sans">
      {/* Studio Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-1 flex-wrap">
              <span className="font-semibold text-slate-700 whitespace-nowrap">Prospect: {sequence.companyName}</span>
              <span aria-hidden="true" className="text-slate-300">/</span>
              <span className="text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200 text-[10px] whitespace-nowrap">
                4-Touch Cadence
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-medium text-slate-900 tracking-tight font-heading">
              Cold Outreach & Follow-up Studio
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl font-sans leading-normal">
              {sequence.personalizationSummary}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl border transition-all whitespace-nowrap ${
                showConfig
                  ? 'bg-orange-50 text-orange-900 border-orange-300 shadow-2xs font-semibold'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
              <span>Persona & Pitch</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all shadow-2xs whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Persona Customizer Drawer */}
        {showConfig && (
          <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 font-mono">
                Outreach Configuration
              </span>
              <span className="text-[11px] text-slate-500 whitespace-nowrap">Fine-tune tone, sender & frictionless offer</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1 whitespace-nowrap">Outreach Tone</label>
                <select
                  value={activeTone}
                  onChange={(e) => setActiveTone(e.target.value as OutreachTone)}
                  className="w-full text-xs p-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  <option value="boutique_agency">Boutique Agency (High Craft)</option>
                  <option value="freelancer">Freelance Developer (Peer-to-Peer)</option>
                  <option value="performance_roi">Performance / CRO Focused</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1 whitespace-nowrap">Agency Name</label>
                <input
                  type="text"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1 whitespace-nowrap">Sender Name</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1 whitespace-nowrap">Frictionless Offer</label>
                <input
                  type="text"
                  value={customOffer}
                  onChange={(e) => setCustomOffer(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => onRegenerateSequence(activeTone, agencyName, senderName, customOffer)}
                disabled={isGenerating}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-50 whitespace-nowrap shadow-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'Regenerating sequence...' : 'Update & Regenerate'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Column: Follow-up Cadence Rail (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono whitespace-nowrap">
              Follow-up Sequence
            </span>
            <span className="text-[10px] font-mono text-orange-800 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200/80 whitespace-nowrap">
              4 Steps
            </span>
          </div>

          {/* Stepper Cards */}
          <div className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
            {sequence.touches.map((touch) => {
              const isSelected = touch.step === selectedTouchStep;
              const sentInfo = touchSentMap[touch.step];
              return (
                <button
                  key={touch.step}
                  onClick={() => handleStepSelect(touch.step)}
                  type="button"
                  className={`text-left p-3.5 rounded-2xl border transition-all flex flex-col justify-between shrink-0 min-w-[220px] lg:min-w-0 lg:w-full ${
                    isSelected
                      ? 'bg-orange-50/90 border-orange-400 shadow-xs ring-1 ring-orange-300'
                      : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 w-full gap-2">
                    <span
                      className={`text-xs font-mono font-bold whitespace-nowrap ${
                        isSelected ? 'text-orange-900' : 'text-slate-800'
                      }`}
                    >
                      {getTouchLabel(touch.step)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0 whitespace-nowrap">
                      {touch.timing}
                    </span>
                  </div>

                  <h3
                    className={`text-xs font-semibold truncate w-full ${
                      isSelected ? 'text-slate-950 font-heading' : 'text-slate-700'
                    }`}
                  >
                    {touch.title}
                  </h3>

                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 w-full">
                    <span className="truncate max-w-[120px] text-slate-400">
                      {touch.step === 1 ? 'Diagnostic hook' : 'Value follow-up'}
                    </span>
                    {sentInfo ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-mono font-semibold whitespace-nowrap">
                        <Check className="h-2.5 w-2.5" /> Sent ({sentInfo.provider})
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono whitespace-nowrap">Ready</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Pitch Summary Box */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold block whitespace-nowrap">
              Audit Teardown Pitch Angle
            </span>
            <p className="text-xs text-slate-700 leading-relaxed">
              {sequence.customRedesignPitch}
            </p>
          </div>
        </div>

        {/* Right Column: Email Composer Canvas & Dispatch Bar (8 cols) */}
        {currentTouch && (
          <div className="lg:col-span-8 space-y-4">
            {/* Provider Selection Segmented Bar */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold block whitespace-nowrap">
                    Choose Email Provider
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select your preferred client to launch or send this touch with 1 click.
                  </p>
                </div>

                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-orange-600 font-medium transition-colors whitespace-nowrap"
                  >
                    <Settings className="h-3.5 w-3.5 text-slate-400" />
                    <span>SMTP Settings</span>
                  </button>
                )}
              </div>

              {/* 4 Branded Provider Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* 1. Gmail */}
                <button
                  type="button"
                  onClick={() => setSelectedProvider('gmail')}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all text-left whitespace-nowrap ${
                    selectedProvider === 'gmail'
                      ? 'border-red-400 bg-red-50/70 ring-1 ring-red-300 text-slate-900 shadow-2xs font-semibold'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="p-1 rounded-lg bg-red-50 text-red-600 shrink-0">
                    <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                      <path d={EMAIL_PROVIDERS_META.gmail.iconSvg} />
                    </svg>
                  </div>
                  <span className="text-xs truncate">Gmail</span>
                </button>

                {/* 2. Outlook */}
                <button
                  type="button"
                  onClick={() => setSelectedProvider('outlook')}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all text-left whitespace-nowrap ${
                    selectedProvider === 'outlook'
                      ? 'border-sky-400 bg-sky-50/70 ring-1 ring-sky-300 text-slate-900 shadow-2xs font-semibold'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="p-1 rounded-lg bg-sky-50 text-sky-600 shrink-0">
                    <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                      <path d={EMAIL_PROVIDERS_META.outlook.iconSvg} />
                    </svg>
                  </div>
                  <span className="text-xs truncate">Outlook</span>
                </button>

                {/* 3. Yahoo */}
                <button
                  type="button"
                  onClick={() => setSelectedProvider('yahoo')}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all text-left whitespace-nowrap ${
                    selectedProvider === 'yahoo'
                      ? 'border-purple-400 bg-purple-50/70 ring-1 ring-purple-300 text-slate-900 shadow-2xs font-semibold'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="p-1 rounded-lg bg-purple-50 text-purple-600 shrink-0">
                    <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                      <path d={EMAIL_PROVIDERS_META.yahoo.iconSvg} />
                    </svg>
                  </div>
                  <span className="text-xs truncate">Yahoo Mail</span>
                </button>

                {/* 4. Custom Mail */}
                <button
                  type="button"
                  onClick={() => setSelectedProvider('custom_smtp')}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all text-left whitespace-nowrap ${
                    selectedProvider === 'custom_smtp'
                      ? 'border-orange-400 bg-orange-50/70 ring-1 ring-orange-300 text-slate-900 shadow-2xs font-semibold'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="p-1 rounded-lg bg-orange-50 text-orange-600 shrink-0">
                    <Server className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs truncate">Custom Mail</span>
                </button>
              </div>

              {/* Recipient Target & Primary Dispatch Button */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <span className="text-xs font-semibold text-slate-500 font-mono whitespace-nowrap">To:</span>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setEditedRecipientEmail(e.target.value)}
                    placeholder="contact@domain.com"
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleDispatchEmail()}
                  disabled={isSendingSmtp}
                  className={`inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl text-white shadow-xs transition-all active:scale-[0.98] whitespace-nowrap shrink-0 ${
                    selectedProvider === 'gmail'
                      ? 'bg-red-600 hover:bg-red-500'
                      : selectedProvider === 'outlook'
                      ? 'bg-sky-600 hover:bg-sky-500'
                      : selectedProvider === 'yahoo'
                      ? 'bg-purple-600 hover:bg-purple-500'
                      : 'bg-orange-500 hover:bg-orange-600'
                  }`}
                >
                  {isSendingSmtp ? (
                    <>
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Sending via SMTP...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>
                        Send {getTouchLabel(selectedTouchStep)} via {EMAIL_PROVIDERS_META[selectedProvider].shortName}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Feedback Alert */}
              {sendFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
                    sendFeedback.success
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      : 'bg-rose-50 text-rose-900 border-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {sendFeedback.success ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    )}
                    <span>{sendFeedback.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSendFeedback(null)}
                    className="text-[11px] underline ml-2 opacity-80 hover:opacity-100"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>

            {/* Email Composer Mockup Canvas */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              {/* Mockup Header Toolbar */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-orange-900 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200/80 whitespace-nowrap">
                    {getTouchLabel(currentTouch.step)} · {currentTouch.timing}
                  </span>
                  <span className="text-xs text-slate-500 hidden sm:inline truncate max-w-sm">
                    {currentTouch.title}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => recordTouchSent(currentTouch.step, selectedProvider)}
                    className="text-xs text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors whitespace-nowrap shadow-2xs"
                    title="Manually mark this touch as dispatched"
                  >
                    <Check className="h-3 w-3 text-emerald-600" />
                    <span>Mark Sent</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy(getFullBodyText(), 'body')}
                    className="text-xs text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors whitespace-nowrap shadow-2xs"
                  >
                    {copiedBody ? (
                      <>
                        <Check className="h-3 w-3 text-orange-600" />
                        <span className="text-orange-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy Email</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Subject Line A/B Selector */}
              <div className="p-4 sm:p-5 border-b border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold whitespace-nowrap">
                    Subject Line A/B Test (Select to send)
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Click to activate</span>
                </div>

                <div className="space-y-2">
                  {currentTouch.subjectLines.map((subj, sIdx) => {
                    const isSubjectActive = selectedSubjectIndex === sIdx;
                    return (
                      <div
                        key={sIdx}
                        onClick={() => setSelectedSubjectIndex(sIdx)}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                          isSubjectActive
                            ? 'bg-orange-50/70 border-orange-300 text-slate-900 font-medium shadow-2xs'
                            : 'bg-slate-50/60 border-slate-200/80 text-slate-700 hover:bg-slate-100/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 text-xs sm:text-sm min-w-0">
                          <span className="font-mono text-xs font-bold text-slate-400 shrink-0 whitespace-nowrap">
                            Option {String.fromCharCode(65 + sIdx)}:
                          </span>
                          <span className="truncate">{subj}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(subj, 'subject', sIdx);
                          }}
                          title="Copy subject line"
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition-colors shrink-0 ml-2"
                        >
                          {copiedSubjectIndex === sIdx ? (
                            <Check className="h-3.5 w-3.5 text-orange-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Email Body Prose View */}
              <div className="p-5 sm:p-6 space-y-4">
                <div className="text-xs sm:text-sm text-slate-800 leading-relaxed font-sans space-y-3 whitespace-pre-line select-text">
                  {currentTouch.body}
                </div>

                {/* Callout Offer CTA */}
                {!currentTouch.body.includes(currentTouch.cta) && (
                  <div className="p-3.5 rounded-xl bg-orange-50/80 border border-orange-200/80 text-xs sm:text-sm font-medium text-orange-950 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-orange-600 shrink-0" />
                    <span>{currentTouch.cta}</span>
                  </div>
                )}

                {/* Signature */}
                <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 font-sans space-y-0.5">
                  <span className="block font-medium text-slate-700">Best regards,</span>
                  <span className="block text-slate-800 font-semibold">{senderName}</span>
                  <span className="block text-slate-500">{agencyName}</span>
                </div>
              </div>

              {/* Step Navigation Footer */}
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50/40">
                <span className="text-slate-500 font-mono text-[11px] truncate whitespace-nowrap">
                  {currentTouch.timing} · {currentTouch.title}
                </span>

                <div className="flex items-center gap-3">
                  {selectedTouchStep > 1 && (
                    <button
                      type="button"
                      onClick={() => handleStepSelect(selectedTouchStep - 1)}
                      className="font-medium text-slate-600 hover:text-slate-900 transition-colors py-1 whitespace-nowrap"
                    >
                      ← Previous Touch
                    </button>
                  )}

                  {selectedTouchStep < sequence.touches.length ? (
                    <button
                      type="button"
                      onClick={() => handleStepSelect(selectedTouchStep + 1)}
                      className="inline-flex items-center gap-1 font-semibold text-orange-600 hover:text-orange-700 transition-colors py-1 whitespace-nowrap"
                    >
                      <span>Next Follow-up ({getTouchLabel(selectedTouchStep + 1)})</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStepSelect(1)}
                      className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-800 transition-colors py-1 whitespace-nowrap"
                    >
                      <span>Back to Touch #1</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
