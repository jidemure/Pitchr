/**
 * Core audit, domain processing, SSRF protection, and bottleneck detection utilities.
 */

export interface BottleneckAnalysis {
  category: 'speed' | 'mobile' | 'design' | 'seo';
  headline: string;
  impactScore: number;
  pitchHook: string;
}

/**
 * Normalizes input URL strings ensuring secure https:// scheme.
 */
export function normalizeUrl(inputUrl: string): string {
  let url = (inputUrl || '').trim();
  if (!url) return '';
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  return url;
}

/**
 * Extracts normalized hostname without www. or ports.
 */
export function extractDomainName(urlStr: string): string {
  try {
    const normalized = normalizeUrl(urlStr);
    const parsed = new URL(normalized);
    return parsed.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return (urlStr || '').trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase();
  }
}

/**
 * Derives a clean company / brand name from title tag or domain.
 */
export function deriveCompanyName(domain: string, htmlTitle?: string): string {
  if (htmlTitle && htmlTitle.length > 2) {
    const lower = htmlTitle.toLowerCase();
    // Exclude generic bot traps / block pages
    if (!lower.includes('just a moment') && !lower.includes('404') && !lower.includes('access denied') && !lower.includes('cloudflare')) {
      const segments = htmlTitle.split(/[|\-–—:]/);
      const cleaned = segments[0].trim();
      if (cleaned.length >= 2 && cleaned.length < 50) {
        return cleaned;
      }
    }
  }

  // Fallback: format domain name
  const cleanDomain = extractDomainName(domain);
  const basePart = cleanDomain.split('.')[0] || 'Business';
  return basePart
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * SSRF security check: Blocks requests to internal networks, loopbacks, and cloud metadata services.
 */
export function isSafePublicUrl(urlStr: string): { safe: boolean; reason?: string } {
  try {
    const normalized = normalizeUrl(urlStr);
    const parsed = new URL(normalized);

    // Only allow http/https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: 'Invalid protocol: Only HTTP/HTTPS protocols are permitted.' };
    }

    const rawHost = parsed.hostname.toLowerCase();
    const host = rawHost.replace(/^\[|\]$/g, '');

    // Whitelist sample test mock domains for demos
    if (host.endsWith('.sample') || host.endsWith('.test') || host.endsWith('.demo')) {
      return { safe: true };
    }

    // Block localhost and loopbacks
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0') {
      return { safe: false, reason: 'Loopback and localhost addresses are prohibited.' };
    }

    // Block cloud metadata services (AWS, GCP, Azure, OpenStack)
    if (host === '169.254.169.254' || host === 'metadata.google.internal' || host.includes('metadata')) {
      return { safe: false, reason: 'Cloud instance metadata endpoints are prohibited.' };
    }

    // Block private RFC1918 IPv4 ranges
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = host.match(ipv4Regex);
    if (ipMatch) {
      const octet1 = parseInt(ipMatch[1], 10);
      const octet2 = parseInt(ipMatch[2], 10);

      // 10.0.0.0 - 10.255.255.255
      if (octet1 === 10) return { safe: false, reason: 'Private 10.0.0.0/8 subnet access is prohibited.' };
      // 172.16.0.0 - 172.31.255.255
      if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return { safe: false, reason: 'Private 172.16.0.0/12 subnet access is prohibited.' };
      // 192.168.0.0 - 192.168.255.255
      if (octet1 === 192 && octet2 === 168) return { safe: false, reason: 'Private 192.168.0.0/16 subnet access is prohibited.' };
      // 127.0.0.0/8 loopback
      if (octet1 === 127) return { safe: false, reason: 'Loopback subnet access is prohibited.' };
    }

    return { safe: true };
  } catch (err: any) {
    return { safe: false, reason: `Malformed URL: ${err.message}` };
  }
}

/**
 * Identifies the primary website bottleneck and formulates the high-converting cold pitch hook.
 */
export function analyzePrimaryConversionBottleneck(scores: {
  design: number;
  speed: number;
  mobile: number;
  seo: number;
}): BottleneckAnalysis {
  const categories: Array<{ cat: 'speed' | 'mobile' | 'design' | 'seo'; score: number }> = [
    { cat: 'speed', score: scores.speed },
    { cat: 'seo', score: scores.seo },
    { cat: 'design', score: scores.design },
    { cat: 'mobile', score: scores.mobile },
  ];

  // Sort lowest score first (greatest bottleneck)
  categories.sort((a, b) => a.score - b.score);
  const worst = categories[0];

  switch (worst.cat) {
    case 'speed':
      return {
        category: 'speed',
        headline: 'Heavy Asset Load & Slow Time to Interactive',
        impactScore: worst.score,
        pitchHook: 'Every 1-second delay in page load drops prospect engagement by up to 20%. Optimizing asset delivery will immediately recapture lost leads.',
      };
    case 'seo':
      return {
        category: 'seo',
        headline: 'Missing Semantic Structure & Search Meta',
        impactScore: worst.score,
        pitchHook: 'Search engines and social previews lack key OpenGraph tags and semantic hierarchy, diminishing organic reach against local competitors.',
      };
    case 'design':
      return {
        category: 'design',
        headline: 'Outdated Visual Hierarchy & Trust Signals',
        impactScore: worst.score,
        pitchHook: 'When prospective clients compare local providers, an outdated layout and missing above-the-fold call to action cause over 40% to bounce before requesting an estimate.',
      };
    case 'mobile':
    default:
      return {
        category: 'mobile',
        headline: 'Critical Mobile Viewport & Touch Friction',
        impactScore: worst.score,
        pitchHook: 'Over 68% of visitors browse on mobile devices, but tap targets and layout shifts are costing you conversions.',
      };
  }
}

/**
 * In-memory sliding window rate limiter for serverless API routes.
 */
export function getClientIp(req: { headers: { get: (name: string) => string | null } }): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local-client';
}

export function createRateLimiter(windowMs: number, maxRequests: number) {
  const hits = new Map<string, number[]>();

  return {
    check(key: string): { allowed: boolean; remaining: number; retryAfterSec?: number } {
      const now = Date.now();
      const timestamps = hits.get(key) || [];
      const windowStart = now - windowMs;

      // Filter timestamps outside current window
      const valid = timestamps.filter((t) => t > windowStart);

      if (valid.length >= maxRequests) {
        const oldest = valid[0];
        const retryAfterSec = Math.ceil((oldest + windowMs - now) / 1000);
        return { allowed: false, remaining: 0, retryAfterSec };
      }

      valid.push(now);
      hits.set(key, valid);

      // Periodically clean up stale entries if map grows
      if (hits.size > 2000) {
        for (const [k, v] of hits.entries()) {
          const fresh = v.filter((t) => t > windowStart);
          if (fresh.length === 0) hits.delete(k);
          else hits.set(k, fresh);
        }
      }

      return { allowed: true, remaining: maxRequests - valid.length };
    },
  };
}

/**
 * Scrapes and cleans email addresses from HTML, prioritizing personal/prospect emails and domain matches.
 */
export function extractEmailsFromHtml(html: string, targetDomain: string): {
  personal: string[];
  general: string[];
  all: string[];
} {
  if (!html) return { personal: [], general: [], all: [] };

  const cleanTargetDomain = extractDomainName(targetDomain);
  const found = new Set<string>();

  // 1. Match mailto: links
  const mailtoRegex = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  let m: RegExpExecArray | null;
  while ((m = mailtoRegex.exec(html)) !== null) {
    if (m[1]) found.add(m[1].toLowerCase().trim());
  }

  // 2. Match raw emails in text, JSON-LD, comments, data attributes
  const rawEmailRegex = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/gi;
  while ((m = rawEmailRegex.exec(html)) !== null) {
    if (m[1]) found.add(m[1].toLowerCase().trim());
  }

  // 3. Filter out asset false-positives and known bot / system traps
  const excludedPatterns = [
    /\.(png|jpg|jpeg|gif|svg|webp|css|js|woff|woff2|ttf|eot)$/i,
    /example\.(com|org|net)/i,
    /domain\.(com|org|net)/i,
    /yourcompany/i,
    /wixpress\.com/i,
    /sentry\.io/i,
    /wordpress\.(org|com)/i,
    /w3\.org/i,
    /schema\.org/i,
    /cloudflare\.com/i,
    /gravatar\.com/i,
    /^user@/i,
    /^test@/i,
    /^name@/i,
  ];

  const validEmails = Array.from(found).filter((email) => {
    return !excludedPatterns.some((pattern) => pattern.test(email));
  });

  const generalPrefixes = ['contact', 'info', 'support', 'sales', 'hello', 'office', 'admin', 'help', 'team', 'enquiries', 'inquiries', 'service'];

  const personal: string[] = [];
  const general: string[] = [];

  for (const email of validEmails) {
    const [localPart, domainPart] = email.split('@');
    const isDomainMatch = domainPart === cleanTargetDomain || cleanTargetDomain.endsWith(domainPart || '');
    const isGeneral = generalPrefixes.some((p) => localPart.toLowerCase().startsWith(p));

    if (isGeneral) {
      if (isDomainMatch) general.unshift(email);
      else general.push(email);
    } else {
      if (isDomainMatch) personal.unshift(email);
      else personal.push(email);
    }
  }

  return {
    personal,
    general,
    all: [...personal, ...general],
  };
}

/**
 * Extracts prospect/decision-maker cues from JSON-LD schema, meta authors, and team markup.
 */
export function extractProspectFromHtml(html: string): { name?: string; title?: string } {
  if (!html) return {};

  try {
    // 1. Search JSON-LD schemas
    const jsonLdRegex = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;
    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          if (item['@type'] === 'Person' && item.name && typeof item.name === 'string') {
            return {
              name: item.name.trim(),
              title: typeof item.jobTitle === 'string' ? item.jobTitle.trim() : 'Owner / Key Decision Maker',
            };
          }
          if (item.founder) {
            const founderName = typeof item.founder === 'string' ? item.founder : item.founder.name;
            if (founderName) {
              return {
                name: founderName.trim(),
                title: 'Founder',
              };
            }
          }
        }
      } catch {
        // Skip malformed individual JSON-LD blocks
      }
    }

    // 2. Search meta author
    const authorMatch = html.match(/<meta\b[^>]*\bname=["']author["'][^>]*\bcontent=["']([^"']+)["']/i) ||
                        html.match(/<meta\b[^>]*\bcontent=["']([^"']+)["'][^>]*\bname=["']author["']/i);
    if (authorMatch && authorMatch[1].trim().length > 2 && !authorMatch[1].includes('http')) {
      const name = authorMatch[1].trim();
      if (!name.toLowerCase().includes('wordpress') && !name.toLowerCase().includes('admin')) {
        return { name, title: 'Author / Founder' };
      }
    }

    // 3. Search common Founder / Owner text patterns
    const pattern = /\b(?:founder|owner|ceo|president|managing partner|principal|dr\.)\s*[:\-–]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/i;
    const textMatch = html.match(pattern);
    if (textMatch && textMatch[1]) {
      return {
        name: textMatch[1].trim(),
        title: 'Founder / Owner',
      };
    }
  } catch {
    // Graceful fallback
  }

  return {};
}

/**
 * Discovers the best Contact or About subpage URL on the website, prioritizing direct contact pages.
 */
export function findContactPageUrl(html: string, baseUrl: string): string | null {
  if (!html) return null;
  const linkRegex = /<a\b[^>]*\bhref=["']([^"'#]+)["'][^>]*>(.*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  let bestContactUrl: string | null = null;
  let fallbackAboutUrl: string | null = null;

  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1].trim();
    const anchorText = match[2].toLowerCase();
    const lowerHref = href.toLowerCase();

    if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) continue;

    try {
      const resolved = new URL(href, baseUrl);
      const baseDomain = new URL(baseUrl).hostname.replace(/^www\./i, '');
      if (resolved.hostname.replace(/^www\./i, '') !== baseDomain) continue;

      if (lowerHref.includes('/contact') || lowerHref.includes('contact-us') || anchorText.includes('contact') || anchorText.includes('get in touch')) {
        bestContactUrl = resolved.toString();
        break; // Highest priority
      } else if (lowerHref.includes('/about') || lowerHref.includes('/team') || anchorText.includes('about us') || anchorText.includes('our team')) {
        if (!fallbackAboutUrl) fallbackAboutUrl = resolved.toString();
      }
    } catch {
      continue;
    }
  }

  return bestContactUrl || fallbackAboutUrl;
}

/**
 * Derives a human first name and optional last name from an email address prefix (e.g. dennis@... -> "Dennis", john.smith@... -> "John Smith").
 * Filters out role-based prefixes like contact, info, sales, admin, etc.
 */
export function extractNameFromEmail(email: string): string | undefined {
  if (!email || !email.includes('@')) return undefined;
  const localPart = email.split('@')[0].trim().toLowerCase();
  const genericRoles = [
    'contact', 'info', 'support', 'hello', 'sales', 'admin', 'office', 'team',
    'help', 'mail', 'billing', 'press', 'inquiry', 'inquiries', 'feedback', 'service',
    'services', 'jobs', 'careers', 'general', 'reception', 'desk'
  ];
  if (genericRoles.includes(localPart)) return undefined;

  // Split on dots, underscores, dashes
  const parts = localPart.split(/[._-]/).filter((p) => p.length > 1 && !/\d/.test(p));
  if (parts.length === 0) return undefined;

  const capitalized = parts
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');

  return capitalized || undefined;
}
