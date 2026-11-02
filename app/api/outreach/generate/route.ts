import { NextRequest, NextResponse } from 'next/server';
import { createRateLimiter } from '@/lib/auditHelpers';
const outreachLimiter = createRateLimiter(60000, 25);

import { GoogleGenAI, Type } from '@google/genai';
import { AuditReport, EmailSequence, OutreachTone } from '@/lib/types';

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
  });
}

interface ConversionBottleneck {
  flawId: 'viewport_broken' | 'slow_speed' | 'dated_design' | 'missing_cta' | 'broken_seo';
  headline: string;
  hookEvidence: string;
  leadLossImpact: string;
  wireframeSolution: string;
  caseStudyMetric: string;
}

function deriveIndustryCustomerAction(industry: string = ''): string {
  const ind = industry.toLowerCase();
  if (ind.includes('dent') || ind.includes('clinic') || ind.includes('health') || ind.includes('med')) {
    return 'new patient bookings';
  }
  if (ind.includes('kitchen') || ind.includes('bath') || ind.includes('roof') || ind.includes('remodel') || ind.includes('construct')) {
    return 'in-home estimate requests';
  }
  if (ind.includes('hvac') || ind.includes('plumb') || ind.includes('electric') || ind.includes('repair')) {
    return 'emergency service calls';
  }
  if (ind.includes('law') || ind.includes('legal') || ind.includes('attorney')) {
    return 'case evaluation inquiries';
  }
  if (ind.includes('bistro') || ind.includes('restaurant') || ind.includes('food') || ind.includes('cafe')) {
    return 'private event bookings';
  }
  return 'high-intent quote requests';
}

function analyzePrimaryConversionBottleneck(audit: AuditReport): ConversionBottleneck {
  const raw = audit.rawMetrics;
  const scores = audit.scores;
  const issues = audit.issues || [];

  // Priority 1: Mobile Viewport Not Configured or Broken (Deadliest conversion leak on smartphones)
  if (!raw.viewportConfigured || scores.mobile < 45 || issues.some((i) => i.category === 'mobile' && i.severity === 'critical')) {
    return {
      flawId: 'viewport_broken',
      headline: 'Missing Mobile Viewport Scaling',
      hookEvidence: 'your mobile site renders in unscaled desktop view on modern smartphones, requiring visitors to manually pinch and zoom to read details',
      leadLossImpact: 'Over 62% of local searches happen on mobile devices. When prospects cannot easily tap consultation buttons or read your phone number, over half bounce within 3 seconds directly to a competitor.',
      wireframeSolution: 'a fully responsive mobile layout with a persistent thumb-zone consultation trigger and one-tap calling',
      caseStudyMetric: '+54% lift in mobile quote submissions',
    };
  }

  // Priority 2: Cellular Load Time > 2.2 seconds (Massive bounce rate)
  const loadSeconds = (raw.loadTimeMs / 1000).toFixed(1);
  if (raw.loadTimeMs > 2200 || scores.speed < 50 || raw.pageSizeKb > 400) {
    return {
      flawId: 'slow_speed',
      headline: `High Cellular Latency (${loadSeconds}s load / ${raw.pageSizeKb}KB payload)`,
      hookEvidence: `your page takes over ${loadSeconds} seconds before cellular visitors can see and click your quote actions, due to ${raw.pageSizeKb}KB of uncompressed assets`,
      leadLossImpact: 'Google mobile metrics prove that 53% of mobile visits are abandoned if a page takes over 3 seconds to load. You are losing paying customers before your hero section even paints on screen.',
      wireframeSolution: 'an optimized modern asset pipeline with lazy loading and instant 0.7s first-contentful paint',
      caseStudyMetric: 'slashed bounce rate by 38% and increased estimate requests by 43%',
    };
  }

  // Priority 3: Dated Design / Legacy Architecture (First-Impression Credibility Gap)
  if (scores.design < 65 || raw.legacyLibrariesDetected.length > 0 || audit.visualCritique.toLowerCase().includes('dated') || audit.visualCritique.toLowerCase().includes('legacy')) {
    const techHint = raw.legacyLibrariesDetected[0] || 'legacy grid structure';
    return {
      flawId: 'dated_design',
      headline: 'Dated Visual Hierarchy & Legacy Layout',
      hookEvidence: `your visual layout utilizes ${techHint} with older typography that does not reflect the premium quality of your actual work`,
      leadLossImpact: 'High-ticket buyers comparing 2-3 local options evaluate trust in the first 50 milliseconds. A dated digital presence creates an immediate credibility gap that pushes discerning prospects toward modern rivals.',
      wireframeSolution: 'a contemporary editorial makeover with crisp typography, verified client proof badges, and an interactive project gallery',
      caseStudyMetric: '+31% increase in average consultation project size',
    };
  }

  // Priority 4: Missing SEO Title / Meta Description (SERP Organic Click Leakage)
  if (!raw.hasTitle || !raw.hasMetaDesc || scores.seo < 55) {
    return {
      flawId: 'broken_seo',
      headline: 'Missing Search Snippet Meta Data',
      hookEvidence: 'your meta title and search description tags are unconfigured, causing Google search results to show truncated, generic snippets',
      leadLossImpact: 'When local prospects search for your services, Google displays broken preview text instead of a compelling reason to choose your business, leaking high-intent searchers to competitors.',
      wireframeSolution: 'optimized Schema.org structured data and rich click-attracting search snippets',
      caseStudyMetric: '+29% more organic search clicks without paid advertising',
    };
  }

  // Default / Catch-All: Buried Primary Conversion Call to Action
  return {
    flawId: 'missing_cta',
    headline: 'Buried Mobile Call to Action',
    hookEvidence: 'there is no sticky or high-contrast consultation button visible above the fold on mobile screens',
    leadLossImpact: 'Prospects who arrive ready to hire must scroll through several paragraphs to find how to get in touch, causing friction and lead abandonment.',
    wireframeSolution: 'a dedicated consultation header bar with a low-friction 2-step inquiry modal',
    caseStudyMetric: '+37% increase in direct visitor-to-inquiry conversion',
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // 1. Sliding window rate limit check
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local-client';
    const rateCheck = outreachLimiter.check(clientIp);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Outreach generation limit reached. Please wait before generating more.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSec || 30) } }
      );
    }
    const audit: AuditReport = body.audit;
    const tone: OutreachTone = body.tone || 'boutique_agency';
    const agencyName: string = body.agencyName || 'Apex Digital Studio';
    const senderName: string = body.senderName || 'Alex';
    const customOffer: string = body.customOffer || 'Free 2-minute mobile wireframe walkthrough';

    if (!audit || !audit.url) {
      return NextResponse.json({ error: 'Valid audit report is required.' }, { status: 400 });
    }

    const cleanDomain = audit.url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
    const customerAction = deriveIndustryCustomerAction(audit.industry);
    const bottleneck = analyzePrimaryConversionBottleneck(audit);

    // Filter issues for highest impact
    const sortedIssues = [...(audit.issues || [])].sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return (order[a.severity] || 2) - (order[b.severity] || 2);
    });

    const issuesSummary = sortedIssues
      .slice(0, 3)
      .map(
        (iss, idx) =>
          `${idx + 1}. [${iss.category.toUpperCase()}] ${iss.title} (${iss.severity}): ${iss.description}. Fix: ${iss.recommendation}. Impact on sales: ${iss.impactEstimate || 'Higher conversions'}`
      )
      .join('\n');

    const prompt = `You are an elite B2B cold outreach copywriter who writes bespoke, highly credible website redesign proposals that convert at 35%+.

CRITICAL OBJECTIVE:
What was discovered during the audit, use the MOST OBVIOUS ONE affecting increase in sales or leads (${bottleneck.headline}) as the core anchor.
Make the email copy look 100% unique, natural, and specifically hand-crafted for this business—NEVER sound like a copy-and-paste boilerplate template.

Prospect Analysis:
- Business: ${audit.companyName} (${cleanDomain})
- Industry: ${audit.industry}
- Customer Inquiries Look Like: ${customerAction}
- Discovered Primary Bottleneck: ${bottleneck.headline}
- Specific Technical Flaw: ${bottleneck.hookEvidence}
- Real Commercial Consequence: ${bottleneck.leadLossImpact}
- Proposed Redesign Fix: ${bottleneck.wireframeSolution}
- Real-World Case Study Lift: ${bottleneck.caseStudyMetric}
- Secondary Issues:
${issuesSummary}

Outreach Angle (${tone}):
${tone === 'boutique_agency' ? '- Focus on brand authority, elevated client perception, and capturing premium high-ticket clients.' : ''}
${tone === 'freelancer' ? '- Authentic, humble designer/engineer speaking peer-to-peer with zero agency fluff.' : ''}
${tone === 'performance_roi' ? '- Direct, numbers-focused teardown of bounce rates, page speed, and lost revenue.' : ''}

Sender: ${senderName} from ${agencyName}
Offer: ${customOffer}

Generate a progressive 4-touch cold sequence:
1. Touch 1 (The Diagnostic Hook): 75-105 words.
   - Lead directly with ${cleanDomain} and the exact discovered bottleneck (${bottleneck.hookEvidence}).
   - Clearly explain why this is costing them ${customerAction}.
   - Offer the 2-minute visual wireframe (${customOffer}) with a frictionless, zero-pressure question.
   - DO NOT repeat phrases like "I was on your website and one thing caught my eye" across touches.
2. Touch 2 (The 2-Minute Solution): 65-90 words (3 days later).
   - Describe what the wireframe shows (e.g. ${bottleneck.wireframeSolution}).
   - Ask permission to drop the quick 90-second video walkthrough.
3. Touch 3 (The Commercial Case Study): 70-95 words (7 days later).
   - Share the tangible result from another ${audit.industry} project (${bottleneck.caseStudyMetric}).
   - Explain how recovering 1-2 lost ${customerAction} per month pays for the entire redesign.
4. Touch 4 (The Polite Closure): 40-65 words (12 days later).
   - Clean, graceful departure with zero guilt. Leaves an open door for the future.

Include 2-3 short, compelling, lowercase subject lines for each touch.`;

    const ai = getAiClient();
    const modelCandidates = ['gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    let parsed: any = null;

    if (ai) {
      for (const modelName of modelCandidates) {
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Outreach AI model timeout')), 15000)
          );

          const aiPromise = ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  personalizationSummary: {
                    type: Type.STRING,
                    description: '1-2 sentences explaining why this specific email angle will hook this client.',
                  },
                  customRedesignPitch: {
                    type: Type.STRING,
                    description: 'The core redesign value proposition formulated for this client.',
                  },
                  touches: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        step: { type: Type.INTEGER },
                        title: { type: Type.STRING },
                        timing: { type: Type.STRING },
                        subjectLines: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                        },
                        hook: { type: Type.STRING },
                        body: { type: Type.STRING },
                        cta: { type: Type.STRING },
                      },
                      required: ['step', 'title', 'timing', 'subjectLines', 'hook', 'body', 'cta'],
                    },
                  },
                },
                required: ['personalizationSummary', 'customRedesignPitch', 'touches'],
              },
            },
          });

          const response = await Promise.race([aiPromise, timeoutPromise]);
          if (response && response.text) {
            parsed = JSON.parse(response.text);
            break;
          }
        } catch (mErr) {
          console.warn(`Outreach model ${modelName} error, trying fallback...`, mErr);
        }
      }
    }

    // Dynamic, flaw-specific fallback sequence: 100% tailored to the actual discovered audit flaw
    const bespokeTouches = [
      {
        step: 1,
        title: 'Initial Diagnostic Hook',
        timing: 'Day 1 (Immediate)',
        subjectLines: [
          `quick note about ${cleanDomain}`,
          `conversion bottleneck on ${cleanDomain}`,
          `${cleanDomain} missing ${customerAction}?`,
        ],
        hook: `I was reviewing ${cleanDomain} and noticed ${bottleneck.hookEvidence}.`,
        body: `Hi,\n\nI was analyzing ${cleanDomain} earlier today and noticed a specific bottleneck that is likely costing you ${customerAction}: ${bottleneck.hookEvidence}.\n\n${bottleneck.leadLossImpact}\n\nI sketched a quick 2-minute wireframe showing how ${bottleneck.wireframeSolution} immediately recaptures these lost inquiries.`,
        cta: `Open to taking a quick look at the wireframe?`,
      },
      {
        step: 2,
        title: 'Wireframe Walkthrough & Visual Concept',
        timing: 'Day 3 (Follow-up)',
        subjectLines: [
          `2-min wireframe for ${cleanDomain}`,
          `wireframe walkthrough re: ${cleanDomain}`,
        ],
        hook: `Putting a visual to my earlier note regarding ${cleanDomain}.`,
        body: `Hi,\n\nFollowing up on my note regarding ${cleanDomain}.\n\nI recorded a quick 90-second video walkthrough showing how ${bottleneck.wireframeSolution} captures prospective clients who currently bounce back to Google.\n\nWould you like me to send the video link over? No sales pitch or obligation at all.`,
        cta: `Mind if I send the video over?`,
      },
      {
        step: 3,
        title: 'Industry Case Study & Revenue ROI',
        timing: 'Day 7 (Technical Proof)',
        subjectLines: [
          `case study: ${bottleneck.caseStudyMetric} for ${audit.industry}`,
          `${cleanDomain} vs local competitor benchmark`,
        ],
        hook: `How fixing ${bottleneck.headline.toLowerCase()} directly impacts monthly revenue.`,
        body: `Hi,\n\nWhen we resolved this exact same bottleneck for another ${audit.industry} business last quarter, the result was ${bottleneck.caseStudyMetric} within 30 days.\n\nFor ${audit.companyName}, recovering just 1-2 additional ${customerAction} per month would more than pay for the entire redesign.\n\nI have the complete before-and-after breakdown ready if you'd like to inspect it.`,
        cta: `Should I send the case study over?`,
      },
      {
        step: 4,
        title: 'Polite 9-Word Breakup',
        timing: 'Day 12 (Closure)',
        subjectLines: [
          `closing file on ${cleanDomain}`,
          `permission to close loop for ${audit.companyName}?`,
        ],
        hook: `Checking if improving ${cleanDomain} is on your roadmap this quarter.`,
        body: `Hi,\n\nI haven't heard back, so I assume modernizing ${cleanDomain} isn't a priority right now—totally understand!\n\nIf anything changes down the road, feel free to reach back out anytime. Wishing ${audit.companyName} continued success.`,
        cta: `Have you decided against redesigning ${cleanDomain} for now?`,
      },
    ];

    const sequence: EmailSequence = {
      id: `seq-${Date.now()}`,
      leadId: audit.leadId,
      url: audit.url,
      companyName: audit.companyName,
      tone,
      createdAt: new Date().toISOString(),
      personalizationSummary:
        parsed?.personalizationSummary ||
        `Anchored on ${audit.companyName}'s primary bottleneck: ${bottleneck.headline}, targeting lost ${customerAction}.`,
      customRedesignPitch:
        parsed?.customRedesignPitch ||
        `Implement ${bottleneck.wireframeSolution} to achieve ${bottleneck.caseStudyMetric}.`,
      touches: parsed?.touches && parsed.touches.length > 0 ? parsed.touches : bespokeTouches,
    };

    return NextResponse.json({ success: true, sequence });
  } catch (error: any) {
    console.error('Outreach generation error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to generate cold email sequence.',
      },
      { status: 500 }
    );
  }
}
