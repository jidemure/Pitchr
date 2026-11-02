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
  Settings
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
      senderEmail: userProfile.gmailAccountEmail || userProfile.email || 'julian.veloceai@gmail.com',
      agencyName,
    };

    if (providerToUse === 'custom_smtp') {
      const smtpConfig = userProfile.customSmtp;
      if (!smtpConfig || !smtpConfig.host || !smtpConfig.auth?.user) {
        setSendFeedback({
          success: false,
          message: 'Custom SMTP is not yet configured. Please enter your SMTP credentials in Settings.',
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
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-sm">
        <div className="h-12 w-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-4">
          <Mail className="h-6 w-6" />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-slate-900 font-heading mb-2">
          No Email Sequence Generated Yet
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 mb-6">
          Scan any live website URL using the URL Scanner to automatically generate a personalized 4-touch cold outreach sequence ready to send with Gmail, Outlook, Yahoo, or Custom mail.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Studio Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500 mb-1">
              <span>Client: {sequence.companyName}</span>
              <span aria-hidden="true" className="text-slate-300">/</span>
              <span>4-Touch Outreach & Follow-Up Sequence</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-medium text-slate-900 tracking-tight font-heading">
              Cold Outreach & Follow-up Studio
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl font-sans">
              {sequence.personalizationSummary}
            </p>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all shadow-xs min-h-[38px]"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
              <span>Persona & Pitch</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all shadow-xs min-h-[38px]"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Persona Customizer Drawer */}
        {showConfig && (
          <div className="mt-4 sm:mt-5 pt-4 sm:pt-5 border-t border-slate-100 bg-slate-50/70 p-3.5 sm:p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Outreach Configuration
              </span>
              <span className="text-[11px] text-slate-500">Fine-tune tone & offer</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Outreach Tone</label>
                <select
                  value={activeTone}
                  onChange={(e) => setActiveTone(e.target.value as OutreachTone)}
                  className="w-full text-xs p-2.5 rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 min-h-[38px]"
                >
                  <option value="boutique_agency">Boutique Agency (High Craft)</option>
                  <option value="freelancer">Freelance Developer (Peer-to-Peer)</option>
                  <option value="performance_roi">Performance / CRO Focused</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Agency Name</label>
                <input
                  type="text"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 min-h-[38px]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Sender Name</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 min-h-[38px]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Frictionless Offer</label>
                <input
                  type="text"
                  value={customOffer}
                  onChange={(e) => setCustomOffer(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 min-h-[38px]"
                />
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                onClick={() => onRegenerateSequence(activeTone, agencyName, senderName, customOffer)}
                disabled={isGenerating}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-50 min-h-[38px]"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'Regenerating...' : 'Regenerate Sequence with New Settings'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DISPATCH & PROVIDER SELECTION BAR (Gmail, Outlook, Yahoo, Custom Mail) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold block">
              CHOOSE EMAIL PROVIDER
            </span>
            <p className="text-xs text-slate-600 mt-0.5">
              Select which service you want to use for dispatching this cold pitch and its scheduled follow-ups.
            </p>
          </div>

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-orange-600 font-medium transition-colors"
            >
              <Settings className="h-3.5 w-3.5 text-slate-400" />
              <span>Configure Providers & SMTP</span>
            </button>
          )}
        </div>

        {/* The 4 Distinct Provider Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          {/* 1. Gmail */}
          <button
            type="button"
            onClick={() => setSelectedProvider('gmail')}
            className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left ${
              selectedProvider === 'gmail'
                ? 'border-red-500 bg-red-50/70 shadow-xs ring-1 ring-red-400 text-slate-900'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div className="p-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 shrink-0">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d={EMAIL_PROVIDERS_META.gmail.iconSvg} />
              </svg>
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">Gmail</span>
              <span className="text-[10px] text-slate-500 block truncate">1-Click Web Compose</span>
            </div>
          </button>

          {/* 2. Outlook */}
          <button
            type="button"
            onClick={() => setSelectedProvider('outlook')}
            className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left ${
              selectedProvider === 'outlook'
                ? 'border-sky-500 bg-sky-50/70 shadow-xs ring-1 ring-sky-400 text-slate-900'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div className="p-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-600 shrink-0">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d={EMAIL_PROVIDERS_META.outlook.iconSvg} />
              </svg>
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">Outlook</span>
              <span className="text-[10px] text-slate-500 block truncate">Office 365 Web</span>
            </div>
          </button>

          {/* 3. Yahoo */}
          <button
            type="button"
            onClick={() => setSelectedProvider('yahoo')}
            className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left ${
              selectedProvider === 'yahoo'
                ? 'border-purple-500 bg-purple-50/70 shadow-xs ring-1 ring-purple-400 text-slate-900'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div className="p-1.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-600 shrink-0">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d={EMAIL_PROVIDERS_META.yahoo.iconSvg} />
              </svg>
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">Yahoo Mail</span>
              <span className="text-[10px] text-slate-500 block truncate">Yahoo Compose</span>
            </div>
          </button>

          {/* 4. Custom Mail / SMTP */}
          <button
            type="button"
            onClick={() => setSelectedProvider('custom_smtp')}
            className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left ${
              selectedProvider === 'custom_smtp'
                ? 'border-orange-500 bg-orange-50/70 shadow-xs ring-1 ring-orange-400 text-slate-900'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div className="p-1.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 shrink-0">
              <Server className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">Custom Mail</span>
              <span className="text-[10px] text-slate-500 block truncate">
                {userProfile.customSmtp?.configured ? 'SMTP Connected' : 'Dedicated SMTP'}
              </span>
            </div>
          </button>
        </div>

        {/* Recipient Target Email & Dispatch Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-slate-600 font-mono whitespace-nowrap">To:</span>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setEditedRecipientEmail(e.target.value)}
              placeholder="recipient@domain.com"
              className="flex-1 px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono min-h-[38px]"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Primary Dispatch Action */}
            <button
              onClick={() => handleDispatchEmail()}
              disabled={isSendingSmtp}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl text-white shadow-xs transition-all active:scale-[0.98] min-h-[40px] ${
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

            {/* Quick 1-Click Launch for all 3 other providers without switching primary */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <span className="text-[10px] font-mono text-slate-500 px-1.5 uppercase">Quick:</span>
              <button
                type="button"
                onClick={() => handleDispatchEmail('gmail')}
                title="Direct launch in Gmail"
                className="px-2 py-1 text-[11px] font-medium rounded-lg hover:bg-white text-slate-700 hover:text-red-600 transition-colors"
              >
                Gmail
              </button>
              <button
                type="button"
                onClick={() => handleDispatchEmail('outlook')}
                title="Direct launch in Outlook"
                className="px-2 py-1 text-[11px] font-medium rounded-lg hover:bg-white text-slate-700 hover:text-sky-600 transition-colors"
              >
                Outlook
              </button>
              <button
                type="button"
                onClick={() => handleDispatchEmail('yahoo')}
                title="Direct launch in Yahoo"
                className="px-2 py-1 text-[11px] font-medium rounded-lg hover:bg-white text-slate-700 hover:text-purple-600 transition-colors"
              >
                Yahoo
              </button>
              <button
                type="button"
                onClick={() => handleDispatchEmail('mailto')}
                title="Open in default mail client"
                className="px-2 py-1 text-[11px] font-medium rounded-lg hover:bg-white text-slate-700 hover:text-slate-900 transition-colors"
              >
                Mail App
              </button>
            </div>
          </div>
        </div>

        {/* Feedback message */}
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
              onClick={() => setSendFeedback(null)}
              className="text-[11px] underline ml-2 opacity-80 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Main Touch Tabs & Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Sequence Stepper: Follow-ups Navigation Cadence */}
        <div className="lg:col-span-1 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Sequence Follow-ups
            </span>
            <span className="text-[10px] font-mono text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
              4 Steps
            </span>
          </div>

          <div className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
            {sequence.touches.map((touch) => {
              const isSelected = touch.step === selectedTouchStep;
              const sentInfo = touchSentMap[touch.step];
              return (
                <button
                  key={touch.step}
                  onClick={() => handleStepSelect(touch.step)}
                  type="button"
                  className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between shrink-0 min-w-[200px] lg:min-w-0 lg:w-full min-h-[76px] ${
                    isSelected
                      ? 'bg-orange-50/90 border-orange-400 shadow-xs ring-1 ring-orange-300'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 w-full gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-mono font-bold ${
                          isSelected ? 'text-orange-800' : 'text-slate-700'
                        }`}
                      >
                        {getTouchLabel(touch.step)}
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-500 font-mono shrink-0">
                      {touch.timing.split(' ')[0]}
                    </span>
                  </div>

                  <h4
                    className={`text-xs font-semibold truncate w-full ${
                      isSelected ? 'text-slate-950 font-heading' : 'text-slate-700'
                    }`}
                  >
                    {touch.title}
                  </h4>

                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                    <span>{touch.step === 1 ? 'Diagnostic hook' : `Follow-up sequence`}</span>
                    {sentInfo ? (
                      <span className="inline-flex items-center gap-1 text-orange-700 font-mono font-medium">
                        <Check className="h-2.5 w-2.5" /> Sent ({sentInfo.provider})
                      </span>
                    ) : (
                      <span className="text-slate-400">Ready</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Pitch Summary Box */}
          <div className="hidden lg:block p-3.5 rounded-xl bg-slate-100/80 border border-slate-200 mt-4 text-xs">
            <span className="font-semibold text-slate-700 block mb-1">Audit Teardown Pitch Angle:</span>
            <p className="text-slate-600 leading-normal">
              {sequence.customRedesignPitch}
            </p>
          </div>
        </div>

        {/* Right Column: Active Email View */}
        {currentTouch && (
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-5">
            {/* Step Header Badge & Provider Quick Indicator */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-orange-800 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200/80">
                  {getTouchLabel(currentTouch.step)} · {currentTouch.timing}
                </span>
                <span className="text-xs text-slate-500 hidden sm:inline">
                  {currentTouch.title}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => recordTouchSent(currentTouch.step, selectedProvider)}
                  className="text-xs text-slate-500 hover:text-orange-600 font-medium inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                  title="Manually mark this touch as sent"
                >
                  <Check className="h-3 w-3" />
                  <span>Mark Sent</span>
                </button>
              </div>
            </div>

            {/* Subject Lines A/B Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Subject Line Options (Tap to select for send)
                </span>
                <span className="text-[11px] text-slate-400 font-mono">A/B Testing</span>
              </div>

              <div className="space-y-2">
                {currentTouch.subjectLines.map((subj, sIdx) => {
                  const isSubjectActive = selectedSubjectIndex === sIdx;
                  return (
                    <div
                      key={sIdx}
                      onClick={() => setSelectedSubjectIndex(sIdx)}
                      className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl border cursor-pointer transition-all min-h-[44px] ${
                        isSubjectActive
                          ? 'bg-orange-50/70 border-orange-300 text-slate-900 font-medium'
                          : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
                        <span className="font-mono text-xs text-slate-400 shrink-0">
                          {String.fromCharCode(65 + sIdx)}:
                        </span>
                        <span className="truncate">{subj}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(subj, 'subject', sIdx);
                        }}
                        title="Copy subject line"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition-colors shrink-0 ml-2"
                        aria-label="Copy subject line"
                      >
                        {copiedSubjectIndex === sIdx ? (
                          <Check className="h-4 w-4 text-orange-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Email Body Content */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Email Message Body
                </span>
                <button
                  onClick={() => handleCopy(getFullBodyText(), 'body')}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-orange-600 font-medium transition-colors min-h-[32px]"
                >
                  {copiedBody ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-orange-600" />
                      <span className="text-orange-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Full Email</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 sm:p-5 font-sans text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line select-text">
                {currentTouch.body}
                {!currentTouch.body.includes(currentTouch.cta) && (
                  <>
                    {'\n\n'}
                    <span className="font-medium text-orange-950 bg-orange-50/80 px-1 py-0.5 rounded">
                      {currentTouch.cta}
                    </span>
                  </>
                )}
                {'\n\n'}
                <span className="text-slate-500 text-xs">
                  Best,{'\n'}
                  {senderName}{'\n'}
                  {agencyName}
                </span>
              </div>
            </div>

            {/* Bottom Stepper Navigation */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-mono text-[11px] truncate max-w-[160px] sm:max-w-none">
                {currentTouch.timing} · {currentTouch.title}
              </span>

              <div className="flex items-center gap-3">
                {selectedTouchStep > 1 && (
                  <button
                    onClick={() => handleStepSelect(selectedTouchStep - 1)}
                    className="font-medium text-slate-600 hover:text-slate-900 transition-colors py-1 shrink-0"
                  >
                    ← Previous Touch
                  </button>
                )}

                {selectedTouchStep < sequence.touches.length ? (
                  <button
                    onClick={() => handleStepSelect(selectedTouchStep + 1)}
                    className="inline-flex items-center gap-1 font-semibold text-orange-600 hover:text-orange-700 transition-colors py-1 shrink-0"
                  >
                    <span>Next Follow-up ({getTouchLabel(selectedTouchStep + 1)})</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleStepSelect(1)}
                    className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-800 transition-colors py-1 shrink-0"
                  >
                    <span>Back to Touch #1</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
