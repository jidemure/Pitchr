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

  // Priority 1: Mobile Viewport Not Configured or Broken (Smartphone pinch-to-zoom drop-off)
  if (!raw.viewportConfigured || scores.mobile < 45 || issues.some((i) => i.category === 'mobile' && i.severity === 'critical')) {
    return {
      flawId: 'viewport_broken',
      headline: 'Mobile Viewport Scaling',
      hookEvidence: 'your mobile site renders in unscaled desktop format on modern smartphones, requiring visitors to manually pinch and zoom to read details or tap buttons',
      leadLossImpact: 'Over 60% of local client searches happen on mobile devices. When prospective clients cannot easily tap your phone number or inquiry buttons, high-intent leads quietly bounce to nearby competitors.',
      wireframeSolution: 'a fully responsive mobile layout with a persistent thumb-zone consultation trigger and one-tap calling',
      caseStudyMetric: '+52% lift in mobile quote submissions',
    };
  }

  // Priority 2: Cellular Load Time > 2.2 seconds (High cellular bounce)
  const loadSeconds = (raw.loadTimeMs / 1000).toFixed(1);
  if (raw.loadTimeMs > 2200 || scores.speed < 50 || raw.pageSizeKb > 400) {
    return {
      flawId: 'slow_speed',
      headline: `Cellular Image Load Speed (${loadSeconds}s load / ${raw.pageSizeKb}KB payload)`,
      hookEvidence: `uncompressed images and assets delay your page load to ${loadSeconds} seconds on mobile cellular connections`,
      leadLossImpact: 'Mobile visitors typically click back to Google if project photos take more than 3 seconds to render, meaning potential clients bounce before seeing your actual work.',
      wireframeSolution: 'modern WebP asset compression with responsive lazy loading for an instant under-1-second first paint',
      caseStudyMetric: 'slashed bounce rate by 38% and increased estimate inquiries by 41%',
    };
  }

  // Priority 3: Dated Design / Legacy Mobile Showcase
  if (scores.design < 65 || raw.legacyLibrariesDetected.length > 0 || audit.visualCritique.toLowerCase().includes('dated') || audit.visualCritique.toLowerCase().includes('legacy')) {
    return {
      flawId: 'dated_design',
      headline: 'Mobile Project Showcase & Conversion Flow',
      hookEvidence: 'your current mobile layout uses a legacy layout structure that slows down how potential clients browse your past projects and request consultations',
      leadLossImpact: 'When homeowners compare local service providers on their phones, they expect to see recent project galleries and tap a quick estimate button within seconds. A refreshed, thumb-friendly showcase captures high-ticket inquiries before they contact competitors.',
      wireframeSolution: 'a clean, modern portfolio showcase with verified client reviews and a streamlined 1-tap consultation drawer',
      caseStudyMetric: '+34% increase in qualified consultation requests',
    };
  }

  // Priority 4: Missing SEO Title / Meta Description (SERP Organic Click Leakage)
  if (!raw.hasTitle || !raw.hasMetaDesc || scores.seo < 55) {
    return {
      flawId: 'broken_seo',
      headline: 'Google Search Preview Snippet',
      hookEvidence: 'your search preview meta tags are unconfigured, causing Google results to display truncated, generic snippets instead of your specialty and service area',
      leadLossImpact: 'Local clients searching Google see broken preview snippets instead of a compelling reason to contact you, leaking organic search traffic to nearby rivals.',
      wireframeSolution: 'clean Schema.org structured data and compelling search preview snippets',
      caseStudyMetric: '+29% more organic search clicks without paid advertising',
    };
  }

  // Default / Catch-All: Mobile Consultation Flow
  return {
    flawId: 'missing_cta',
    headline: 'Mobile Consultation Flow',
    hookEvidence: 'there is no sticky consultation or estimate trigger visible above the fold on mobile screens',
    leadLossImpact: 'Ready-to-hire visitors on phones must scroll past multiple paragraphs just to find contact details, creating unnecessary drop-off.',
    wireframeSolution: 'a persistent, non-intrusive consultation trigger with a low-friction 2-step inquiry form',
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

    // Derive personalized greeting for prospect if identified
    const prospectFirstName = audit.prospectName?.trim() ? audit.prospectName.trim().split(' ')[0] : '';
    const greeting = prospectFirstName ? `Hi ${prospectFirstName},` : `Hi ${audit.companyName} team,`;

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

    const prompt = `You are an elite B2B cold outreach copywriter who writes warm, authentic, bespoke redesign proposals that sound 100% human and convert at 35%+.

CRITICAL VOICE & ANTI-SLOP RULES (STRICT ENFORCEMENT):
1. RESPECT THE CRAFT: Always acknowledge their actual quality, services, or craftsmanship respectfully in the opening. NEVER insult their business, NEVER say their work looks low quality, and NEVER say they have a "credibility gap".
2. ZERO ACADEMIC CLICHES & JARGON:
   - FORBIDDEN PHRASES: "in the first 50 milliseconds", "bridge this credibility gap", "assume digital quality reflects construction quality", "lacks a modern visual hierarchy", "synergy", "first impressions are everything".
   - Speak like an articulate, thoughtful design director or developer writing a quick peer-to-peer note.
3. SINGLE CTA RULE (NO DOUBLE QUESTIONS):
   - In "body": Provide the greeting, a warm genuine observation of their work, the specific mobile friction observation, and the lead-up to the wireframe preview. DO NOT put the closing question inside "body".
   - In "cta": Provide the single, friendly, low-pressure question (e.g. "Open to taking a quick 2-minute look at the wireframe? (No sales pitch either way).").
   - NEVER create stacked questions like "Would you be open to X? Worth a look?". The body and cta MUST join seamlessly into ONE natural sentence.
4. CONCISE LENGTH:
   - Touch 1: 65-85 words total.
   - Touch 2: 50-70 words.
   - Touch 3: 55-75 words.
   - Touch 4: 35-50 words.

Prospect Analysis:
- Business: ${audit.companyName} (${cleanDomain})
- Recipient / Prospect: ${audit.prospectName ? `${audit.prospectName} (${audit.prospectTitle || 'Decision Maker'})` : 'Business Owner / Team'}
- Greeting to use: ${greeting}
- Industry: ${audit.industry}
- Customer Inquiries Look Like: ${customerAction}
- Discovered Primary Opportunity: ${bottleneck.headline}
- Specific Technical Friction: ${bottleneck.hookEvidence}
- Real Commercial Value: ${bottleneck.leadLossImpact}
- Proposed Redesign Concept: ${bottleneck.wireframeSolution}
- Industry Metric: ${bottleneck.caseStudyMetric}
- Secondary Issues:
${issuesSummary}

Outreach Angle (${tone}):
${tone === 'boutique_agency' ? '- Focus on premium brand positioning, elevating project showcases, and capturing high-intent quote inquiries.' : ''}
${tone === 'freelancer' ? '- Authentic, humble designer/engineer speaking peer-to-peer with zero agency fluff.' : ''}
${tone === 'performance_roi' ? '- Direct, numbers-focused walkthrough of mobile bounce rates, image load times, and recaptured revenue.' : ''}

Sender: ${senderName} from ${agencyName}
Offer: ${customOffer}

Generate a progressive 4-touch cold sequence:
1. Touch 1 (The Diagnostic Hook): 65-85 words.
   - Start with ${greeting} and a warm compliment about ${audit.companyName}'s work on ${cleanDomain}.
   - Mention the specific mobile friction point (${bottleneck.hookEvidence}).
   - Mention that you sketched a quick 2-minute wireframe showing how ${bottleneck.wireframeSolution} captures more ${customerAction}.
   - Place the single frictionless question in the "cta" field.
2. Touch 2 (The 2-Minute Solution): 50-70 words (3 days later).
   - Describe what the wireframe shows (e.g. ${bottleneck.wireframeSolution}).
   - Ask permission in "cta" to drop the quick 90-second video walkthrough.
3. Touch 3 (The Commercial Case Study): 55-75 words (7 days later).
   - Share the tangible result from another ${audit.industry} project (${bottleneck.caseStudyMetric}).
   - Explain how recovering 1-2 lost ${customerAction} per month pays for the entire redesign.
4. Touch 4 (The Polite Closure): 35-50 words (12 days later).
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
          `mobile inquiry idea for ${cleanDomain}`,
          `${cleanDomain} mobile layout idea`,
        ],
        hook: `I was reviewing ${cleanDomain} and noticed ${bottleneck.hookEvidence}.`,
        body: `${greeting}\n\nI was checking out ${cleanDomain} earlier today—really impressive portfolio of work.\n\nOne small detail caught my eye on mobile: ${bottleneck.hookEvidence}. ${bottleneck.leadLossImpact}\n\nI put together a quick 2-minute visual wireframe showing how ${bottleneck.wireframeSolution} helps capture more of those inquiries.`,
        cta: `Open to seeing a quick 2-minute mobile walkthrough? (No sales pitch either way).`,
      },
      {
        step: 2,
        title: 'Wireframe Walkthrough & Visual Concept',
        timing: 'Day 3 (Follow-up)',
        subjectLines: [
          `2-min wireframe preview for ${cleanDomain}`,
          `quick walkthrough re: ${cleanDomain}`,
        ],
        hook: `Putting a visual to my earlier note regarding ${cleanDomain}.`,
        body: `${greeting}\n\nFollowing up on my quick note regarding ${cleanDomain}.\n\nI recorded a 90-second video walkthrough showing how ${bottleneck.wireframeSolution} captures prospective clients who currently bounce on smartphones.`,
        cta: `Mind if I send the video preview link over?`,
      },
      {
        step: 3,
        title: 'Industry Case Study & Revenue ROI',
        timing: 'Day 7 (Technical Proof)',
        subjectLines: [
          `case study: ${bottleneck.caseStudyMetric} for ${audit.industry}`,
          `${cleanDomain} mobile inquiry benchmark`,
        ],
        hook: `How fixing ${bottleneck.headline.toLowerCase()} directly impacts monthly revenue.`,
        body: `${greeting}\n\nWhen we resolved this exact same mobile friction for another ${audit.industry} business, the result was ${bottleneck.caseStudyMetric}.\n\nFor ${audit.companyName}, recovering just 1-2 additional ${customerAction} per month easily pays for the modern mobile flow.\n\nI have the complete before-and-after breakdown ready if you'd like to inspect it.`,
        cta: `Should I email the case study breakdown over?`,
      },
      {
        step: 4,
        title: 'Polite Closure',
        timing: 'Day 12 (Closure)',
        subjectLines: [
          `closing file on ${cleanDomain}`,
          `permission to close loop for ${audit.companyName}?`,
        ],
        hook: `Checking if improving ${cleanDomain} is on your roadmap this quarter.`,
        body: `${greeting}\n\nI haven't heard back, so I assume modernizing ${cleanDomain} isn't a priority right now—completely understand!\n\nIf anything changes down the road, feel free to reach back out anytime. Wishing ${audit.companyName} continued success.`,
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
