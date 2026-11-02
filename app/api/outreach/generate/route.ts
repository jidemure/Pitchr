import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { AuditReport, EmailSequence, OutreachTone } from '@/lib/types';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const audit: AuditReport = body.audit;
    const tone: OutreachTone = body.tone || 'boutique_agency';
    const agencyName: string = body.agencyName || 'Ascend Studio';
    const senderName: string = body.senderName || 'Alex';
    const customOffer: string = body.customOffer || 'Free 2-minute video mockup walkthrough';

    if (!audit || !audit.url) {
      return NextResponse.json({ error: 'Valid audit report is required.' }, { status: 400 });
    }

    // Top issues summary for prompt
    const issuesSummary = (audit.issues || [])
      .map(
        (iss, idx) =>
          `${idx + 1}. [${iss.category.toUpperCase()}] ${iss.title} (${iss.severity}): ${iss.description}. Fix: ${iss.recommendation}. Impact: ${iss.impactEstimate || 'Higher conversions'}`
      )
      .join('\n');

    const prompt = `You are an elite B2B cold email copywriter and agency founder with years of experience landing high-ticket website redesign contracts ($5,000 - $30,000).
Your methodology strictly mirrors the Swokei outreach philosophy:
- NO generic fluff, NO "Hope this email finds you well", NO pushy sales pitches.
- Open with specific, verifiable evidence that proves you actually visited and analyzed their website.
- Turn their technical and visual flaws into lost revenue/lead leakage that business owners intuitively grasp.
- Offer a frictionless, zero-risk, high-value low-barrier asset (like a ${customOffer}).

Prospect Details:
- Company Name: ${audit.companyName}
- Website URL: ${audit.url}
- Industry: ${audit.industry}
- Overall Score: ${audit.scores.overall}/100 (Design: ${audit.scores.design}, Speed: ${audit.scores.speed}, Mobile: ${audit.scores.mobile}, SEO: ${audit.scores.seo})
- Load Time: ${audit.rawMetrics.loadTimeMs}ms
- Mobile Viewport: ${audit.rawMetrics.viewportConfigured ? 'Present' : 'BROKEN / Missing'}
- Visual Critique: ${audit.visualCritique}
- Suggested Redesign Direction: ${audit.redesignSuggestion}

Discovered Pain Points:
${issuesSummary}

Outreach Angle & Tone: ${tone}
- freelancer: Authentic, nimble developer/designer speaking peer-to-peer.
- boutique_agency: High-craft, design-driven studio focusing on brand authority and premium client acquisition.
- performance_roi: Direct, commercial focus on bounce rates, conversion rate optimization, and lost sales.

Sender Information:
- Agency / Sender Name: ${senderName} from ${agencyName}
- Low-Friction Offer: ${customOffer}

Generate a comprehensive 4-stage cold email sequence:
1. Touch 1 (The Hook): ~90-130 words. Focus on 1-2 sharpest flaws (e.g. mobile loading delay or unstyled button). Low friction CTA asking for permission to send the video/concept.
2. Touch 2 (The Redesign Blueprint): ~110-150 words. Follow-up 3-4 days later. Describes the visual makeover and conversion layout wireframe.
3. Touch 3 (The Case Study & Commercial ROI): ~100-140 words. Follow-up 7-8 days later. Quotes tangible results from a similar client and explains how the fix pays for itself.
4. Touch 4 (The Polite Break-Up): ~60-90 words. 14 days later. Gracious departure, no guilt, leaves an open door and provides the permanent link to their audit report.

Include 2-3 compelling, short, lowercase subject lines for each email touch to support A/B testing.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
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

    const parsed = JSON.parse(response.text || '{}');

    const sequence: EmailSequence = {
      id: `seq-${Date.now()}`,
      leadId: audit.leadId,
      url: audit.url,
      companyName: audit.companyName,
      tone,
      createdAt: new Date().toISOString(),
      personalizationSummary: parsed.personalizationSummary || 'Tailored to specific mobile and performance bottlenecks.',
      customRedesignPitch: parsed.customRedesignPitch || audit.redesignSuggestion,
      touches: parsed.touches || [],
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
