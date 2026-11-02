'use client';

import { AuditReport, EmailSequence, Lead, SupabaseConfig, UserProfile } from './types';
import { getSupabaseClient } from './supabaseClient';

const LEADS_STORAGE_KEY = 'swokei_leads_v1';
const AUDITS_STORAGE_KEY = 'swokei_audits_v1';
const SEQUENCES_STORAGE_KEY = 'swokei_sequences_v1';
const CONFIG_STORAGE_KEY = 'swokei_supabase_config_v1';

export const DEMO_PROSPECTS = [
  {
    url: 'https://guthriekitchenandbath.com',
    companyName: 'Guthrie Kitchen And Bath',
    industry: 'Kitchen & Bath Remodeling',
    description: 'Kitchen and bath remodeling showroom with slow image galleries, hidden estimate consultation buttons, and high organic SEO potential.',
  },
  {
    url: 'https://apex-hvac-solutions.sample',
    companyName: 'Apex HVAC Solutions',
    industry: 'Home Services / HVAC',
    description: 'Local heating & cooling company with a 2013 non-responsive layout, uncompressed 4MB hero slider, and no mobile tap-to-call button.',
  },
  {
    url: 'https://dr-miller-dentistry.sample',
    companyName: 'Miller Family Dental Clinic',
    industry: 'Healthcare / Dental',
    description: 'Established dental clinic missing OpenGraph meta tags, missing mobile viewport scaling, and bury their appointment booking button.',
  },
  {
    url: 'https://vanguard-law-partners.sample',
    companyName: 'Vanguard Law Partners',
    industry: 'Legal / Litigation',
    description: 'Commercial law firm with dense unformatted walls of text, no SSL certificate indicator, missing schema markup, and zero mobile optimization.',
  },
  {
    url: 'https://rustic-bistro-grill.sample',
    companyName: 'The Rustic Bistro & Bar',
    industry: 'Hospitality / Restaurant',
    description: 'High-rated downtown restaurant using a static multi-page PDF menu, slow Flash-era gallery script, and no online reservation CTA.',
  },
];

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

// Deterministic seed data shared by SSR and initial client hydration
export const DEFAULT_SEED_LEADS: Lead[] = [
  {
    id: 'lead-guthrie',
    url: 'https://guthriekitchenandbath.com',
    companyName: 'Guthrie Kitchen And Bath',
    industry: 'Kitchen & Bath Remodeling',
    contactEmail: 'mike@gk-bp.com',
    location: 'Pleasant View, TN',
    status: 'drafted',
    overallScore: 56,
    createdAt: '2026-11-01T12:00:00.000Z',
    lastAuditedAt: '2026-11-01T14:25:00.000Z',
    notes: 'Cabinetry galleries take 5.8s on mobile. Email drafted with praise hook.',
    auditId: 'audit-guthrie',
    campaignId: 'seq-guthrie',
  },
  {
    id: 'lead-seed-1',
    url: 'https://apex-hvac-solutions.sample',
    companyName: 'Apex HVAC Solutions',
    industry: 'Home Services / HVAC',
    contactEmail: 'contact@apex-hvac-solutions.sample',
    status: 'drafted',
    overallScore: 48,
    createdAt: '2026-10-28T10:00:00.000Z',
    lastAuditedAt: '2026-10-30T14:30:00.000Z',
    notes: 'High local reviews (4.8 stars) but website looks 12 years old. Missing mobile call CTA.',
    auditId: 'audit-seed-1',
    campaignId: 'seq-seed-1',
  },
  {
    id: 'lead-seed-2',
    url: 'https://dr-miller-dentistry.sample',
    companyName: 'Miller Family Dental Clinic',
    industry: 'Healthcare / Dental',
    contactEmail: 'reception@dr-miller-dentistry.sample',
    status: 'audited',
    overallScore: 54,
    createdAt: '2026-10-27T09:15:00.000Z',
    lastAuditedAt: '2026-10-29T11:20:00.000Z',
    notes: 'No mobile viewport meta tag. Patient intake form is an unstyled table.',
    auditId: 'audit-seed-2',
  },
  {
    id: 'lead-seed-3',
    url: 'https://rustic-bistro-grill.sample',
    companyName: 'The Rustic Bistro & Bar',
    industry: 'Hospitality / Restaurant',
    contactEmail: 'info@rustic-bistro-grill.sample',
    status: 'contacted',
    overallScore: 39,
    createdAt: '2026-10-25T16:45:00.000Z',
    lastAuditedAt: '2026-10-28T18:00:00.000Z',
    notes: 'Sent Touch 1 highlighting the unreadable PDF mobile menu.',
    auditId: 'audit-seed-3',
  },
];

export const DEFAULT_SEED_AUDITS: Record<string, AuditReport> = {
  'audit-guthrie': {
    id: 'audit-guthrie',
    leadId: 'lead-guthrie',
    url: 'https://guthriekitchenandbath.com',
    companyName: 'Guthrie Kitchen And Bath',
    industry: 'Kitchen & Bath Remodeling',
    contactEmail: 'mike@gk-bp.com',
    location: 'Pleasant View, TN',
    analyzedAt: '2026-11-01T14:25:00.000Z',
    scores: {
      overall: 56,
      design: 52, // 5 / 10
      speed: 15,  // 1 / 10
      mobile: 71, // 7 / 10
      seo: 92,    // 9 / 10
    },
    issues: [
      {
        id: 'iss-g-1',
        category: 'design',
        severity: 'warning',
        title: 'Outdated Layout Hierarchy & Visual Polish',
        description: 'The portfolio gallery uses cramped thumbnail grids that do not showcase high-end craftsmanship effectively.',
        recommendation: 'Modernize with full-bleed before/after project sliders and editorial typography.',
        impactEstimate: '+28% visitor engagement on custom kitchen portfolios',
      },
      {
        id: 'iss-g-2',
        category: 'seo',
        severity: 'info',
        title: 'Strong Local Keyword Optimization',
        description: 'Page title and headers properly target Pleasant View and regional kitchen remodel queries.',
        recommendation: 'Expand with automated project case study schema to capture regional rich snippets.',
        impactEstimate: 'Preserve high rank while increasing click-through rate',
      },
      {
        id: 'iss-g-3',
        category: 'mobile',
        severity: 'warning',
        title: 'Hidden Consultation Booking Button on Mobile',
        description: 'Mobile visitors must scroll down past three full screens before encountering the estimate consultation form.',
        recommendation: 'Implement a sticky thumb-zone "Book Consultation" button on smartphone screens.',
        impactEstimate: '+35% conversion from smartphone browsing homeowners',
      },
      {
        id: 'iss-g-4',
        category: 'speed',
        severity: 'critical',
        title: 'Severe Image Bloat & 5.8s Load Delay',
        description: 'Uncompressed raw JPEG countertop and bath photos add 6.4MB of unoptimized assets on mobile cellular connections.',
        recommendation: 'Convert to responsive WebP with lazy loading on below-the-fold project photo galleries.',
        impactEstimate: 'Reduce mobile load time from 5.8s to 1.1s',
      },
    ],
    techStack: ['WordPress', 'Legacy Slider Plugin', 'Google Fonts'],
    visualCritique: 'Authentic project craftsmanship is obscured by dated thumbnail grids, uncompressed media files, and lack of immediate mobile conversion paths.',
    redesignSuggestion: 'A clean editorial remodel showcase with sticky consultation scheduling and instant WebP media will convert high-intent local homeowners.',
    rawMetrics: {
      loadTimeMs: 5820,
      pageSizeKb: 6400,
      viewportConfigured: true,
      hasTitle: true,
      titleText: 'Guthrie Kitchen and Bath | Pleasant View Remodeling',
      hasMetaDesc: true,
      metaDescText: 'Premier kitchen and bathroom remodeling and custom cabinetry in Pleasant View and surrounding areas.',
      hasOpenGraph: true,
      hasSchema: false,
      headingCount: { h1: 1, h2: 3, h3: 4 },
      totalImages: 24,
      imagesWithoutAlt: 12,
      totalScripts: 14,
      totalStylesheets: 6,
      legacyLibrariesDetected: ['jQuery 1.11', 'OwlCarousel'],
    },
  },
  'audit-seed-1': {
    id: 'audit-seed-1',
    leadId: 'lead-seed-1',
    url: 'https://apex-hvac-solutions.sample',
    companyName: 'Apex HVAC Solutions',
    industry: 'Home Services / HVAC',
    analyzedAt: '2026-10-30T14:30:00.000Z',
    scores: {
      overall: 48,
      design: 42,
      speed: 38,
      mobile: 45,
      seo: 66,
    },
    issues: [
      {
        id: 'iss-1',
        category: 'mobile',
        severity: 'critical',
        title: 'Missing Sticky Tap-to-Call on Mobile',
        description: 'Emergency HVAC customers on phones cannot quickly reach dispatchers without zooming into tiny header text.',
        recommendation: 'Add high-contrast floating 1-click call bar anchored to the mobile viewport.',
        impactEstimate: '+35% immediate phone inquiries for emergency services',
      },
      {
        id: 'iss-2',
        category: 'speed',
        severity: 'critical',
        title: 'Unoptimized 4.2MB Hero Slider Images',
        description: 'Uncompressed PNG slides load on page start, delaying First Contentful Paint by over 4.8 seconds.',
        recommendation: 'Replace bloated slider with responsive WebP single hero image and modern typography.',
        impactEstimate: 'Reduce mobile page load time from 5.4s to under 1.2s',
      },
      {
        id: 'iss-3',
        category: 'design',
        severity: 'warning',
        title: 'Dated 2012-Era Skeuomorphic Styling',
        description: 'Heavy beveled 3D gradient buttons and low-contrast grey-on-blue text diminish modern professional trust.',
        recommendation: 'Adopt clean flat design with clear visual hierarchy, modern cards, and emerald accent CTAs.',
        impactEstimate: 'Boost user brand perception and modern trust signals',
      },
      {
        id: 'iss-4',
        category: 'seo',
        severity: 'warning',
        title: 'Missing OpenGraph & Local Service Schema',
        description: 'Link previews on iMessage, Facebook, and WhatsApp render as blank grey cards without image or snippet.',
        recommendation: 'Implement LocalBusiness JSON-LD schema and dynamic OpenGraph image tags.',
        impactEstimate: 'Improve rich search results and social share click-throughs',
      },
    ],
    techStack: ['WordPress 4.9', 'jQuery 1.12', 'Bootstrap 3.3', 'Apache'],
    visualCritique: 'The homepage visually dates the business to roughly 2012-2014. The 3D glossy button styling, low contrast grey body text on pale blue boxes, and an auto-rotating banner slider create cognitive clutter and high mobile bounce rates.',
    redesignSuggestion: 'Transform into a sleek, service-oriented emergency booking hub: bold headline with 24/7 service badge, instant quote estimate calculator, verifiable customer review badges, and high-visibility phone number.',
    rawMetrics: {
      loadTimeMs: 4820,
      pageSizeKb: 4350,
      viewportConfigured: false,
      hasTitle: true,
      titleText: 'Apex HVAC Solutions | Heating, Air Conditioning & Repair Services',
      hasMetaDesc: false,
      hasOpenGraph: false,
      hasSchema: false,
      headingCount: { h1: 1, h2: 7, h3: 3 },
      totalImages: 18,
      imagesWithoutAlt: 11,
      totalScripts: 14,
      totalStylesheets: 9,
      legacyLibrariesDetected: ['jQuery v1.12.4', 'Bootstrap v3.3.7'],
    },
  },
};

export const DEFAULT_SEED_SEQUENCES: Record<string, EmailSequence> = {
  'seq-guthrie': {
    id: 'seq-guthrie',
    leadId: 'lead-guthrie',
    url: 'https://guthriekitchenandbath.com',
    companyName: 'Guthrie Kitchen And Bath',
    tone: 'boutique_agency',
    createdAt: '2026-11-01T14:26:00.000Z',
    personalizationSummary: 'Appreciates their authentic craftsmanship while highlighting the 5.8s mobile gallery bottleneck.',
    customRedesignPitch: 'Streamlined mobile gallery with 1-tap consultation scheduling upfront.',
    touches: [
      {
        step: 1,
        title: 'The Specific Teardown Hook',
        timing: 'Day 1 (Initial Outreach)',
        subjectLines: [
          'guthriekitchenandbath.com needs a little polish',
          'Quick observation regarding guthriekitchenandbath.com',
        ],
        hook: 'Letting your work speak for itself is something I respect.',
        body: `Hi Mike,\n\nI was on guthriekitchenandbath.com, and one thing in particular caught my eye. Letting your work speak for itself is something I respect.\n\nThere are a few things that caught my attention though. Your mobile site takes nearly 6 seconds to load high-res cabinetry galleries on cellular connections, and the consultation booking button is hidden below three full folds.\n\nI put together a quick 2-minute wireframe showing how streamlining the mobile gallery and placing a 1-tap estimate button upfront could turn more local homeowners into booked design consultations.`,
        cta: 'Would you be open to taking a look?',
      },
      {
        step: 2,
        title: 'The Wireframe Walkthrough',
        timing: 'Day 4 (Follow-up)',
        subjectLines: [
          'Re: guthriekitchenandbath.com polish (quick mockup)',
          'Mobile wireframe concept for Guthrie Kitchen & Bath',
        ],
        hook: 'Sketched out how an instant consultation trigger looks on mobile.',
        body: `Hi Mike,\n\nFollowing up on my note earlier this week.\n\nI sketched out a quick visual mockup showing how your kitchen and bath transformations could be showcased in full-bleed WebP with an instant "Book Free Consultation" button anchored to mobile screens.\n\nHappy to send over the 2-minute Loom or screenshot if helpful.`,
        cta: 'Mind if I share the visual?',
      },
      {
        step: 3,
        title: 'Local Remodeling Case Study',
        timing: 'Day 8 (Social Proof)',
        subjectLines: [
          'How a regional bath showroom increased consultation requests by 41%',
          'Quick question regarding Guthrie Kitchen and Bath website',
        ],
        hook: 'Looking at recent remodeling contractor benchmark stats in Tennessee.',
        body: `Hi Mike,\n\nQuick thought: we recently redesigned a regional custom showroom website. By optimizing their project galleries for sub-second mobile loading and sticky appointment booking, their qualified consultation requests jumped by 41% in the first 60 days.\n\nWith high-ticket kitchen remodels, capturing just 2 additional consultation bookings a month makes a major difference.`,
        cta: 'Are you open to discussing a website refresh this quarter?',
      },
      {
        step: 4,
        title: 'Polite Break-Up & Free Audit',
        timing: 'Day 14 (Closing)',
        subjectLines: [
          'Closing the loop (guthriekitchenandbath.com)',
          'Full audit link for Guthrie Kitchen and Bath',
        ],
        hook: 'Assuming you are flat out with client renovation jobs right now.',
        body: `Hi Mike,\n\nI assume you are completely wrapped up with active renovation projects and web updates aren't on your radar right now—totally understand!\n\nI left your site audit overview active here for your team whenever you decide to revisit it.\n\nWishing Guthrie Kitchen And Bath continued success with your upcoming builds!`,
        cta: 'Feel free to reach back out anytime if things open up.',
      },
    ],
  },
  'seq-seed-1': {
    id: 'seq-seed-1',
    leadId: 'lead-seed-1',
    url: 'https://apex-hvac-solutions.sample',
    companyName: 'Apex HVAC Solutions',
    tone: 'boutique_agency',
    createdAt: '2026-10-30T15:00:00.000Z',
    personalizationSummary: 'Targets the 4.8s mobile load delay caused by uncompressed slider banners and the absence of a one-tap phone call button for emergency homeowners.',
    customRedesignPitch: 'Proposed a modern high-speed mobile booking interface with instant emergency dispatch CTA, reducing bounce rates by ~40%.',
    touches: [
      {
        step: 1,
        title: 'The Diagnostic Hook',
        timing: 'Day 1 (Initial Outreach)',
        subjectLines: [
          'Quick observation about Apex HVAC mobile layout',
          'Losing emergency AC calls on mobile? (Quick breakdown)',
          'Quick UX critique for apex-hvac-solutions.sample',
        ],
        hook: 'I noticed your business has stellar 4.8-star reviews in the area, but when searching for emergency service on a smartphone, your current site takes over 4.8 seconds to load.',
        body: `Hi team Apex HVAC,\n\nI was doing some research on top-rated HVAC specialists in your area and noticed your strong reputation and 4.8-star track record.\n\nHowever, when I pulled up apex-hvac-solutions.sample on my phone, I noticed two quick bottlenecks that are likely costing you inbound service calls:\n\n1. The 4.2MB banner slider delays mobile loading by nearly 5 seconds, causing urgent homeowners to bounce back to Google.\n2. There is no sticky "Tap to Call Dispatcher" button on mobile screens—customers have to pinch and zoom to find the phone number.\n\nI put together a quick, no-strings-attached audit report breaking down how modernizing this could capture an extra 15-25 qualified calls every month.`,
        cta: 'Would you be open to a 2-minute video walkthrough where I show you what the revamped mobile flow would look like?',
      },
      {
        step: 2,
        title: 'The Redesign Teaser & Mockup',
        timing: 'Day 4 (Value Follow-Up)',
        subjectLines: [
          'Mockup concept for Apex HVAC emergency mobile flow',
          'Re: Apex HVAC mobile layout (quick visual)',
        ],
        hook: 'Following up with a tangible concept—sketched out how an instant emergency dispatch bar would look on your homepage.',
        body: `Hi team,\n\nFollowing up on my note from Tuesday.\n\nRather than just describing the issue, I put together a quick visual wireframe showing how a modernized mobile layout with an instant "Book Emergency Tech" CTA would look for Apex HVAC.\n\nBy compressing those hero slides into WebP and making the booking button persistent at the bottom of mobile screens, page load drops from 4.8s to 0.9s.\n\nHappy to email over the mockup image if you'd like to see it.`,
        cta: 'Mind if I send the screenshot over?',
      },
      {
        step: 3,
        title: 'The Competitor & ROI Framing',
        timing: 'Day 8 (Social Proof & ROI)',
        subjectLines: [
          'How competitor sites in your market are converting mobile traffic',
          'Quick question regarding Apex HVAC web overhaul',
        ],
        hook: 'Looking at recent HVAC redesign benchmarks in your region.',
        body: `Hi Apex team,\n\nQuick thought: we recently redesigned a similar local residential services site in the tri-state area. Simply by replacing their legacy 2013-era layout and adding local service schema, their qualified mobile calls jumped by 38% within the first 60 days.\n\nGiven the strong search volume for furnace and AC repairs right now, having your site load instantly with frictionless mobile booking pays for itself in just a few completed service jobs.`,
        cta: 'Are you currently considering updating the website this quarter, or is this not a priority right now?',
      },
      {
        step: 4,
        title: 'The Polite Break-Up & Audit Link',
        timing: 'Day 14 (Gracious Exit)',
        subjectLines: [
          'Final thought & full audit link for Apex HVAC',
          'Closing the loop (Apex HVAC redesign)',
        ],
        hook: 'I know you are busy managing dispatch and active client jobs.',
        body: `Hi team,\n\nI will assume you are flat out with customer jobs right now and website improvements are not on the immediate radar—totally understand!\n\nI left the interactive audit report active for your reference here: https://pitchr.app/audit/apex-hvac\n\nFeel free to review the specific mobile speed and SEO notes whenever you decide to revisit your web presence. Wishing Apex HVAC continued success!`,
        cta: 'If things open up later this year, feel free to reply directly to this thread.',
      },
    ],
  },
};

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

export function getStoredLeads(): Lead[] {
  if (typeof window === 'undefined') return DEFAULT_SEED_LEADS;
  try {
    const raw = localStorage.getItem(LEADS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error('Error reading stored leads:', err);
  }
  return DEFAULT_SEED_LEADS;
}

export function saveStoredLeads(leads: Lead[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads));
}

export function getStoredAudits(): Record<string, AuditReport> {
  if (typeof window === 'undefined') return DEFAULT_SEED_AUDITS;
  try {
    const raw = localStorage.getItem(AUDITS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading stored audits:', err);
  }
  return DEFAULT_SEED_AUDITS;
}

export function saveStoredAudits(audits: Record<string, AuditReport>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUDITS_STORAGE_KEY, JSON.stringify(audits));
}

export function getStoredSequences(): Record<string, EmailSequence> {
  if (typeof window === 'undefined') return DEFAULT_SEED_SEQUENCES;
  try {
    const raw = localStorage.getItem(SEQUENCES_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading stored sequences:', err);
  }
  return DEFAULT_SEED_SEQUENCES;
}

export function saveStoredSequences(sequences: Record<string, EmailSequence>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SEQUENCES_STORAGE_KEY, JSON.stringify(sequences));
}

// Sync helper between Local Storage and Supabase
export async function syncLeadToSupabase(lead: Lead, audit?: AuditReport, sequence?: EmailSequence): Promise<{ success: boolean; error?: string }> {
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

const USER_PROFILE_STORAGE_KEY = 'pitchr_user_profile_v1';

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
