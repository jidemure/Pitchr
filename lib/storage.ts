'use client';

import type { AuditReport, EmailSequence, Lead, SupabaseConfig, UserProfile } from './types.ts';
import { getSupabaseClient } from './supabaseClient.ts';

const LEADS_STORAGE_KEY = 'pitchr_leads_v2';
const AUDITS_STORAGE_KEY = 'pitchr_audits_v2';
const SEQUENCES_STORAGE_KEY = 'pitchr_sequences_v2';
const CONFIG_STORAGE_KEY = 'pitchr_supabase_config_v1';
const USER_PROFILE_STORAGE_KEY = 'pitchr_user_profile_v1';

export const DEMO_PROSPECTS: Array<{ url: string; companyName: string; industry: string; description: string }> = [];

// Deterministic date formatter ensuring 100% server-client hydration match
export function formatAuditDate(isoString: string): string {
  if (!isoString) return 'Recent';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString.slice(0, 10);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
  } catch {
    return isoString.slice(0, 10);
  }
}

// 100% clean initial state: zero dummy or fake leads
export const DEFAULT_SEED_LEADS: Lead[] = [];
export const DEFAULT_SEED_AUDITS: Record<string, AuditReport> = {};
export const DEFAULT_SEED_SEQUENCES: Record<string, EmailSequence> = {};

export function getStoredSupabaseConfig(): SupabaseConfig {
  const envUrl = (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : '') || '';
  const envKey = (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : '') || '';
  const hasEnv = !!(envUrl && envKey);

  if (typeof window === 'undefined') {
    return { url: envUrl, anonKey: envKey, isConnected: hasEnv, syncEnabled: hasEnv };
  }
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const url = parsed.url || envUrl;
      const anonKey = parsed.anonKey || envKey;
      const isConnected = !!(url && anonKey);
      return {
        url,
        anonKey,
        isConnected,
        syncEnabled: parsed.syncEnabled ?? isConnected,
        lastSyncedAt: parsed.lastSyncedAt,
      };
    }
  } catch (err) {
    console.error('Error reading Supabase config:', err);
  }
  return {
    url: envUrl,
    anonKey: envKey,
    isConnected: hasEnv,
    syncEnabled: hasEnv,
  };
}

export function saveStoredSupabaseConfig(config: SupabaseConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}

// Clean dummy/seed items from legacy sessions if any
function filterOutDummyLeads(leads: Lead[]): Lead[] {
  return leads.filter((l) => {
    if (!l.id || !l.url) return false;
    // Strip old mock IDs and test domains
    if (l.id.startsWith('lead-seed') || l.id === 'lead-guthrie') return false;
    if (l.url.includes('.sample')) return false;
    return true;
  });
}

export function getStoredLeads(): Lead[] {
  if (typeof window === 'undefined') return [];
  try {
    // Purge old dummy key from earlier iterations
    if (localStorage.getItem('swokei_leads_v1')) {
      localStorage.removeItem('swokei_leads_v1');
    }
    const raw = localStorage.getItem(LEADS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = filterOutDummyLeads(parsed);
        if (cleaned.length !== parsed.length) {
          saveStoredLeads(cleaned);
        }
        return cleaned;
      }
    }
  } catch (err) {
    console.error('Error reading stored leads:', err);
  }
  return [];
}

export function saveStoredLeads(leads: Lead[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads));
}

export function getStoredAudits(): Record<string, AuditReport> {
  if (typeof window === 'undefined') return {};
  try {
    // Purge legacy audit storage
    if (localStorage.getItem('swokei_audits_v1')) {
      localStorage.removeItem('swokei_audits_v1');
    }
    const raw = localStorage.getItem(AUDITS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const cleaned: Record<string, AuditReport> = {};
        for (const [key, val] of Object.entries(parsed as Record<string, AuditReport>)) {
          const reportVal = val as AuditReport | undefined;
          if (!key.startsWith('audit-seed') && key !== 'audit-guthrie' && !reportVal?.url?.includes('.sample')) {
            if (reportVal) cleaned[key] = reportVal;
          }
        }
        return cleaned;
      }
    }
  } catch (err) {
    console.error('Error reading stored audits:', err);
  }
  return {};
}

export function saveStoredAudits(audits: Record<string, AuditReport>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUDITS_STORAGE_KEY, JSON.stringify(audits));
}

export function getStoredSequences(): Record<string, EmailSequence> {
  if (typeof window === 'undefined') return {};
  try {
    // Purge legacy sequence storage
    if (localStorage.getItem('swokei_sequences_v1')) {
      localStorage.removeItem('swokei_sequences_v1');
    }
    const raw = localStorage.getItem(SEQUENCES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const cleaned: Record<string, EmailSequence> = {};
        for (const [key, val] of Object.entries(parsed as Record<string, EmailSequence>)) {
          const seqVal = val as EmailSequence | undefined;
          if (!key.startsWith('seq-seed') && key !== 'seq-guthrie' && !seqVal?.url?.includes('.sample')) {
            if (seqVal) cleaned[key] = seqVal;
          }
        }
        return cleaned;
      }
    }
  } catch (err) {
    console.error('Error reading stored sequences:', err);
  }
  return {};
}

export function saveStoredSequences(sequences: Record<string, EmailSequence>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SEQUENCES_STORAGE_KEY, JSON.stringify(sequences));
}

export function clearAllStoredData(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LEADS_STORAGE_KEY);
    localStorage.removeItem(AUDITS_STORAGE_KEY);
    localStorage.removeItem(SEQUENCES_STORAGE_KEY);
    localStorage.removeItem('swokei_leads_v1');
    localStorage.removeItem('swokei_audits_v1');
    localStorage.removeItem('swokei_sequences_v1');
  } catch (err) {
    console.error('Error clearing stored data:', err);
  }
}

// Sync helper between Local Storage and Supabase
export async function syncLeadToSupabase(
  lead: Lead,
  audit?: AuditReport,
  sequence?: EmailSequence
): Promise<{ success: boolean; error?: string }> {
  const config = getStoredSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return { success: false, error: 'Supabase credentials not configured in Settings.' };
  }

  const supabase = getSupabaseClient(config.url, config.anonKey);
  if (!supabase) {
    return { success: false, error: 'Could not connect to Supabase.' };
  }

  try {
    const leadPayload: Record<string, any> = {
      url: lead.url,
      company_name: lead.companyName,
      industry: lead.industry,
      contact_email: lead.contactEmail || null,
      status: lead.status,
      overall_score: lead.overallScore,
      notes: lead.notes || null,
      last_audited_at: lead.lastAuditedAt,
    };
    if (lead.prospectName) leadPayload.prospect_name = lead.prospectName;
    if (lead.prospectTitle) leadPayload.prospect_title = lead.prospectTitle;
    if (lead.emailSource) leadPayload.email_source = lead.emailSource;
    if (lead.tags) leadPayload.tags = lead.tags;

    const { error: leadErr } = await supabase.from('leads').upsert(
      leadPayload,
      { onConflict: 'url' }
    );
    if (leadErr) {
      console.error('Supabase lead upsert error:', leadErr);
      return { success: false, error: leadErr.message };
    }

    if (audit) {
      const { error: auditErr } = await supabase.from('audits').upsert({
        url: audit.url,
        company_name: audit.companyName,
        industry: audit.industry,
        scores: audit.scores,
        issues: audit.issues,
        tech_stack: audit.techStack,
        visual_critique: audit.visualCritique,
        redesign_suggestion: audit.redesignSuggestion,
        raw_metrics: audit.rawMetrics,
        screenshot_url: audit.screenshotUrl || null,
        analyzed_at: audit.analyzedAt,
      }, { onConflict: 'url' });
      if (auditErr) console.warn('Supabase audit upsert warning:', auditErr);
    }

    if (sequence) {
      const { error: seqErr } = await supabase.from('email_sequences').upsert({
        url: sequence.url,
        company_name: sequence.companyName,
        tone: sequence.tone,
        touches: sequence.touches,
        personalization_summary: sequence.personalizationSummary,
        custom_redesign_pitch: sequence.customRedesignPitch,
        created_at: sequence.createdAt,
      }, { onConflict: 'url' });
      if (seqErr) console.warn('Supabase sequence upsert warning:', seqErr);
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown sync error';
    return { success: false, error: msg };
  }
}

export interface CloudSyncResult {
  success: boolean;
  leads: Lead[];
  audits: Record<string, AuditReport>;
  sequences: Record<string, EmailSequence>;
  error?: string;
}

/**
 * Fetches all leads, audits, and sequences from Supabase to hydrate state across devices.
 */
export async function fetchFromSupabase(): Promise<CloudSyncResult> {
  const config = getStoredSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return { success: false, leads: [], audits: {}, sequences: {}, error: 'Supabase credentials not configured.' };
  }

  const supabase = getSupabaseClient(config.url, config.anonKey);
  if (!supabase) {
    return { success: false, leads: [], audits: {}, sequences: {}, error: 'Could not initialize Supabase client.' };
  }

  try {
    const { data: leadsData, error: leadsErr } = await supabase
      .from('leads')
      .select('*')
      .order('last_audited_at', { ascending: false });

    if (leadsErr) {
      console.warn('Error fetching leads from Supabase:', leadsErr);
      return { success: false, leads: [], audits: {}, sequences: {}, error: leadsErr.message };
    }

    const { data: auditsData, error: auditsErr } = await supabase
      .from('audits')
      .select('*');

    if (auditsErr) {
      console.warn('Error fetching audits from Supabase:', auditsErr);
    }

    const { data: seqData, error: seqErr } = await supabase
      .from('email_sequences')
      .select('*');

    if (seqErr) {
      console.warn('Error fetching sequences from Supabase:', seqErr);
    }

    const auditsMap: Record<string, AuditReport> = {};
    if (auditsData) {
      for (const a of auditsData) {
        const auditId = a.id ? String(a.id) : `audit-${a.url}`;
        auditsMap[auditId] = {
          id: auditId,
          leadId: a.lead_id ? String(a.lead_id) : `lead-${a.url}`,
          url: a.url,
          companyName: a.company_name,
          industry: a.industry || 'Professional Services',
          analyzedAt: a.analyzed_at,
          scores: a.scores,
          issues: Array.isArray(a.issues) ? a.issues : [],
          techStack: Array.isArray(a.tech_stack) ? a.tech_stack : [],
          visualCritique: a.visual_critique || '',
          redesignSuggestion: a.redesign_suggestion || '',
          rawMetrics: a.raw_metrics || {
            loadTimeMs: 1500,
            pageSizeKb: 500,
            viewportConfigured: true,
            hasTitle: true,
            hasMetaDesc: true,
            hasOpenGraph: true,
            hasSchema: true,
            headingCount: { h1: 1, h2: 2, h3: 1 },
            totalImages: 5,
            imagesWithoutAlt: 0,
            totalScripts: 10,
            totalStylesheets: 4,
            legacyLibrariesDetected: [],
          },
          screenshotUrl: a.screenshot_url || undefined,
        };
      }
    }

    const seqMap: Record<string, EmailSequence> = {};
    if (seqData) {
      for (const s of seqData) {
        const seqId = s.id ? String(s.id) : `seq-${s.url}`;
        seqMap[seqId] = {
          id: seqId,
          leadId: s.lead_id ? String(s.lead_id) : `lead-${s.url}`,
          url: s.url,
          companyName: s.company_name,
          tone: s.tone || 'specific_problem',
          createdAt: s.created_at,
          touches: Array.isArray(s.touches) ? s.touches : [],
          personalizationSummary: s.personalization_summary || '',
          customRedesignPitch: s.custom_redesign_pitch || '',
        };
      }
    }

    const parsedLeads: Lead[] = (leadsData || []).map((row) => {
      const matchingAudit = Object.values(auditsMap).find((a) => a.url === row.url);
      const matchingSeq = Object.values(seqMap).find((s) => s.url === row.url);

      return {
        id: row.id ? String(row.id) : `lead-${row.url}`,
        url: row.url,
        companyName: row.company_name,
        industry: row.industry || 'General Business',
        contactEmail: row.contact_email || undefined,
        prospectName: row.prospect_name || undefined,
        prospectTitle: row.prospect_title || undefined,
        emailSource: row.email_source || undefined,
        status: row.status || 'audited',
        overallScore: row.overall_score || 50,
        createdAt: row.created_at || row.last_audited_at,
        lastAuditedAt: row.last_audited_at,
        auditId: matchingAudit?.id,
        campaignId: matchingSeq?.id,
        notes: row.notes || undefined,
        tags: Array.isArray(row.tags) ? row.tags : [],
      };
    });

    return {
      success: true,
      leads: parsedLeads,
      audits: auditsMap,
      sequences: seqMap,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown sync error';
    return { success: false, leads: [], audits: {}, sequences: {}, error: msg };
  }
}

/**
 * Removes a lead and its associated audits/sequences from Supabase cloud.
 */
export async function deleteLeadFromSupabase(url: string): Promise<void> {
  const config = getStoredSupabaseConfig();
  if (!config.isConnected && (!config.url || !config.anonKey)) return;

  const supabase = getSupabaseClient(config.url, config.anonKey);
  if (!supabase) return;

  try {
    await supabase.from('leads').delete().eq('url', url);
    await supabase.from('audits').delete().eq('url', url);
    await supabase.from('email_sequences').delete().eq('url', url);
  } catch (err) {
    console.warn('Failed to delete lead from Supabase:', err);
  }
}

/**
 * Pushes all local leads, audits, and sequences to Supabase.
 */
export async function syncAllToSupabase(): Promise<{ success: boolean; synced: number; error?: string }> {
  const config = getStoredSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return { success: false, synced: 0, error: 'Supabase credentials not configured.' };
  }

  const leads = getStoredLeads();
  const audits = getStoredAudits();
  const sequences = getStoredSequences();

  let synced = 0;
  let lastError: string | undefined;

  for (const lead of leads) {
    const audit = lead.auditId ? audits[lead.auditId] : undefined;
    const seq = lead.campaignId ? sequences[lead.campaignId] : undefined;
    const res = await syncLeadToSupabase(lead, audit, seq);
    if (res.success) {
      synced++;
    } else {
      lastError = res.error;
    }
  }

  return { success: synced > 0 || leads.length === 0, synced, error: lastError };
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'Alex Rivers',
  email: 'alex@apexstudio.io',
  agencyName: 'Apex Digital Studio',
  role: 'Agency Founder',
  avatarColor: 'from-orange-500 to-amber-600',
  senderName: 'Alex',
  defaultOffer: 'Free 2-minute mobile wireframe walkthrough',
  signature: 'Website Design & Redesign | Lagos, Nigeria\nkoravale.studio@gmail.com | koravale.com',
  preferredProvider: 'gmail',
  gmailAccountEmail: '',
  customSmtp: {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: '',
      pass: '',
    },
    fromEmail: '',
    fromName: 'Alex | Apex Studio',
    configured: false,
  },
};

export const getStoredUserProfile = (): UserProfile => {
  if (typeof window === 'undefined') return DEFAULT_USER_PROFILE;
  try {
    const raw = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_USER_PROFILE,
        ...parsed,
        customSmtp: {
          ...DEFAULT_USER_PROFILE.customSmtp!,
          ...(parsed.customSmtp || {}),
        },
      };
    }
  } catch (e) {
    console.error('Failed reading user profile from localStorage:', e);
  }
  return DEFAULT_USER_PROFILE;
};

export const saveStoredUserProfile = (profile: UserProfile): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed saving user profile to localStorage:', e);
  }
};

export function updateLeadFollowUp(
  leadId: string,
  touchStep: number,
  provider: import('./types').EmailProvider,
  notes?: string
): Lead[] {
  const currentLeads = getStoredLeads();
  const nextDueDate = new Date();
  // Next touch in 3-4 days
  nextDueDate.setDate(nextDueDate.getDate() + 3);

  const updated = currentLeads.map((lead) => {
    if (lead.id === leadId) {
      const nextStep = Math.min(4, touchStep + 1);
      return {
        ...lead,
        status: (touchStep === 1 ? 'contacted' : lead.status) as import('./types').LeadStatus,
        followUp: {
          currentTouchStep: nextStep,
          lastSentAt: new Date().toISOString(),
          lastSentTouch: touchStep,
          lastProviderUsed: provider,
          nextFollowUpDue: nextStep <= 4 ? nextDueDate.toISOString() : undefined,
          notes: notes || lead.followUp?.notes,
        },
      };
    }
    return lead;
  });

  saveStoredLeads(updated);
  return updated;
}

export function recordSequenceEvent(
  sequenceId: string,
  event: 'sent' | 'opened' | 'responded' | 'bounced' | 'converted',
  touchStep: number = 1
): Record<string, EmailSequence> {
  const currentSequences = getStoredSequences();
  const seq = currentSequences[sequenceId];
  if (!seq) return currentSequences;

  const prevStats = seq.stats || {
    sent: 0,
    opened: 0,
    responded: 0,
    bounced: 0,
    converted: 0,
    touchBreakdown: [
      { step: 1, title: 'Initial Hook', sent: 0, opened: 0, responded: 0 },
      { step: 2, title: 'Redesign Blueprint', sent: 0, opened: 0, responded: 0 },
      { step: 3, title: 'Case Study ROI', sent: 0, opened: 0, responded: 0 },
      { step: 4, title: 'Breakup', sent: 0, opened: 0, responded: 0 },
    ],
  };

  const currentBreakdown = prevStats.touchBreakdown && prevStats.touchBreakdown.length === 4
    ? prevStats.touchBreakdown
    : [
        { step: 1, title: 'Initial Hook', sent: 0, opened: 0, responded: 0 },
        { step: 2, title: 'Redesign Blueprint', sent: 0, opened: 0, responded: 0 },
        { step: 3, title: 'Case Study ROI', sent: 0, opened: 0, responded: 0 },
        { step: 4, title: 'Breakup', sent: 0, opened: 0, responded: 0 },
      ];

  const updatedTouchBreakdown = currentBreakdown.map((t) => {
    if (t.step === touchStep) {
      return {
        ...t,
        [event]: (t[event as 'sent' | 'opened' | 'responded'] || 0) + 1,
      };
    }
    return t;
  });

  const updatedStats = {
    ...prevStats,
    [event]: (prevStats[event] || 0) + 1,
    touchBreakdown: updatedTouchBreakdown,
    lastDispatchedAt: event === 'sent' ? new Date().toISOString() : prevStats.lastDispatchedAt,
  };

  const updatedSequences = {
    ...currentSequences,
    [sequenceId]: {
      ...seq,
      stats: updatedStats,
    },
  };

  saveStoredSequences(updatedSequences);
  return updatedSequences;
}

export function updateSequenceStats(
  sequenceId: string,
  newStats: import('./types').CampaignPerformanceStats
): Record<string, EmailSequence> {
  const currentSequences = getStoredSequences();
  const seq = currentSequences[sequenceId];
  if (!seq) return currentSequences;

  const updatedSequences = {
    ...currentSequences,
    [sequenceId]: {
      ...seq,
      stats: newStats,
    },
  };

  saveStoredSequences(updatedSequences);
  return updatedSequences;
}

export function updateLeadTags(leadId: string, tags: string[]): Lead[] {
  const currentLeads = getStoredLeads();
  const updated = currentLeads.map((lead) => {
    if (lead.id === leadId) {
      return {
        ...lead,
        tags,
      };
    }
    return lead;
  });
  saveStoredLeads(updated);
  return updated;
}
