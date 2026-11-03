export interface PageSpeedOpportunity {
  id: string;
  title: string;
  description: string;
  displayValue?: string;
  wastedMs?: number;
  wastedBytes?: number;
}

export interface GooglePageSpeedMetrics {
  performanceScore: number; // 0-100
  seoScore: number;         // 0-100
  accessibilityScore: number; // 0-100
  lcpMs: number;
  lcpDisplay: string;
  fcpMs: number;
  fcpDisplay: string;
  tbtMs: number;
  tbtDisplay: string;
  cls: number;
  clsDisplay: string;
  speedIndexDisplay: string;
  totalBytes: number;
  totalByteWeightDisplay: string;
  screenshotDataUri?: string;
  opportunities: PageSpeedOpportunity[];
  diagnostics: string[];
}

/**
 * Fetches real Google Lighthouse mobile telemetry via Google PageSpeed Insights API v5.
 */
export async function fetchGooglePageSpeed(
  targetUrl: string,
  providedKey?: string,
  timeoutMs = 20000
): Promise<GooglePageSpeedMetrics | null> {
  const apiKey = providedKey || process.env.GOOGLE_PAGESPEED_API_KEY;
  if (!apiKey) {
    return null;
  }

  const encodedUrl = encodeURIComponent(targetUrl);
  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodedUrl}&strategy=mobile&category=performance&category=seo&category=accessibility&key=${apiKey}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[PageSpeed API] HTTP ${response.status} for ${targetUrl}:`, errText.substring(0, 300));
      return null;
    }

    const data = await response.json();
    const lh = data?.lighthouseResult;
    if (!lh) return null;

    const cats = lh.categories || {};
    const audits = lh.audits || {};

    const performanceScore = Math.round((cats.performance?.score ?? 0.5) * 100);
    const seoScore = Math.round((cats.seo?.score ?? 0.7) * 100);
    const accessibilityScore = Math.round((cats.accessibility?.score ?? 0.7) * 100);

    const lcpAudit = audits['largest-contentful-paint'] || {};
    const fcpAudit = audits['first-contentful-paint'] || {};
    const tbtAudit = audits['total-blocking-time'] || {};
    const clsAudit = audits['cumulative-layout-shift'] || {};
    const speedIndexAudit = audits['speed-index'] || {};
    const byteWeightAudit = audits['total-byte-weight'] || {};

    // Extract real opportunities (render-blocking, heavy JS, unoptimized images)
    const opportunityKeys = [
      'render-blocking-resources',
      'unused-javascript',
      'modern-image-formats',
      'offscreen-images',
      'uses-optimized-images',
      'uses-responsive-images',
      'unminified-css',
      'unminified-javascript',
      'server-response-time',
    ];

    const opportunities: PageSpeedOpportunity[] = [];
    for (const key of opportunityKeys) {
      const opp = audits[key];
      if (opp && opp.score !== null && opp.score < 0.9 && opp.details) {
        opportunities.push({
          id: key,
          title: opp.title,
          description: opp.description?.replace(/\[Learn more\].*$/i, '').trim() || opp.title,
          displayValue: opp.displayValue,
          wastedMs: opp.details?.overallSavingsMs,
          wastedBytes: opp.details?.overallSavingsBytes,
        });
      }
    }

    const diagnostics: string[] = [];
    if (audits['diagnostics']?.details?.items?.[0]) {
      const item = audits['diagnostics'].details.items[0];
      if (item.numRequests) diagnostics.push(`${item.numRequests} HTTP requests`);
      if (item.numScripts) diagnostics.push(`${item.numScripts} third-party scripts`);
      if (item.mainDocumentTransferSize) {
        diagnostics.push(`${Math.round(item.mainDocumentTransferSize / 1024)}KB main document`);
      }
    }

    const screenshotDataUri = audits['final-screenshot']?.details?.data;

    return {
      performanceScore,
      seoScore,
      accessibilityScore,
      lcpMs: Math.round(lcpAudit.numericValue || 0),
      lcpDisplay: lcpAudit.displayValue || `${((lcpAudit.numericValue || 0) / 1000).toFixed(1)} s`,
      fcpMs: Math.round(fcpAudit.numericValue || 0),
      fcpDisplay: fcpAudit.displayValue || '0.0 s',
      tbtMs: Math.round(tbtAudit.numericValue || 0),
      tbtDisplay: tbtAudit.displayValue || '0 ms',
      cls: Number(clsAudit.numericValue?.toFixed(3) || 0),
      clsDisplay: clsAudit.displayValue || '0.00',
      speedIndexDisplay: speedIndexAudit.displayValue || '0.0 s',
      totalBytes: Math.round(byteWeightAudit.numericValue || 0),
      totalByteWeightDisplay: byteWeightAudit.displayValue || '0 KB',
      screenshotDataUri: screenshotDataUri || undefined,
      opportunities,
      diagnostics,
    };
  } catch (err: any) {
    console.warn(`[PageSpeed API] Failed to evaluate ${targetUrl}:`, err.message || err);
    return null;
  }
}
