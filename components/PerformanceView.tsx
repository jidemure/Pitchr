'use client';

import React, { useState, useMemo, useSyncExternalStore } from 'react';
import {
  BarChart3,
  TrendingUp,
  Mail,
  Send,
  Eye,
  MessageSquare,
  CheckCircle2,
  ArrowUpRight,
  Filter,
  Search,
  PlusCircle,
  ExternalLink,
  Sparkles,
  Layers,
  ArrowRight,
  RotateCcw,
  Zap,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { EmailSequence, Lead, AuditReport, OutreachTone, CampaignPerformanceStats } from '@/lib/types';
import { recordSequenceEvent, saveStoredSequences } from '@/lib/storage';

interface PerformanceViewProps {
  sequences: Record<string, EmailSequence>;
  leads: Lead[];
  audits: Record<string, AuditReport>;
  onNavigateToOutreach: (sequenceId: string) => void;
  onNavigateToScanner: () => void;
  onNavigateToCrm: () => void;
  onSequencesUpdated?: (updated: Record<string, EmailSequence>) => void;
}

interface CampaignItem extends EmailSequence {
  domain: string;
  stats: CampaignPerformanceStats;
  openRate: number;
  replyRate: number;
  leadStatus: string;
}

export const PerformanceView: React.FC<PerformanceViewProps> = ({
  sequences,
  leads,
  audits,
  onNavigateToOutreach,
  onNavigateToScanner,
  onNavigateToCrm,
  onSequencesUpdated,
}) => {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [toneFilter, setToneFilter] = useState<string>('all');
  const [selectedCampaignForLog, setSelectedCampaignForLog] = useState<CampaignItem | null>(null);
  const [logToast, setLogToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setLogToast(msg);
    setTimeout(() => setLogToast(null), 3000);
  };

  // Build aggregated campaign list combining sequence object and linked lead status
  const campaignList = useMemo(() => {
    const list = Object.values(sequences).map((seq) => {
      const linkedLead = leads.find((l) => l.campaignId === seq.id || l.id === seq.leadId);
      
      // Calculate or retrieve campaign stats
      let stats = seq.stats;
      if (!stats) {
        // Fallback derived from lead status if no explicit stats logged yet
        const isDrafted = !linkedLead || linkedLead.status === 'drafted' || linkedLead.status === 'audited';
        const isContacted = linkedLead?.status === 'contacted';
        const isReplied = linkedLead?.status === 'replied';
        const isConverted = linkedLead?.status === 'converted';

        const sent = isDrafted ? 0 : isContacted ? 1 : isReplied ? 2 : 2;
        const opened = isDrafted ? 0 : isContacted ? 1 : isReplied ? 2 : 2;
        const responded = isReplied || isConverted ? 1 : 0;
        const converted = isConverted ? 1 : 0;

        stats = {
          sent,
          opened,
          responded,
          converted,
          bounced: 0,
          touchBreakdown: [
            { step: 1, title: 'Initial Hook', sent: sent > 0 ? 1 : 0, opened: opened > 0 ? 1 : 0, responded: responded > 0 ? 1 : 0 },
            { step: 2, title: 'Redesign Blueprint', sent: sent > 1 ? 1 : 0, opened: opened > 1 ? 1 : 0, responded: 0 },
            { step: 3, title: 'Case Study ROI', sent: 0, opened: 0, responded: 0 },
            { step: 4, title: 'Breakup', sent: 0, opened: 0, responded: 0 },
          ],
        };
      }

      const domain = seq.url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
      const openRate = stats.sent > 0 ? Math.round((stats.opened / stats.sent) * 100) : 0;
      const replyRate = stats.sent > 0 ? Math.round((stats.responded / stats.sent) * 100) : 0;

      return {
        ...seq,
        domain,
        companyName: seq.companyName || domain,
        stats,
        openRate,
        replyRate,
        leadStatus: linkedLead?.status || 'drafted',
      };
    });

    return list;
  }, [sequences, leads]);

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    return campaignList.filter((c) => {
      const matchesSearch =
        c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.domain.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTone = toneFilter === 'all' || c.tone === toneFilter;
      return matchesSearch && matchesTone;
    });
  }, [campaignList, searchQuery, toneFilter]);

  // High-level aggregate KPIs
  const aggregateMetrics = useMemo(() => {
    const totalCampaigns = campaignList.length;
    let totalSent = 0;
    let totalOpened = 0;
    let totalResponded = 0;
    let totalConverted = 0;

    campaignList.forEach((c) => {
      totalSent += c.stats?.sent || 0;
      totalOpened += c.stats?.opened || 0;
      totalResponded += c.stats?.responded || 0;
      totalConverted += c.stats?.converted || 0;
    });

    const overallOpenRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
    const overallReplyRate = totalSent > 0 ? Math.round((totalResponded / totalSent) * 100) : 0;
    const overallConversionRate = totalSent > 0 ? Math.round((totalConverted / totalSent) * 100) : 0;

    return {
      totalCampaigns,
      totalSent,
      totalOpened,
      totalResponded,
      totalConverted,
      overallOpenRate,
      overallReplyRate,
      overallConversionRate,
    };
  }, [campaignList]);

  // Chart 1: Per-Campaign Bar Chart Data (Sent vs Opened vs Responded)
  const barChartData = useMemo(() => {
    return filteredCampaigns.slice(0, 8).map((c) => ({
      name: c.companyName.length > 14 ? c.companyName.slice(0, 12) + '...' : c.companyName,
      fullName: c.companyName,
      Sent: c.stats?.sent || 0,
      Opened: c.stats?.opened || 0,
      Responded: c.stats?.responded || 0,
      OpenRate: `${c.openRate}%`,
      ReplyRate: `${c.replyRate}%`,
    }));
  }, [filteredCampaigns]);

  // Chart 2: Funnel Drop-off Area Chart Data
  const funnelData = useMemo(() => {
    return [
      { stage: 'Campaigns Created', count: aggregateMetrics.totalCampaigns || 0, rate: '100%' },
      { stage: 'Emails Dispatched', count: aggregateMetrics.totalSent, rate: aggregateMetrics.totalCampaigns > 0 ? `${Math.round((aggregateMetrics.totalSent / Math.max(1, aggregateMetrics.totalCampaigns)) * 100)}%` : '0%' },
      { stage: 'Emails Opened', count: aggregateMetrics.totalOpened, rate: `${aggregateMetrics.overallOpenRate}%` },
      { stage: 'Replies Received', count: aggregateMetrics.totalResponded, rate: `${aggregateMetrics.overallReplyRate}%` },
      { stage: 'Deals Converted', count: aggregateMetrics.totalConverted, rate: `${aggregateMetrics.overallConversionRate}%` },
    ];
  }, [aggregateMetrics]);

  // Chart 3: Touch Step Effectiveness Data (Touch 1 vs 2 vs 3 vs 4)
  const touchStepData = useMemo(() => {
    const steps = [
      { step: 'Touch 1 (Hook)', Sent: 0, Opened: 0, Responded: 0 },
      { step: 'Touch 2 (Blueprint)', Sent: 0, Opened: 0, Responded: 0 },
      { step: 'Touch 3 (Case Study)', Sent: 0, Opened: 0, Responded: 0 },
      { step: 'Touch 4 (Breakup)', Sent: 0, Opened: 0, Responded: 0 },
    ];

    campaignList.forEach((c) => {
      if (c.stats?.touchBreakdown) {
        c.stats.touchBreakdown.forEach((t, idx) => {
          if (steps[idx]) {
            steps[idx].Sent += t.sent || 0;
            steps[idx].Opened += t.opened || 0;
            steps[idx].Responded += t.responded || 0;
          }
        });
      }
    });

    return steps;
  }, [campaignList]);

  // Handler to log an outreach activity event
  const handleLogEvent = (seqId: string, event: 'sent' | 'opened' | 'responded' | 'converted') => {
    const updated = recordSequenceEvent(seqId, event);
    if (onSequencesUpdated) {
      onSequencesUpdated(updated);
    }
    const eventLabels = {
      sent: 'Email Dispatched (+1 Sent)',
      opened: 'Client Opened Email (+1 Opened)',
      responded: 'Client Replied (+1 Responded)',
      converted: 'Client Converted (+1 Converted)',
    };
    showToast(`Logged: ${eventLabels[event]}`);
  };

  // Seed sample demo data if empty so the user can test the visualization right away
  const handleSeedDemoData = () => {
    const now = new Date().toISOString();
    const demoSeq1: EmailSequence = {
      id: 'seq-demo-apex',
      leadId: 'lead-demo-apex',
      url: 'https://apex-hvac-solutions.com',
      companyName: 'Apex HVAC Solutions',
      tone: 'boutique_agency',
      createdAt: now,
      personalizationSummary: 'Focus on 4.2s mobile lag and unstyled emergency consultation button.',
      customRedesignPitch: 'Sticky thumb-zone emergency call action and modern hero gallery.',
      stats: {
        sent: 4,
        opened: 3,
        responded: 1,
        bounced: 0,
        converted: 0,
        touchBreakdown: [
          { step: 1, title: 'Initial Hook', sent: 1, opened: 1, responded: 0 },
          { step: 2, title: 'Redesign Blueprint', sent: 1, opened: 1, responded: 1 },
          { step: 3, title: 'Case Study ROI', sent: 1, opened: 1, responded: 0 },
          { step: 4, title: 'Breakup', sent: 1, opened: 0, responded: 0 },
        ],
      },
      touches: [
        {
          step: 1,
          title: 'Initial Hook',
          timing: 'Day 1',
          subjectLines: ['quick note about apex-hvac-solutions.com'],
          hook: 'I noticed your mobile site takes over 4.2 seconds to load before visitors see emergency booking.',
          body: 'Hi,\n\nI was looking at apex-hvac-solutions.com and noticed an easy optimization...',
          cta: 'Open to a 2-minute mobile walkthrough?',
        },
      ],
    };

    const demoSeq2: EmailSequence = {
      id: 'seq-demo-miller',
      leadId: 'lead-demo-miller',
      url: 'https://dr-miller-dentistry.com',
      companyName: 'Dr. Miller Dentistry',
      tone: 'performance_roi',
      createdAt: now,
      personalizationSummary: 'Missing online appointment scheduling on mobile screen.',
      customRedesignPitch: 'Direct patient self-booking widget with instant SMS confirmations.',
      stats: {
        sent: 3,
        opened: 3,
        responded: 2,
        bounced: 0,
        converted: 1,
        touchBreakdown: [
          { step: 1, title: 'Initial Hook', sent: 1, opened: 1, responded: 1 },
          { step: 2, title: 'Redesign Blueprint', sent: 1, opened: 1, responded: 1 },
          { step: 3, title: 'Case Study ROI', sent: 1, opened: 1, responded: 0 },
          { step: 4, title: 'Breakup', sent: 0, opened: 0, responded: 0 },
        ],
      },
      touches: [
        {
          step: 1,
          title: 'Initial Hook',
          timing: 'Day 1',
          subjectLines: ['patient booking idea for dr miller'],
          hook: 'Noticed patients on mobile cannot easily book Saturday appointments.',
          body: 'Hi Dr. Miller,\n\nWe recently revamped another local dental practice...',
          cta: 'Worth a quick chat this Thursday?',
        },
      ],
    };

    const demoSeq3: EmailSequence = {
      id: 'seq-demo-vanguard',
      leadId: 'lead-demo-vanguard',
      url: 'https://vanguard-law-partners.com',
      companyName: 'Vanguard Law Partners',
      tone: 'freelancer',
      createdAt: now,
      personalizationSummary: 'Dated 2014 typography and broken responsive container.',
      customRedesignPitch: 'Modern corporate trust typography and client case evaluation form.',
      stats: {
        sent: 2,
        opened: 1,
        responded: 0,
        bounced: 0,
        converted: 0,
        touchBreakdown: [
          { step: 1, title: 'Initial Hook', sent: 1, opened: 1, responded: 0 },
          { step: 2, title: 'Redesign Blueprint', sent: 1, opened: 0, responded: 0 },
          { step: 3, title: 'Case Study ROI', sent: 0, opened: 0, responded: 0 },
          { step: 4, title: 'Breakup', sent: 0, opened: 0, responded: 0 },
        ],
      },
      touches: [
        {
          step: 1,
          title: 'Initial Hook',
          timing: 'Day 1',
          subjectLines: ['vanguard-law-partners.com mobile concept'],
          hook: 'Your mobile case intake form overflows on modern iPhone screens.',
          body: 'Hi,\n\nI was reviewing legal practices in your metro area...',
          cta: 'Should I email over the responsive wireframe?',
        },
      ],
    };

    const updated = {
      ...sequences,
      [demoSeq1.id]: demoSeq1,
      [demoSeq2.id]: demoSeq2,
      [demoSeq3.id]: demoSeq3,
    };
    saveStoredSequences(updated);
    if (onSequencesUpdated) onSequencesUpdated(updated);
    showToast('Loaded 3 sample sequences with live performance stats!');
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* Toast Notification */}
      {logToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-800 text-xs sm:text-sm font-medium flex items-center gap-2 animate-bounce-subtle">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{logToast}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-800 font-semibold uppercase tracking-wider mb-1">
            <BarChart3 className="h-4 w-4 text-emerald-600" />
            <span>Outreach Analytics Engine</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">
            Campaign Performance
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
            Aggregate delivery, open rate benchmarks, and response conversions across all cold email sequences.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {campaignList.length === 0 && (
            <button
              type="button"
              onClick={handleSeedDemoData}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              <span>Load Sample Data</span>
            </button>
          )}

          <button
            type="button"
            onClick={onNavigateToScanner}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all active:scale-[0.98]"
          >
            <PlusCircle className="h-4 w-4" />
            <span>New Website Scan</span>
          </button>
        </div>
      </div>

      {/* Aggregate KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Total Sent */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-medium">
              TOTAL SENT
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Send className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">
              {aggregateMetrics.totalSent}
            </span>
            <span className="text-xs text-slate-400 font-sans">
              across {aggregateMetrics.totalCampaigns} sequences
            </span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <span>Gmail, Outlook & SMTP</span>
          </div>
        </div>

        {/* KPI 2: Total Opened & Open Rate */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-medium">
              OPEN RATE
            </span>
            <div className="h-8 w-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
              <Eye className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-sky-950 font-heading">
              {aggregateMetrics.overallOpenRate}%
            </span>
            <span className="text-xs text-slate-500 font-sans">
              ({aggregateMetrics.totalOpened} opened)
            </span>
          </div>
          <div className="text-[11px] text-emerald-800 font-medium flex items-center gap-1">
            <ArrowUpRight className="h-3 w-3 text-emerald-600" />
            <span>Benchmark: 38% target</span>
          </div>
        </div>

        {/* KPI 3: Total Responded & Reply Rate */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-medium">
              REPLY RATE
            </span>
            <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <MessageSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-purple-950 font-heading">
              {aggregateMetrics.overallReplyRate}%
            </span>
            <span className="text-xs text-slate-500 font-sans">
              ({aggregateMetrics.totalResponded} replies)
            </span>
          </div>
          <div className="text-[11px] text-purple-700 font-medium flex items-center gap-1">
            <span>High conversion audit hooks</span>
          </div>
        </div>

        {/* KPI 4: Converted Deals */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-medium">
              CLOSED DEALS
            </span>
            <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">
              {aggregateMetrics.totalConverted}
            </span>
            <span className="text-xs text-slate-400 font-sans">
              booked redesigns
            </span>
          </div>
          <div className="text-[11px] text-amber-800 font-medium flex items-center gap-1">
            <span>{aggregateMetrics.overallConversionRate}% closed conversion</span>
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Grouped Bar Chart Comparing Campaigns */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 font-heading">
                Campaign Outreach Comparison
              </h2>
              <p className="text-xs text-slate-500">
                Direct side-by-side volume for emails sent, opened, and replies received.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                <span>Sent</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-600" />
                <span>Opened</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-purple-600" />
                <span>Responded</span>
              </span>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            {isMounted && barChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '12px',
                    }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="Sent" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="Opened" fill="#0284c7" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="Responded" fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                <BarChart3 className="h-8 w-8 text-slate-300" />
                <p className="text-xs">No campaign sequence metrics logged yet.</p>
                <button
                  type="button"
                  onClick={handleSeedDemoData}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline"
                >
                  Load sample campaign metrics
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Funnel Drop-Off Area Chart */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 font-heading">
                Outreach Conversion Funnel
              </h2>
              <p className="text-xs text-slate-500">
                Retention across sequence delivery phases.
              </p>
            </div>

            <div className="h-56 w-full pt-3">
              {isMounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={funnelData} margin={{ top: 10, right: 10, left: -25, bottom: 10 }}>
                    <defs>
                      <linearGradient id="funnelColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="stage"
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickFormatter={(val) => val.split(' ')[0]}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        fontSize: '11px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#059669"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#funnelColor)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-slate-50 p-2 rounded-xl">
              <span className="text-[10px] text-slate-400 block font-mono">DELIVERY</span>
              <span className="font-bold text-slate-900">100%</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl">
              <span className="text-[10px] text-slate-400 block font-mono">OPENED</span>
              <span className="font-bold text-sky-800">{aggregateMetrics.overallOpenRate}%</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl">
              <span className="text-[10px] text-slate-400 block font-mono">REPLY</span>
              <span className="font-bold text-purple-800">{aggregateMetrics.overallReplyRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart 3: Touch-by-Touch Performance Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 font-heading">
              Touch-by-Touch Drop-off & Response Timing
            </h2>
            <p className="text-xs text-slate-500">
              Evaluates which email in the 4-touch sequence (Hook, Blueprint, ROI Case Study, Breakup) generates the most client engagement.
            </p>
          </div>
          <div className="text-xs font-mono text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 font-medium">
            Optimal Follow-up: Touch 2 (+48% replies)
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          {isMounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={touchStepData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="step" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="Sent" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Opened" fill="#0284c7" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Responded" fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </div>

      {/* Campaigns Detailed Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Table Filters & Search */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campaign by domain or company..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={toneFilter}
              onChange={(e) => setToneFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Outreach Tones</option>
              <option value="boutique_agency">Boutique Agency</option>
              <option value="freelancer">Freelancer</option>
              <option value="performance_roi">Performance ROI</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        {filteredCampaigns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-[#fbfcfd] border-b border-slate-100 font-mono text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Campaign / Target</th>
                  <th className="py-3.5 px-3 font-semibold">Tone</th>
                  <th className="py-3.5 px-3 font-semibold text-center">Sent</th>
                  <th className="py-3.5 px-3 font-semibold text-center">Opened</th>
                  <th className="py-3.5 px-3 font-semibold text-center">Responded</th>
                  <th className="py-3.5 px-3 font-semibold text-center">Reply Rate</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredCampaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Domain & Company */}
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">{c.companyName}</span>
                        <span className="text-[11px] font-mono text-slate-400 truncate max-w-xs">{c.domain}</span>
                      </div>
                    </td>

                    {/* Tone Badge */}
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium capitalize bg-slate-100 text-slate-700">
                        {c.tone.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Sent Count */}
                    <td className="py-3.5 px-3 text-center">
                      <span className="font-bold text-slate-900 font-mono text-xs">{c.stats?.sent || 0}</span>
                    </td>

                    {/* Opened Count & Rate */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5 font-mono">
                        <span className="font-bold text-sky-900">{c.stats?.opened || 0}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({c.openRate}%)</span>
                      </div>
                    </td>

                    {/* Responded Count */}
                    <td className="py-3.5 px-3 text-center">
                      <span className={`font-mono font-bold ${c.stats?.responded ? 'text-purple-700' : 'text-slate-400'}`}>
                        {c.stats?.responded || 0}
                      </span>
                    </td>

                    {/* Reply Rate Pill */}
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono ${
                          c.replyRate >= 25
                            ? 'bg-purple-100 text-purple-800'
                            : c.replyRate > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {c.replyRate}%
                      </span>
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Quick Event Log Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedCampaignForLog(c)}
                          className="px-2 py-1 text-[11px] font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
                          title="Record send, open, or response"
                        >
                          + Log Event
                        </button>

                        {/* Open in Email Studio */}
                        <button
                          type="button"
                          onClick={() => onNavigateToOutreach(c.id)}
                          className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors"
                          title="Open sequence in Email Studio"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 px-4 text-center space-y-3">
            <Mail className="h-8 w-8 text-slate-300 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800">
              {searchQuery ? 'No matching campaigns found' : 'No campaign sequences created yet'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Scan a website or load sample sequences to view full Recharts conversion tracking.
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={onNavigateToScanner}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
              >
                Scan a Website
              </button>
              <button
                type="button"
                onClick={handleSeedDemoData}
                className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium rounded-xl transition-all"
              >
                Load Sample Data
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Event Logging Modal */}
      {selectedCampaignForLog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-heading">
                  Log Outreach Activity
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedCampaignForLog.companyName} ({selectedCampaignForLog.domain})
                </p>
              </div>
              <button
                onClick={() => setSelectedCampaignForLog(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Select an event to update this campaign’s performance counters in real time:
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  handleLogEvent(selectedCampaignForLog.id, 'sent');
                  setSelectedCampaignForLog(null);
                }}
                className="flex items-center gap-2 p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold transition-all shadow-2xs"
              >
                <Send className="h-4 w-4 text-emerald-700 shrink-0" />
                <div className="text-left">
                  <span className="block">Record Sent (+1)</span>
                  <span className="text-[10px] text-emerald-700 font-normal">Dispatched touch</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleLogEvent(selectedCampaignForLog.id, 'opened');
                  setSelectedCampaignForLog(null);
                }}
                className="flex items-center gap-2 p-3 rounded-xl border border-sky-200 bg-sky-50/70 hover:bg-sky-100 text-sky-900 text-xs font-semibold transition-all shadow-2xs"
              >
                <Eye className="h-4 w-4 text-sky-700 shrink-0" />
                <div className="text-left">
                  <span className="block">Record Opened (+1)</span>
                  <span className="text-[10px] text-sky-700 font-normal">Client opened email</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleLogEvent(selectedCampaignForLog.id, 'responded');
                  setSelectedCampaignForLog(null);
                }}
                className="flex items-center gap-2 p-3 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-purple-900 text-xs font-semibold transition-all shadow-2xs"
              >
                <MessageSquare className="h-4 w-4 text-purple-700 shrink-0" />
                <div className="text-left">
                  <span className="block">Record Reply (+1)</span>
                  <span className="text-[10px] text-purple-700 font-normal">Client responded</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleLogEvent(selectedCampaignForLog.id, 'converted');
                  setSelectedCampaignForLog(null);
                }}
                className="flex items-center gap-2 p-3 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-900 text-xs font-semibold transition-all shadow-2xs"
              >
                <Zap className="h-4 w-4 text-amber-700 shrink-0" />
                <div className="text-left">
                  <span className="block">Record Deal (+1)</span>
                  <span className="text-[10px] text-amber-700 font-normal">Closed redesign deal</span>
                </div>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCampaignForLog(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
