'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Sparkles, Globe, Smartphone, Gauge, FileCode } from 'lucide-react';

interface AuditScannerProgressProps {
  url: string;
}

export const AuditScannerProgress: React.FC<AuditScannerProgressProps> = ({ url }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { label: 'Fetching DOM & Assets', icon: Globe, detail: `Connecting to ${url}...` },
    { label: 'Extracting Meta & SEO Tags', icon: FileCode, detail: 'Checking title, OpenGraph, and Schema.org markup' },
    { label: 'Auditing Mobile Responsiveness', icon: Smartphone, detail: 'Inspecting viewport tags and layout density' },
    { label: 'Measuring Performance Indicators', icon: Gauge, detail: 'Estimating payload weight and render blockers' },
    { label: 'Gemini AI Design & UX Critique', icon: Sparkles, detail: 'Synthesizing visual flaws and conversion blockers' },
  ];

  useEffect(() => {
    const timer1 = setTimeout(() => setCurrentStep(1), 700);
    const timer2 = setTimeout(() => setCurrentStep(2), 1500);
    const timer3 = setTimeout(() => setCurrentStep(3), 2300);
    const timer4 = setTimeout(() => setCurrentStep(4), 3200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, []);

  return (
    <div className="max-w-xl mx-auto my-6 sm:my-8 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs">
      <div className="flex items-center gap-3 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-slate-100">
        <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-medium text-slate-900 font-heading">
            Live Analysis in Progress
          </h3>
          <p className="text-xs text-slate-500 font-mono truncate max-w-xs sm:max-w-sm">
            Target: {url}
          </p>
        </div>
      </div>

      <div className="space-y-3.5">
        {steps.map((step, idx) => {
          const isDone = idx < currentStep;
          const isCurrent = idx === currentStep;
          const Icon = step.icon;

          return (
            <div
              key={step.label}
              className={`flex items-start gap-3 p-2.5 rounded-lg transition-all ${
                isCurrent
                  ? 'bg-emerald-50/70 border border-emerald-200/60'
                  : isDone
                  ? 'bg-slate-50/50'
                  : 'opacity-50'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : isCurrent ? (
                  <Loader2 className="h-4 w-4 text-emerald-600 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4 text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-medium ${
                      isCurrent ? 'text-emerald-950 font-semibold' : isDone ? 'text-slate-800' : 'text-slate-500'
                    }`}
                  >
                    {step.label}
                  </span>
                  {isDone && <span className="text-[11px] text-emerald-700 font-mono">Completed</span>}
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {step.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
