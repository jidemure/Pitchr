export type IssueSeverity = 'critical' | 'warning' | 'info';
export type IssueCategory = 'design' | 'speed' | 'mobile' | 'seo';
export type LeadStatus = 'audited' | 'drafted' | 'contacted' | 'replied' | 'converted';
export type OutreachTone =
  | 'specific_problem'
  | 'compliment_gap'
  | 'free_audit'
  | 'competitor_angle'
  | 'question_opener'
  | 'freelancer'
  | 'boutique_agency'
  | 'performance_roi';

export interface AuditIssue {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  title: string;
  description: string;
  recommendation: string;
  impactEstimate?: string;
}

export interface AuditScoreBreakdown {
  overall: number;
  design: number;
  speed: number;
  mobile: number;
  seo: number;
}

export interface RawMetrics {
  loadTimeMs: number;
  pageSizeKb: number;
  viewportConfigured: boolean;
  hasTitle: boolean;
  titleText?: string;
  hasMetaDesc: boolean;
  metaDescText?: string;
  hasOpenGraph: boolean;
  hasSchema: boolean;
  headingCount: {
    h1: number;
    h2: number;
    h3: number;
  };
  totalImages: number;
  imagesWithoutAlt: number;
  totalScripts: number;
  totalStylesheets: number;
  legacyLibrariesDetected: string[];
}

export interface AuditReport {
  id: string;
  leadId: string;
  url: string;
  companyName: string;
  industry: string;
  analyzedAt: string;
  contactEmail?: string;
  prospectName?: string;
  prospectTitle?: string;
  emailSource?: 'user' | 'website_prospect' | 'website_general' | 'domain_fallback';
  location?: string;
  scores: AuditScoreBreakdown;
  issues: AuditIssue[];
  techStack: string[];
  visualCritique: string;
  redesignSuggestion: string;
  rawMetrics: RawMetrics;
}

export interface EmailTouch {
  step: number;
  title: string;
  timing: string;
  subjectLines: string[];
  hook: string;
  body: string;
  cta: string;
}

export interface TouchPerformance {
  step: number;
  title: string;
  sent: number;
  opened: number;
  responded: number;
  bounced?: number;
}

export interface CampaignPerformanceStats {
  sent: number;
  opened: number;
  responded: number;
  bounced?: number;
  converted?: number;
  touchBreakdown?: TouchPerformance[];
  lastDispatchedAt?: string;
}

export interface EmailSequence {
  id: string;
  leadId: string;
  url: string;
  companyName: string;
  tone: OutreachTone;
  createdAt: string;
  touches: EmailTouch[];
  personalizationSummary: string;
  customRedesignPitch: string;
  stats?: CampaignPerformanceStats;
}

export type EmailProvider = 'gmail' | 'outlook' | 'yahoo' | 'custom_smtp' | 'mailto';

export interface CustomSmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  fromEmail: string;
  fromName: string;
  configured: boolean;
}

export interface LeadFollowUpStatus {
  currentTouchStep: number; // 1: Initial Hook, 2: Follow-up 1, 3: Follow-up 2, 4: Breakup
  lastSentAt?: string;
  lastSentTouch?: number;
  lastProviderUsed?: EmailProvider;
  nextFollowUpDue?: string;
  notes?: string;
}

export interface Lead {
  id: string;
  url: string;
  companyName: string;
  industry: string;
  contactEmail?: string;
  prospectName?: string;
  prospectTitle?: string;
  emailSource?: 'user' | 'website_prospect' | 'website_general' | 'domain_fallback';
  location?: string;
  status: LeadStatus;
  overallScore: number;
  createdAt: string;
  lastAuditedAt: string;
  auditId?: string;
  campaignId?: string;
  notes?: string;
  tags?: string[];
  followUp?: LeadFollowUpStatus;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  syncEnabled: boolean;
  lastSyncedAt?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  agencyName: string;
  role: string;
  avatarColor?: string;
  senderName: string;
  defaultOffer: string;
  signature?: string;
  preferredProvider?: EmailProvider;
  gmailAccountEmail?: string;
  customSmtp?: CustomSmtpConfig;
}
