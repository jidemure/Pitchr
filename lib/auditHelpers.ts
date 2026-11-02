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
    { cat: 'mobile', score: scores.mobile },
    { cat: 'speed', score: scores.speed },
    { cat: 'design', score: scores.design },
    { cat: 'seo', score: scores.seo },
  ];

  // Sort lowest score first (greatest bottleneck)
  categories.sort((a, b) => a.score - b.score);
  const worst = categories[0];

  switch (worst.cat) {
    case 'mobile':
      return {
        category: 'mobile',
        headline: 'Critical Mobile Viewport & Touch Friction',
        impactScore: worst.score,
        pitchHook: 'Over 68% of visitors browse on mobile devices, but tap targets and layout shifts are costing you conversions.',
      };
    case 'speed':
      return {
        category: 'speed',
        headline: 'Heavy Asset Load & Slow Time to Interactive',
        impactScore: worst.score,
        pitchHook: 'Every 1-second delay in page load drops prospect engagement by up to 20%. Optimizing asset delivery will immediately recapture lost leads.',
      };
    case 'design':
      return {
        category: 'design',
        headline: 'Outdated Visual Hierarchy & Trust Signals',
        impactScore: worst.score,
        pitchHook: 'First impressions form in under 50ms. A clean modern aesthetic elevates authority and justifies premium pricing.',
      };
    case 'seo':
      return {
        category: 'seo',
        headline: 'Missing Semantic Structure & Search Meta',
        impactScore: worst.score,
        pitchHook: 'Search engines and social previews lack key OpenGraph tags and semantic hierarchy, diminishing organic reach.',
      };
  }
}

/**
 * In-memory sliding window rate limiter for serverless API routes.
 */
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
