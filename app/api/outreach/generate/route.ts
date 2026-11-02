import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { AuditReport, EmailSequence, OutreachTone } from '@/lib/types';
import {
  createRateLimiter,
  getClientIp,
  analyzePrimaryConversionBottleneck,
  extractNameFromEmail,
} from '@/lib/auditHelpers';

const outreachLimiter = createRateLimiter(60000, 15);

function getAiClient(): GoogleGenAI | null {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    process.env.GEMINI_KEY ||
    '';
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

function deriveIndustryCustomerAction(industry: string = ''): string {
  const lower = industry.toLowerCase();
  if (lower.includes('build') || lower.includes('construct') || lower.includes('contractor') || lower.includes('roof')) {
    return 'request in-home estimates';
  }
  if (lower.includes('dent') || lower.includes('clinic') || lower.includes('medic') || lower.includes('health')) {
    return 'book patient appointments';
  }
  if (lower.includes('law') || lower.includes('legal') || lower.includes('attorney')) {
    return 'schedule case consultations';
  }
  if (lower.includes('restaur') || lower.includes('food') || lower.includes('cafe')) {
    return 'reserve tables or order online';
  }
  if (lower.includes('real estate') || lower.includes('property') || lower.includes('realt')) {
    return 'schedule private viewings';
  }
  if (lower.includes('saas') || lower.includes('tech') || lower.includes('softw')) {
    return 'start a self-serve trial';
  }
  return 'book appointments or request quotes';
}

function deriveSpecificIssueText(audit: AuditReport): string {
  if (audit.scores?.mobile < 60) {
    return `the mobile page takes over 7 seconds to load and requires zooming in on phones`;
  }
  if (audit.scores?.speed < 65) {
    return `the homepage takes over 8 seconds to become interactive`;
  }
  if (audit.scores?.seo < 60) {
    return `the meta tags and structured headings are missing, hurting Google search ranking`;
  }
  const critIssue = (audit.issues || []).find((i) => i.severity === 'critical');
  if (critIssue) {
    return critIssue.description.toLowerCase().replace(/\.$/, '');
  }
  return `the primary contact button and call-to-action are pushed far below the fold on mobile`;
}

function deriveSpecificWorkText(industry: string = ''): string {
  const lower = industry.toLowerCase();
  if (lower.includes('build') || lower.includes('construct')) return 'recent construction & renovation projects';
  if (lower.includes('dent') || lower.includes('medic')) return 'patient care and clinic services';
  if (lower.includes('law') || lower.includes('legal')) return 'client case results and legal expertise';
  if (lower.includes('design') || lower.includes('archit')) return 'portfolio showcase and design projects';
  return 'work and track record';
}

function formatTouchBodyWithLayout(
  paragraphs: string[],
  greeting: string,
  signatureBlock: string
): string {
  const cleanParas = paragraphs
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !p.startsWith('Hi ') && !p.startsWith('Hello ') && !p.startsWith('Hey '));

  return `${greeting}\n\n${cleanParas.join('\n\n')}\n\n${signatureBlock}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const clientIp = getClientIp(request);
    const rateCheck = outreachLimiter.check(clientIp);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Outreach generation limit reached. Please wait before generating more.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSec || 30) } }
      );
    }
    const audit: AuditReport = body.audit;
    const tone: OutreachTone = body.tone || 'specific_problem';
    const agencyName: string = body.agencyName || 'Apex Digital Studio';
    const senderName: string = body.senderName || 'Alex';
    const customOffer: string = body.customOffer || 'Free 2-minute mobile wireframe walkthrough';

    if (!audit || !audit.url) {
      return NextResponse.json({ error: 'Valid audit report is required.' }, { status: 400 });
    }

    const cleanDomain = audit.url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
    const customerAction = deriveIndustryCustomerAction(audit.industry);
    const bottleneck = analyzePrimaryConversionBottleneck(audit.scores || { design: 70, speed: 70, mobile: 70, seo: 70 });

    // Derive personalized prospect first name (prospectName -> email name extraction -> fallback)
    const discoveredName = audit.prospectName || extractNameFromEmail(audit.contactEmail || '') || '';
    const prospectFirstName = discoveredName.trim() ? discoveredName.trim().split(' ')[0] : '';
    const greeting = prospectFirstName ? `Hi ${prospectFirstName},` : `Hi ${audit.companyName} team,`;
    const specificIssue = deriveSpecificIssueText(audit);
    const specificWork = deriveSpecificWorkText(audit.industry);
    const senderEmail = body.senderEmail || 'alex@apexstudio.io';
    const agencyWebsite = body.agencyWebsite || 'apexstudio.io';

    // Signature support: Use user's custom signature if provided, otherwise clean default
    const userSignature = (body.customSignature || body.signature || '').trim();
    const effectiveSignature =
      userSignature ||
      `Website Design & Redesign | ${agencyName}\n${senderEmail} | ${agencyWebsite}`;
    const unsubscribeFooter = `Not interested? Reply "no thanks" and I won't email again.`;
    const signatureBlock = `${senderName}\n${effectiveSignature}\n\n${unsubscribeFooter}`;

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

    // Hand-crafted 5 playbook variations with exact paragraph formatting (double newlines)
    let touch1Subject = `Quick note about ${audit.companyName}'s website`;
    let touch1Paras = [
      `I was looking at ${cleanDomain}'s site and noticed ${specificIssue}.`,
      `That's usually where visitors give up before they ever call or book.`,
      `I put together 3 quick fixes for it. Want me to send them over?`,
    ];
    let touch1Cta = `Want me to send them over?`;

    let touch2Subject = `Re: Quick note about ${audit.companyName}'s website`;
    let touch2Paras = [
      `Following up on ${cleanDomain}'s site. The ${specificIssue} is usually a quick fix that doesn't require a full rebuild.`,
      `I can walk you through the 3 quick fixes in 2 minutes. Should I send the details over?`,
    ];
    let touch2Cta = `Should I send the details over?`;

    if (activeVariation === 'compliment_gap') {
      touch1Subject = `Loved your ${specificWork}`;
      touch1Paras = [
        `Your ${specificWork} is impressive, but your website doesn't show it off as well as it could (${specificIssue}).`,
        `I help ${audit.industry} businesses turn their sites into something that consistently brings in enquiries.`,
        `I can send a short list of improvements if you're open to it.`,
      ];
      touch1Cta = `Want the list of improvements?`;
      touch2Subject = `Re: Loved your ${specificWork}`;
      touch2Paras = [
        `Just bumping this in case it got buried. I'd love to show you how your best work could be presented better online.`,
        `Want me to send the short list over?`,
      ];
      touch2Cta = `Want the list?`;
    } else if (activeVariation === 'free_audit') {
      touch1Subject = `Free 3-point audit for ${audit.companyName}`;
      touch1Paras = [
        `I run quick website audits for ${audit.industry} businesses.`,
        `I've already looked at ${cleanDomain} and found 3 things that could be costing you leads (${specificIssue}).`,
        `I'll send the audit for free, with no obligation. Want it?`,
      ];
      touch1Cta = `Want the free audit?`;
      touch2Subject = `Re: Free 3-point audit for ${audit.companyName}`;
      touch2Paras = [
        `The 3-point audit for ${cleanDomain} is ready whenever you are.`,
        `Reply "yes" and I'll send it right over, no strings attached.`,
      ];
      touch2Cta = `Reply "yes" and I'll send it over.`;
    } else if (activeVariation === 'competitor_angle') {
      touch1Subject = `${audit.companyName} vs. local competitors online`;
      touch1Paras = [
        `I compared ${cleanDomain} with top local competitors in your area.`,
        `Theirs loads faster and makes it easier for clients to ${customerAction}. A few small changes could close that gap.`,
        `Happy to share what I'd change if useful.`,
      ];
      touch1Cta = `Happy to share what I'd change if useful.`;
      touch2Subject = `Re: ${audit.companyName} vs. local competitors online`;
      touch2Paras = [
        `I can send the side-by-side comparison if you'd like to see where you're ahead and where you could improve.`,
        `Interested in seeing the breakdown?`,
      ];
      touch2Cta = `Interested in the comparison?`;
    } else if (activeVariation === 'question_opener') {
      touch1Subject = `Question about your website`;
      touch1Paras = [
        `Quick question: is your website bringing in as many customers as you'd like?`,
        `I looked at ${cleanDomain} and spotted that ${specificIssue}.`,
        `I made a short 2-minute video showing it, and I can send the link if you want to see it.`,
      ];
      touch1Cta = `Can I send the video link over?`;
      touch2Subject = `Re: Question about your website`;
      touch2Paras = [
        `Here's the short 2-minute video walkthrough I mentioned regarding ${cleanDomain}.`,
        `Take a quick look and let me know what you think.`,
      ];
      touch2Cta = `Let me know what you think.`;
    }

    const touch1Body = formatTouchBodyWithLayout(touch1Paras, greeting, signatureBlock);
    const touch2Body = formatTouchBodyWithLayout(touch2Paras, greeting, signatureBlock);

    const touch3Paras = [
      `One last observation: ${audit.companyName}'s site doesn't have a clear consultation call-to-action above the fold on mobile.`,
      `That small shift alone typically makes a noticeable difference in enquiry volume.`,
      `If you'd like to talk it through, here's a free 15-minute slot: https://calendly.com/${senderName.toLowerCase().replace(/\s+/g, '')}`,
    ];
    const touch3Body = formatTouchBodyWithLayout(touch3Paras, greeting, signatureBlock);

    const touch4Paras = [
      `I haven't heard back, so I assume improving ${cleanDomain} isn't a priority right now.`,
      `Should I close your file?`,
      `If things change down the road, you're always welcome to reach back out.`,
    ];
    const touch4Body = formatTouchBodyWithLayout(touch4Paras, greeting, signatureBlock);

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
        body: touch3Body,
        cta: `Open to a quick 15-minute slot?`,
      },
      {
        step: 4,
        title: 'Break-up Email',
        timing: 'Day 12',
        subjectLines: ['Should I close your file?'],
        hook: `Permission to close your file re: ${cleanDomain}.`,
        body: touch4Body,
        cta: `Should I close your file?`,
      },
    ];

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
5. PARAGRAPH FORMATTING: Separate paragraphs with empty lines (\\n\\n).
6. GREETING: Address directly as "${greeting}".
7. FOOTER: End each email body with the clean signature and unsubscribe line:
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
    let formattedAiTouches: typeof bespokeTouches | null = null;

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
            const parsed = JSON.parse(response.text);
            if (parsed && Array.isArray(parsed.touches) && parsed.touches.length > 0) {
              // Format each AI-generated touch body to enforce clean spacing & signature
              formattedAiTouches = parsed.touches.map((t: any, idx: number) => {
                const raw = (t.body || '').replace(/\r\n/g, '\n').trim();
                // Strip redundant AI headings/unsubscribes
                const cleanRaw = raw
                  .replace(/^(Hi|Hello|Hey)\s+[^,\n]+,\s*/i, '')
                  .replace(/\n*Not interested\?.*$/i, '')
                  .trim();

                const rawParas = cleanRaw
                  .split(/\n{2,}/)
                  .map((p: string) => p.trim())
                  .filter(Boolean);

                const finalBody =
                  rawParas.length > 0
                    ? formatTouchBodyWithLayout(rawParas, greeting, signatureBlock)
                    : bespokeTouches[idx]?.body || bespokeTouches[0].body;

                return {
                  step: t.step || idx + 1,
                  title: t.title || bespokeTouches[idx]?.title || `Touch #${idx + 1}`,
                  timing: t.timing || bespokeTouches[idx]?.timing || 'Day 1',
                  subjectLines: Array.isArray(t.subjectLines) && t.subjectLines.length > 0 ? t.subjectLines : bespokeTouches[idx]?.subjectLines || [touch1Subject],
                  hook: t.hook || bespokeTouches[idx]?.hook || '',
                  body: finalBody,
                  cta: t.cta || bespokeTouches[idx]?.cta || '',
                };
              });
              break;
            }
          }
        } catch (mErr) {
          console.warn(`Outreach model ${modelName} error, trying fallback...`, mErr);
        }
      }
    }

    const sequence: EmailSequence = {
      id: `seq-${Date.now()}`,
      leadId: audit.leadId,
      url: audit.url,
      companyName: audit.companyName,
      tone,
      createdAt: new Date().toISOString(),
      personalizationSummary:
        `Anchored on ${audit.companyName}'s primary bottleneck: ${bottleneck.headline}, targeting lost ${customerAction}.`,
      customRedesignPitch:
        bottleneck.pitchHook,
      touches: formattedAiTouches || bespokeTouches,
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
