'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { AuditInput } from '@/components/AuditInput';
import { AuditModal } from '@/components/AuditModal';
import { DashboardView } from '@/components/DashboardView';
import { LeadsPipelineView } from '@/components/LeadsPipelineView';
import { EmailStudioView } from '@/components/EmailStudioView';
import { PublicAuditTeaserModal } from '@/components/PublicAuditTeaserModal';
import { SupabaseModal } from '@/components/SupabaseModal';
import { ProfileSettingsModal } from '@/components/ProfileSettingsModal';
import { AuditReport, EmailSequence, Lead, LeadStatus, OutreachTone, SupabaseConfig, UserProfile } from '@/lib/types';
import {
  DEFAULT_SEED_LEADS,
  DEFAULT_SEED_AUDITS,
  DEFAULT_SEED_SEQUENCES,
  DEFAULT_USER_PROFILE,
  formatAuditDate,
  getStoredLeads,
  saveStoredLeads,
  getStoredAudits,
  saveStoredAudits,
  getStoredSequences,
  saveStoredSequences,
  getStoredSupabaseConfig,
  getStoredUserProfile,
  saveStoredUserProfile,
  syncLeadToSupabase
} from '@/lib/storage';
import { AlertCircle, CheckCircle2, Menu, Sparkles, Layers, ArrowRight, Globe } from 'lucide-react';

export default function HomePage() {
  const [isInWorkspace, setIsInWorkspace] = useState(false);
  const [activeTab, setActiveTab] = useState<'scanner' | 'dashboard' | 'crm' | 'outreach' | 'database'>('scanner');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Deterministic initial state shared between SSR and client initial hydration
  const [leads, setLeads] = useState<Lead[]>(DEFAULT_SEED_LEADS);
  const [audits, setAudits] = useState<Record<string, AuditReport>>(DEFAULT_SEED_AUDITS);
  const [sequences, setSequences] = useState<Record<string, EmailSequence>>(DEFAULT_SEED_SEQUENCES);
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>({
    url: '',
    anonKey: '',
    isConnected: false,
    syncEnabled: false,
  });

  // Current active working entities
  const [currentAudit, setCurrentAudit] = useState<AuditReport | null>(DEFAULT_SEED_AUDITS['audit-guthrie'] || DEFAULT_SEED_AUDITS['audit-seed-1'] || null);
  const [currentSequence, setCurrentSequence] = useState<EmailSequence | null>(DEFAULT_SEED_SEQUENCES['seq-guthrie'] || DEFAULT_SEED_SEQUENCES['seq-seed-1'] || null);

  // Loading & Modal UI states
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditingUrl, setAuditingUrl] = useState('');
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [teaserReport, setTeaserReport] = useState<AuditReport | null>(null);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Rehydrate custom saved state from localStorage after initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      const storedLeads = getStoredLeads();
      const storedAudits = getStoredAudits();
      const storedSequences = getStoredSequences();
      const storedConfig = getStoredSupabaseConfig();
      const storedProfile = getStoredUserProfile();

      setLeads(storedLeads);
      setAudits(storedAudits);
      setSequences(storedSequences);
      setSupabaseConfig(storedConfig);
      setUserProfile(storedProfile);

      if (storedLeads.length > 0 && storedLeads[0].auditId && storedAudits[storedLeads[0].auditId]) {
        setCurrentAudit(storedAudits[storedLeads[0].auditId]);
      }
      if (storedLeads.length > 0 && storedLeads[0].campaignId && storedSequences[storedLeads[0].campaignId]) {
        setCurrentSequence(storedSequences[storedLeads[0].campaignId]);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Perform website audit via server API and immediately generate cold sequence
  const handleStartAudit = async (targetUrl: string, targetIndustry?: string) => {
    setIsAuditing(true);
    setAuditingUrl(targetUrl);
    setIsAuditModalOpen(true);

    try {
      // Step 1: Scan Website
      const scanRes = await fetch('/api/audit/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl, industry: targetIndustry }),
      });

      const scanData = await scanRes.json();
      if (!scanRes.ok || !scanData.report) {
        throw new Error(scanData.error || 'Failed to scan website.');
      }

      const report: AuditReport = scanData.report;
      setCurrentAudit(report);

      // Step 2: Automatically generate 4-touch cold outreach sequence for this audit
      let generatedSeq: EmailSequence | null = null;
      try {
        const emailRes = await fetch('/api/outreach/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audit: report,
            tone: 'boutique_agency',
            agencyName: 'Apex Digital Studio',
            senderName: 'Alex',
            customOffer: 'Free 2-minute mobile wireframe walkthrough',
          }),
        });

        const emailData = await emailRes.json();
        if (emailRes.ok && emailData.sequence) {
          const seq: EmailSequence = emailData.sequence;
          generatedSeq = seq;
          setCurrentSequence(seq);
          const newSequences = { ...sequences, [seq.id]: seq };
          setSequences(newSequences);
          saveStoredSequences(newSequences);
        }
      } catch (emailErr) {
        console.warn('Auto-generation of cold email failed:', emailErr);
      }

      // Step 3: Record into CRM Leads database with exact date
      const existingLeadIndex = leads.findIndex((l) => l.url.toLowerCase() === report.url.toLowerCase());
      let updatedLead: Lead;

      if (existingLeadIndex >= 0) {
        updatedLead = {
          ...leads[existingLeadIndex],
          companyName: report.companyName,
          industry: report.industry,
          overallScore: report.scores.overall,
          lastAuditedAt: report.analyzedAt,
          contactEmail: report.contactEmail || leads[existingLeadIndex].contactEmail,
          location: report.location || leads[existingLeadIndex].location,
          auditId: report.id,
          campaignId: generatedSeq ? generatedSeq.id : leads[existingLeadIndex].campaignId,
          status: 'drafted',
        };
        const newLeads = [...leads];
        newLeads[existingLeadIndex] = updatedLead;
        setLeads(newLeads);
        saveStoredLeads(newLeads);
      } else {
        updatedLead = {
          id: report.leadId,
          url: report.url,
          companyName: report.companyName,
          industry: report.industry,
          contactEmail: report.contactEmail,
          location: report.location,
          status: 'drafted',
          overallScore: report.scores.overall,
          createdAt: report.analyzedAt,
          lastAuditedAt: report.analyzedAt,
          auditId: report.id,
          campaignId: generatedSeq?.id,
        };
        const newLeads = [updatedLead, ...leads];
        setLeads(newLeads);
        saveStoredLeads(newLeads);
      }

      // Save audit
      const newAudits = { ...audits, [report.id]: report };
      setAudits(newAudits);
      saveStoredAudits(newAudits);

      // Auto sync to Supabase if enabled
      if (supabaseConfig.syncEnabled) {
        syncLeadToSupabase(updatedLead, report, generatedSeq || undefined);
      }

      showToast(`Audit & sequence ready for ${report.companyName}!`);
    } catch (err: any) {
      console.error('Audit error:', err);
      showToast(err.message || 'An error occurred during scanning', 'error');
    } finally {
      setIsAuditing(false);
    }
  };

  // Open modal directly for an existing lead from CRM or Dashboard
  const handleOpenLeadModal = (lead: Lead) => {
    if (lead.auditId && audits[lead.auditId]) {
      setCurrentAudit(audits[lead.auditId]);
    }
    if (lead.campaignId && sequences[lead.campaignId]) {
      setCurrentSequence(sequences[lead.campaignId]);
    }
    setAuditingUrl(lead.url);
    setIsAuditing(false);
    setIsAuditModalOpen(true);
  };

  const handleUpdateLeadStatus = (leadId: string, newStatus: LeadStatus) => {
    const newLeads = leads.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l));
    setLeads(newLeads);
    saveStoredLeads(newLeads);
    showToast(`Lead status updated to ${newStatus}`);

    const updated = newLeads.find((l) => l.id === leadId);
    if (updated && supabaseConfig.syncEnabled) {
      const audit = updated.auditId ? audits[updated.auditId] : undefined;
      const seq = updated.campaignId ? sequences[updated.campaignId] : undefined;
      syncLeadToSupabase(updated, audit, seq);
    }
  };

  const handleDeleteLead = (leadId: string) => {
    const newLeads = leads.filter((l) => l.id !== leadId);
    setLeads(newLeads);
    saveStoredLeads(newLeads);
    showToast('Lead removed from CRM.');
  };

  const handleExportAllLeadsCSV = () => {
    if (leads.length === 0) return;
    const rows = [
      ['Company Name', 'URL', 'Industry', 'Audit Score', 'Pipeline Status', 'Last Audited Date', 'Notes'],
      ...leads.map((l) => [
        `"${l.companyName}"`,
        `"${l.url}"`,
        `"${l.industry}"`,
        l.overallScore.toString(),
        `"${l.status}"`,
        `"${formatAuditDate(l.lastAuditedAt)}"`,
        `"${(l.notes || '').replace(/"/g, '""')}"`,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pitchr_leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#fafbfc]">
      {/* Left Sidebar - ONLY rendered when in workspace mode */}
      {isInWorkspace && (
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            if (tab === 'database') {
              setIsSupabaseModalOpen(true);
            } else {
              setActiveTab(tab);
            }
          }}
          leadsCount={leads.length}
          isSupabaseConnected={supabaseConfig.isConnected}
          onNewScanClick={() => {
            setIsInWorkspace(false);
            setActiveTab('scanner');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onBackToHome={() => {
            setIsInWorkspace(false);
            setActiveTab('scanner');
          }}
          isMobileOpen={isMobileSidebarOpen}
          setIsMobileOpen={setIsMobileSidebarOpen}
          userProfile={userProfile}
          onOpenProfile={() => setIsProfileModalOpen(true)}
        />
      )}

      {/* Main Content Area: full width on homepage, offset by sidebar (lg:pl-64) in workspace */}
      <div className={`flex-1 flex flex-col min-w-0 ${isInWorkspace ? 'lg:pl-64' : 'w-full'}`}>
        {/* Header: Workspace header if in workspace, clean Landing Navbar if on Homepage */}
        {isInWorkspace ? (
          <header className="sticky top-0 z-30 lg:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <span className="font-semibold text-base text-slate-900 font-heading">
                Pitchr
              </span>
            </div>

            <button
              onClick={() => {
                setIsInWorkspace(false);
                setActiveTab('scanner');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-medium"
            >
              <Sparkles className="h-3 w-3" />
              <span>New Scan</span>
            </button>
          </header>
        ) : (
          /* Homepage Clean Header (no sidebar) */
          <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-xl font-semibold tracking-tight text-slate-900 font-heading">
                Pitchr
              </span>
            </div>

            <div className="flex items-center gap-3">
              {leads.length > 0 && (
                <button
                  onClick={() => {
                    setIsInWorkspace(true);
                    setActiveTab('crm');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200/90 rounded-xl text-xs font-medium shadow-2xs transition-all active:scale-[0.98]"
                >
                  <Layers className="h-3.5 w-3.5 text-slate-500" />
                  <span>CRM Pipeline ({leads.length})</span>
                  <ArrowRight className="h-3 w-3 text-slate-400" />
                </button>
              )}
            </div>
          </header>
        )}

        {/* Viewport Content */}
        <main className={`flex-1 p-3.5 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto ${!isInWorkspace ? 'flex flex-col justify-center' : ''}`}>
          {/* Toast Notification */}
          {toastMessage && (
            <div
              className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 p-3 sm:p-4 rounded-xl shadow-lg border text-xs sm:text-sm font-medium flex items-center gap-2.5 transition-all transform animate-bounce-subtle ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-950 text-white border-emerald-800'
                  : 'bg-rose-950 text-white border-rose-800'
              }`}
            >
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              )}
              <span className="truncate">{toastMessage.text}</span>
            </div>
          )}

          {/* View 1: URL Scanner (Clean Landing on Homepage, or Scanner inside Workspace) */}
          {(!isInWorkspace || activeTab === 'scanner') && (
            <AuditInput onStartAudit={handleStartAudit} isLoading={isAuditing} />
          )}

          {/* View 2: Dashboard Overview (Workspace Mode) */}
          {isInWorkspace && activeTab === 'dashboard' && (
            <DashboardView
              leads={leads}
              audits={audits}
              sequences={sequences}
              onSelectLeadForAuditModal={handleOpenLeadModal}
              onNavigateToScanner={() => {
                setIsInWorkspace(false);
                setActiveTab('scanner');
              }}
              onNavigateToCrm={() => setActiveTab('crm')}
            />
          )}

          {/* View 3: CRM Pipeline Table (Workspace Mode) */}
          {isInWorkspace && activeTab === 'crm' && (
            <LeadsPipelineView
              leads={leads}
              onSelectLeadForAudit={handleOpenLeadModal}
              onSelectLeadForEmail={(lead) => {
                if (lead.campaignId && sequences[lead.campaignId]) {
                  setCurrentSequence(sequences[lead.campaignId]);
                }
                if (lead.auditId && audits[lead.auditId]) {
                  setCurrentAudit(audits[lead.auditId]);
                }
                setActiveTab('outreach');
              }}
              onUpdateLeadStatus={handleUpdateLeadStatus}
              onDeleteLead={handleDeleteLead}
              onExportCSV={handleExportAllLeadsCSV}
              onSyncSupabase={() => setIsSupabaseModalOpen(true)}
            />
          )}

          {/* View 4: Email Studio Deep Editor (Workspace Mode) */}
          {isInWorkspace && activeTab === 'outreach' && (
            <EmailStudioView
              sequence={currentSequence}
              audit={currentAudit}
              onRegenerateSequence={async (tone, agency, sender, offer) => {
                if (currentAudit) {
                  setIsGeneratingEmail(true);
                  try {
                    const res = await fetch('/api/outreach/generate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        audit: currentAudit,
                        tone,
                        agencyName: agency,
                        senderName: sender,
                        customOffer: offer,
                      }),
                    });
                    const data = await res.json();
                    if (res.ok && data.sequence) {
                      setCurrentSequence(data.sequence);
                      const newSeq = { ...sequences, [data.sequence.id]: data.sequence };
                      setSequences(newSeq);
                      saveStoredSequences(newSeq);
                      showToast('Generated fresh cold email sequence!');
                    }
                  } catch (err: any) {
                    showToast(err.message || 'Failed to regenerate sequence', 'error');
                  } finally {
                    setIsGeneratingEmail(false);
                  }
                }
              }}
              isGenerating={isGeneratingEmail}
            />
          )}
        </main>
      </div>

      {/* Primary Audit & Analysis Modal (Screenshots 02 & 03) */}
      <AuditModal
        isOpen={isAuditModalOpen}
        onClose={() => {
          setIsAuditModalOpen(false);
          // If audit completed, automatically transition to workspace CRM
          if (currentAudit && !isAuditing) {
            setIsInWorkspace(true);
            setActiveTab('crm');
          }
        }}
        report={currentAudit}
        sequence={currentSequence}
        isScanning={isAuditing}
        scanningUrl={auditingUrl}
        onNavigateToCrm={() => {
          setIsInWorkspace(true);
          setActiveTab('crm');
        }}
      />

      {/* Shareable Client Teaser Modal */}
      <PublicAuditTeaserModal
        report={teaserReport}
        onClose={() => setTeaserReport(null)}
      />

      {/* Supabase Configuration Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConfigUpdated={(cfg) => {
          setSupabaseConfig(cfg);
          showToast(cfg.isConnected ? 'Supabase connected!' : 'Supabase settings saved');
        }}
        leads={leads}
        audits={audits}
        sequences={sequences}
      />

      {/* User Profile & Settings Modal */}
      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={userProfile}
        onUpdateProfile={(updated) => {
          setUserProfile(updated);
          showToast('Profile updated successfully!');
        }}
        onLogout={() => {
          setIsInWorkspace(false);
          setActiveTab('scanner');
          showToast('Signed out of Pitchr Workspace');
        }}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        isSupabaseConnected={supabaseConfig.isConnected}
      />
    </div>
  );
}
