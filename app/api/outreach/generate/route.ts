import { NextRequest, NextResponse } from 'next/server';
import { createRateLimiter, extractNameFromEmail } from '@/lib/auditHelpers';
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


function deriveSpecificIssueText(audit: AuditReport): string {
  const raw = audit.rawMetrics;
  const issues = audit.issues || [];
  
  if (!raw.viewportConfigured || audit.scores.mobile < 45) {
    return 'the page does not scale for mobile screens, requiring visitors to pinch and zoom';
  }
  if (raw.loadTimeMs > 2500 || audit.scores.speed < 50) {
    const secs = (raw.loadTimeMs / 1000).toFixed(1);
    return `the page takes ${secs} seconds to load on mobile`;
  }
  const speedIssue = issues.find(i => i.category === 'speed');
  if (speedIssue) return speedIssue.description.toLowerCase();

  const mobileIssue = issues.find(i => i.category === 'mobile');
  if (mobileIssue) return mobileIssue.description.toLowerCase();

  return 'the mobile gallery is slow to load and lacks a clear call-to-action above the fold';
}

function deriveSpecificWorkText(industry: string = ''): string {
  const ind = industry.toLowerCase();
  if (ind.includes('kitchen') || ind.includes('bath') || ind.includes('remodel') || ind.includes('build')) {
    return 'custom project portfolio';
  }
  if (ind.includes('dent') || ind.includes('health') || ind.includes('clinic')) {
    return 'patient care services';
  }
  if (ind.includes('law') || ind.includes('legal')) {
    return 'client case results';
  }
  return 'recent client work';
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

    // Derive personalized prospect first name (prospectName -> email name extraction -> fallback)
    const discoveredName = audit.prospectName || extractNameFromEmail(audit.contactEmail || '') || '';
    const prospectFirstName = discoveredName.trim() ? discoveredName.trim().split(' ')[0] : '';
    const greeting = prospectFirstName ? `Hi ${prospectFirstName},` : `Hi ${audit.companyName} team,`;
    const specificIssue = deriveSpecificIssueText(audit);
    const specificWork = deriveSpecificWorkText(audit.industry);
    const senderEmail = body.senderEmail || 'alex@apexstudio.io';
    const agencyLocation = body.agencyLocation || 'Lagos, Nigeria';
    const agencyWebsite = body.agencyWebsite || 'apexstudio.io';

    // Map tone to one of the 5 variations
    let activeVariation: 'specific_problem' | 'compliment_gap' | 'free_audit' | 'competitor_angle' | 'question_opener' = 'specific_problem';
    if (tone === 'compliment_gap' || tone === 'boutique_agency') {
      activeVariation = 'compliment_gap';
    } else if (tone === 'free_audit') {
      activeVariation = 'free_audit';
    } else if (tone === 'competitor_angle' || tone === 'performance_roi') {
      activeVariation = 'competitor_angle';
    } else if (tone === 'question_opener') {
      activeVariation = 'question_opener';
    } else {
      activeVariation = 'specific_problem';
    }

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

    const signatureBlock = `${senderName}
Website Design & Redesign | ${agencyName}
${senderEmail} | ${agencyWebsite}

Not interested? Reply "no thanks" and I won't email again.`;

    const prompt = `You are an elite B2B cold outreach copywriter who writes concise, authentic, high-converting cold email sequences.

CRITICAL RULES (STRICT COMPLIANCE):
1. UNDER 100 WORDS: Every email MUST be under 100 words. Plain text only.
2. NO CONSULTANT JARGON OR CLICHES: NEVER use "in the first 50 milliseconds", "bridge this credibility gap", "assume digital quality reflects construction quality", "lacks modern visual hierarchy", "synergy", or "first impressions are everything".
3. ONE CLEAR QUESTION: Only one clear, frictionless question per email. Never duplicate questions.
4. VARIATION TO GENERATE: ${activeVariation.toUpperCase()}
   - specific_problem: Mention ${specificIssue}. Explain that is usually where visitors bounce before calling/booking. Offer 3 quick fixes.
   - compliment_gap: Acknowledge their ${specificWork} is impressive, but mention ${specificIssue}. Offer a short list of improvements.
   - free_audit: Mention you run quick website audits for ${audit.industry} and found 3 things costing them leads. Offer the free audit with no obligation.
   - competitor_angle: Compare ${cleanDomain} with local competitors on mobile speed and ease of ${customerAction}. Offer to share the comparison.
   - question_opener: Ask if the site brings in as many customers as they'd like, point out ${specificIssue}, and offer a short 2-minute video.
5. GREETING: Address directly as "${greeting}".
6. FOOTER: End each email body with the clean signature and unsubscribe line:
${signatureBlock}

Prospect Details:
- Business: ${audit.companyName} (${cleanDomain})
- Recipient: ${prospectFirstName ? prospectFirstName : 'Business Owner'}
- Specific Finding: ${specificIssue}
- Industry: ${audit.industry}
- Customer Inquiries: ${customerAction}
`;

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
                    description: '1 sentence explaining the core hook.',
                  },
                  customRedesignPitch: {
                    type: Type.STRING,
                    description: 'The core value proposition.',
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

    // Hand-crafted fallback sequences matching the 5 playbook variations with 100% precision
    let touch1Subject = `Quick note about ${audit.companyName}'s website`;
    let touch1Body = `${greeting}\n\nI was looking at ${cleanDomain} and noticed ${specificIssue}.\n\nThat's usually where visitors give up before they ever call or book.\n\nI put together 3 quick fixes for it. Want me to send them over?\n\n${signatureBlock}`;
    let touch1Cta = `Want me to send them over?`;

    let touch2Subject = `Re: Quick note about ${audit.companyName}'s website`;
    let touch2Body = `${greeting}\n\nFollowing up on the ${specificIssue} I mentioned. It's a quick fix and I can walk you through it. Should I send the details?\n\n${senderName}\n${agencyName}\n\nNot interested? Reply "no thanks" and I won't email again.`;
    let touch2Cta = `Should I send the details?`;

    if (activeVariation === 'compliment_gap') {
      touch1Subject = `Loved your ${specificWork}`;
      touch1Body = `${greeting}\n\nYour ${specificWork} is impressive, but your website doesn't show it off as well as it could (${specificIssue}).\n\nI help ${audit.industry} businesses turn their sites into something that brings in enquiries. I can send a short list of improvements if you're open to it.\n\n${signatureBlock}`;
      touch1Cta = `Want the list of improvements?`;
      touch2Subject = `Re: Loved your ${specificWork}`;
      touch2Body = `${greeting}\n\nJust bumping this in case it got buried. I'd love to show you how your best work could be presented better online. Want the list?\n\n${senderName}\n${agencyName}\n\nNot interested? Reply "no thanks" and I won't email again.`;
      touch2Cta = `Want the list?`;
    } else if (activeVariation === 'free_audit') {
      touch1Subject = `Free 3-point audit for ${audit.companyName}`;
      touch1Body = `${greeting}\n\nI run quick website audits for ${audit.industry} businesses. I've already looked at yours and found 3 things that could be costing you leads (${specificIssue}).\n\nI'll send the audit for free, with no obligation. Want it?\n\n${signatureBlock}`;
      touch1Cta = `Want the free audit?`;
      touch2Subject = `Re: Free 3-point audit for ${audit.companyName}`;
      touch2Body = `${greeting}\n\nThe audit is ready whenever you are. Reply "yes" and I'll send it right over, no strings attached.\n\n${senderName}\n${agencyName}\n\nNot interested? Reply "no thanks" and I won't email again.`;
      touch2Cta = `Reply "yes" and I'll send it over.`;
    } else if (activeVariation === 'competitor_angle') {
      touch1Subject = `${audit.companyName} vs. local competitors online`;
      touch1Body = `${greeting}\n\nI compared ${cleanDomain} with top local competitors in your area. Theirs loads faster and makes it easier to ${customerAction}.\n\nA few small changes could close that gap. Happy to share what I'd change if useful.\n\n${signatureBlock}`;
      touch1Cta = `Happy to share what I'd change if useful.`;
      touch2Subject = `Re: ${audit.companyName} vs. local competitors online`;
      touch2Body = `${greeting}\n\nI can send the side-by-side comparison if you'd like to see where you're ahead and where you could improve. Interested?\n\n${senderName}\n${agencyName}\n\nNot interested? Reply "no thanks" and I won't email again.`;
      touch2Cta = `Interested in the side-by-side comparison?`;
    } else if (activeVariation === 'question_opener') {
      touch1Subject = `Question about your website`;
      touch1Body = `${greeting}\n\nQuick question: is your website bringing in as many customers as you'd like?\n\nI looked at ${cleanDomain} and spotted that ${specificIssue}. I made a short 2-minute video showing it, and I can send the link if you want to see it.\n\n${signatureBlock}`;
      touch1Cta = `Can I send the video link over?`;
      touch2Subject = `Re: Question about your website`;
      touch2Body = `${greeting}\n\nHere's the short video walkthrough I mentioned regarding ${cleanDomain}. It's under 2 minutes. Let me know what you think.\n\n${senderName}\n${agencyName}\n\nNot interested? Reply "no thanks" and I won't email again.`;
      touch2Cta = `Let me know what you think.`;
    }

    const bespokeTouches = [
      {
        step: 1,
        title: 'Initial Outreach',
        timing: 'Day 1 (Immediate)',
        subjectLines: [touch1Subject],
        hook: `Noticed ${specificIssue} on ${cleanDomain}.`,
        body: touch1Body,
        cta: touch1Cta,
      },
      {
        step: 2,
        title: 'Follow-up #1',
        timing: 'Day 3-4',
        subjectLines: [touch2Subject],
        hook: `Following up on the quick fix for ${cleanDomain}.`,
        body: touch2Body,
        cta: touch2Cta,
      },
      {
        step: 3,
        title: 'Follow-up #2',
        timing: 'Day 7',
        subjectLines: [`Re: ${touch1Subject}`],
        hook: `One last observation for ${cleanDomain}.`,
        body: `${greeting}\n\nOne last useful thing: ${audit.companyName}'s site doesn't have a clear consultation call-to-action above the fold on mobile. Small change, big difference in enquiries.\n\nIf you'd like to talk it through, here's a free 15-minute slot: https://calendly.com/${senderName.toLowerCase().replace(/\s+/g, '')}\n\n${signatureBlock}`,
        cta: `Open to a quick 15-minute slot?`,
      },
      {
        step: 4,
        title: 'Break-up Email',
        timing: 'Day 12',
        subjectLines: ['Should I close your file?'],
        hook: `Permission to close your file re: ${cleanDomain}.`,
        body: `${greeting}\n\nI haven't heard back, so I'll assume the timing isn't right and won't follow up again.\n\nIf your website becomes a priority later, my details are below and you're welcome to reach out anytime.\n\nWishing ${audit.companyName} all the best.\n\n${signatureBlock}`,
        cta: `Have you decided against modernizing ${cleanDomain} for now?`,
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
