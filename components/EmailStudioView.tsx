'use client';

import React, { useState } from 'react';
import {
  Mail,
  Copy,
  Check,
  Download,
  Send,
  RefreshCw,
  SlidersHorizontal,
  ArrowRight
} from 'lucide-react';
import { EmailSequence, OutreachTone, AuditReport } from '@/lib/types';

interface EmailStudioViewProps {
  sequence: EmailSequence | null;
  audit: AuditReport | null;
  onRegenerateSequence: (tone: OutreachTone, agencyName: string, senderName: string, offer: string) => Promise<void>;
  isGenerating: boolean;
}

export const EmailStudioView: React.FC<EmailStudioViewProps> = ({
  sequence,
  onRegenerateSequence,
  isGenerating,
}) => {
  const [selectedTouchStep, setSelectedTouchStep] = useState<number>(1);
  const [selectedSubjectIndex, setSelectedSubjectIndex] = useState<number>(0);
  const [copiedSubjectIndex, setCopiedSubjectIndex] = useState<number | null>(null);
  const [copiedBody, setCopiedBody] = useState<boolean>(false);
  const [activeTone, setActiveTone] = useState<OutreachTone>(sequence?.tone || 'boutique_agency');
  const [agencyName, setAgencyName] = useState<string>('Apex Digital Studio');
  const [senderName, setSenderName] = useState<string>('Jordan');
  const [customOffer, setCustomOffer] = useState<string>('Free 2-minute mobile wireframe walkthrough');
  const [showConfig, setShowConfig] = useState<boolean>(false);

  // Active touch
  const currentTouch = sequence?.touches.find((t) => t.step === selectedTouchStep) || sequence?.touches[0];
  const activeSubject = currentTouch?.subjectLines[selectedSubjectIndex] || currentTouch?.subjectLines[0] || '';

  const handleStepSelect = (step: number) => {
    setSelectedTouchStep(step);
    setSelectedSubjectIndex(0);
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

  const handleOpenMailto = () => {
    if (!sequence || !currentTouch) return;
    const subject = encodeURIComponent(activeSubject);
    const body = encodeURIComponent(`${currentTouch.body}\n\n${currentTouch.cta}\n\nBest,\n${senderName}\n${agencyName}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  if (!sequence) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-sm">
        <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <Mail className="h-6 w-6" />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-slate-900 font-heading mb-2">
          No Email Sequence Generated Yet
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 mb-6">
          Scan any live website URL using the URL Scanner to automatically generate a personalized 4-touch cold outreach sequence.
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
              <span>4-Touch Redesign Sequence</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-medium text-slate-900 tracking-tight font-heading">
              Cold Outreach Studio
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl font-sans">
              {sequence.personalizationSummary}
            </p>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2">
            <button
              onClick={handleOpenMailto}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 text-xs font-medium rounded-xl sm:rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all active:scale-[0.98] whitespace-nowrap min-h-[40px] order-1 sm:order-3"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Open in Email Client</span>
            </button>

            <button
              onClick={() => setShowConfig(!showConfig)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 text-xs font-medium rounded-xl sm:rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all shadow-xs min-h-[40px] order-2 sm:order-1"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
              <span>Persona & Offer</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 text-xs font-medium rounded-xl sm:rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all shadow-xs min-h-[40px] order-3 sm:order-2"
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
                  className="w-full text-xs p-2.5 rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 min-h-[40px]"
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
                  className="w-full text-xs p-2.5 rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 min-h-[40px]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Sender Name</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 min-h-[40px]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Frictionless Offer</label>
                <input
                  type="text"
                  value={customOffer}
                  onChange={(e) => setCustomOffer(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 min-h-[40px]"
                />
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                onClick={() => onRegenerateSequence(activeTone, agencyName, senderName, customOffer)}
                disabled={isGenerating}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-50 min-h-[40px]"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'Regenerating...' : 'Regenerate Sequence with New Settings'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Touch Tabs & Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Sequence Stepper: Horizontal scroll on mobile, vertical stack on desktop */}
        <div className="lg:col-span-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1 block mb-2">
            Touch Cadence (Select to View)
          </span>

          <div className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
            {sequence.touches.map((touch) => {
              const isSelected = touch.step === selectedTouchStep;
              return (
                <button
                  key={touch.step}
                  onClick={() => handleStepSelect(touch.step)}
                  type="button"
                  className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between shrink-0 min-w-[170px] lg:min-w-0 lg:w-full min-h-[64px] ${
                    isSelected
                      ? 'bg-emerald-50/80 border-emerald-300 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 w-full gap-2">
                    <span
                      className={`text-xs font-mono font-semibold ${
                        isSelected ? 'text-emerald-800' : 'text-slate-500'
                      }`}
                    >
                      Touch #{touch.step}
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-slate-500 font-mono shrink-0">{touch.timing.split(' ')[0]}</span>
                  </div>
                  <h4
                    className={`text-xs sm:text-sm font-semibold truncate w-full ${
                      isSelected ? 'text-slate-950 font-heading' : 'text-slate-700'
                    }`}
                  >
                    {touch.title}
                  </h4>
                </button>
              );
            })}
          </div>

          {/* Quick Pitch Summary Box */}
          <div className="hidden lg:block p-3.5 rounded-xl bg-slate-100/80 border border-slate-200 mt-4 text-xs">
            <span className="font-semibold text-slate-700 block mb-1">Client Redesign Angle:</span>
            <p className="text-slate-600 leading-normal">
              {sequence.customRedesignPitch}
            </p>
          </div>
        </div>

        {/* Right Column: Active Email View */}
        {currentTouch && (
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-5">
            {/* Subject Lines A/B Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Subject Line Options (Tap to activate)
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
                          ? 'bg-emerald-50/70 border-emerald-300 text-slate-900 font-medium'
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
                          <Check className="h-4 w-4 text-emerald-600" />
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
                  onClick={() => handleCopy(`${currentTouch.body}\n\n${currentTouch.cta}`, 'body')}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-emerald-700 font-medium transition-colors min-h-[32px]"
                >
                  {copiedBody ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Email</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 sm:p-5 font-sans text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line select-text">
                {currentTouch.body}
                {'\n\n'}
                <span className="font-medium text-emerald-950 bg-emerald-50/80 px-1 py-0.5 rounded">
                  {currentTouch.cta}
                </span>
                {'\n\n'}
                <span className="text-slate-500 text-xs">
                  Best,{'\n'}
                  {senderName}{'\n'}
                  {agencyName}
                </span>
              </div>
            </div>

            {/* Quick Next Touch Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-mono text-[11px] truncate max-w-[160px] sm:max-w-none">
                {currentTouch.timing} · {currentTouch.title}
              </span>

              {selectedTouchStep < sequence.touches.length ? (
                <button
                  onClick={() => handleStepSelect(selectedTouchStep + 1)}
                  className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 transition-colors py-1 shrink-0"
                >
                  <span>Touch #{selectedTouchStep + 1}</span>
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
        )}
      </div>
    </div>
  );
};
