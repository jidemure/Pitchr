export type IssueSeverity = 'critical' | 'warning' | 'info';
export type IssueCategory = 'design' | 'speed' | 'mobile' | 'seo';
export type LeadStatus = 'audited' | 'drafted' | 'contacted' | 'replied' | 'converted';
export type OutreachTone = 'freelancer' | 'boutique_agency' | 'performance_roi';

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
}

export interface Lead {
  id: string;
  url: string;
  companyName: string;
  industry: string;
  contactEmail?: string;
  location?: string;
  status: LeadStatus;
  overallScore: number;
  createdAt: string;
  lastAuditedAt: string;
  auditId?: string;
  campaignId?: string;
  notes?: string;
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
}
