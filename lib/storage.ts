'use client';

import { AuditReport, EmailSequence, Lead, SupabaseConfig, UserProfile } from './types';
import { getSupabaseClient } from './supabaseClient';

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
  if (typeof window === 'undefined') {
    return { url: '', anonKey: '', isConnected: false, syncEnabled: false };
  }
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading Supabase config:', err);
  }
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    isConnected: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    syncEnabled: false,
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
    const { error: leadErr } = await supabase.from('leads').upsert(
      {
        url: lead.url,
        company_name: lead.companyName,
        industry: lead.industry,
        contact_email: lead.contactEmail || null,
        status: lead.status,
        overall_score: lead.overallScore,
        notes: lead.notes || null,
        last_audited_at: lead.lastAuditedAt,
      },
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
        analyzed_at: audit.analyzedAt,
      });
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
      });
      if (seqErr) console.warn('Supabase sequence upsert warning:', seqErr);
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown sync error';
    return { success: false, error: msg };
  }
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'Tariq Lanez',
  email: 'tariqlanez77@gmail.com',
  agencyName: 'Apex Digital Studio',
  role: 'Agency Founder',
  avatarColor: 'from-emerald-500 to-teal-600',
  senderName: 'Tariq',
  defaultOffer: 'Free 2-minute mobile wireframe walkthrough',
};

export const getStoredUserProfile = (): UserProfile => {
  if (typeof window === 'undefined') return DEFAULT_USER_PROFILE;
  try {
    const raw = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
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
