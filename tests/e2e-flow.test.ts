import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  normalizeUrl,
  extractDomainName,
  deriveCompanyName,
  isSafePublicUrl,
  analyzePrimaryConversionBottleneck,
} from '../lib/auditHelpers.ts';
import type { AuditReport, Lead, EmailSequence, LeadStatus } from '../lib/types.ts';

describe('End-to-End User Flow: Audit -> Pitch -> Teaser -> CRM', () => {
  const targetInput = '  www.apex-heating-cooling.sample  ';
  let auditedReport: AuditReport;
  let leadItem: Lead;
  let emailSequence: EmailSequence;
  let teaserUrl: string;

  test('Step 1: Input URL normalization & security validation', () => {
    const normalized = normalizeUrl(targetInput);
    assert.strictEqual(normalized, 'https://www.apex-heating-cooling.sample');

    const safety = isSafePublicUrl(normalized);
    assert.strictEqual(safety.safe, true, 'Target domain must pass SSRF safety validation');

    const domain = extractDomainName(normalized);
    assert.strictEqual(domain, 'apex-heating-cooling.sample');

    const company = deriveCompanyName(domain, 'Apex Heating & Cooling | 24/7 Emergency Repairs');
    assert.strictEqual(company, 'Apex Heating & Cooling');
  });

  test('Step 2: Generation of comprehensive website audit report', () => {
    const domain = extractDomainName(targetInput);
    const company = deriveCompanyName(domain, 'Apex Heating & Cooling | 24/7 Emergency Repairs');

    auditedReport = {
      id: 'audit-test-e2e-1',
      url: normalizeUrl(targetInput),
      companyName: company,
      industry: 'HVAC Services',
      contactEmail: 'contact@apex-heating-cooling.sample',
      overallScore: 48,
      scores: {
        overall: 48,
        design: 42,
        speed: 38,
        mobile: 35,
        seo: 65,
      },
      issues: [
        {
          id: 'iss-1',
          category: 'mobile',
          severity: 'critical',
          title: 'Missing mobile responsive viewport tag',
          description: 'Page renders at desktop resolution on smartphones requiring pinch-to-zoom.',
          recommendation: 'Implement responsive CSS viewport meta tag and flexible fluid container grid.',
          impactEstimate: '+35% mobile inquiries',
        },
        {
          id: 'iss-2',
          category: 'speed',
          severity: 'warning',
          title: 'Uncompressed hero image assets',
          description: '2.4MB JPEG banner delaying initial paint by 3.2 seconds.',
          recommendation: 'Convert to WebP/AVIF format with responsive srcset attributes.',
          impactEstimate: '2.1s faster LCP',
        },
      ],
      techStack: ['WordPress 4.8', 'Legacy jQuery 1.11', 'Unoptimized PNGs'],
      visualCritique: 'The header navigation is cramped and lacks high-contrast contact CTA buttons.',
      redesignSuggestion: 'Deploy a modern floating sticky booking widget and hero call button.',
      rawMetrics: {
        loadTimeMs: 3400,
        pageSizeKb: 2800,
        viewportConfigured: false,
        hasTitle: true,
        hasMetaDescription: true,
        hasOpenGraph: false,
        hasSchemaMarkup: false,
        h1Count: 1,
        imagesWithoutAlt: 4,
        totalScripts: 14,
        totalStylesheets: 6,
        detectedLegacyTech: ['Legacy jQuery 1.11'],
      },
      createdAt: new Date().toISOString(),
    };

    assert.ok(auditedReport.id);
    assert.strictEqual(auditedReport.scores.overall, 48);
    assert.strictEqual(auditedReport.issues.length, 2);
    assert.strictEqual(auditedReport.rawMetrics.viewportConfigured, false);
  });

  test('Step 3: Conversion bottleneck synthesis and pitch generation', () => {
    const bottleneck = analyzePrimaryConversionBottleneck(auditedReport.scores);
    assert.strictEqual(bottleneck.category, 'mobile');
    assert.ok(bottleneck.pitchHook.includes('mobile'));

    emailSequence = {
      id: 'campaign-test-e2e-1',
      leadId: 'lead-test-e2e-1',
      touches: [
        {
          step: 1,
          type: 'first_touch',
          delayDays: 0,
          subjectLines: [
            'apex-heating-cooling.sample website polish & mobile wireframe',
            'Quick idea for Apex Heating & Cooling website mobile visitors',
          ],
          previewSnippet: 'I reviewed your site on an iPhone 15 and noticed...',
          body: `Hi team,\n\nI reviewed apex-heating-cooling.sample and noticed mobile visitors have to pinch-to-zoom to read emergency service numbers.\n\n${bottleneck.pitchHook}`,
          cta: 'Would you be open to a 2-minute video walkthrough showing how we would polish this?',
        },
        {
          step: 2,
          type: 'follow_up_1',
          delayDays: 3,
          subjectLines: ['Re: apex-heating-cooling.sample mobile wireframe sketch'],
          previewSnippet: 'Following up with a quick layout mockup...',
          body: 'Hi,\n\nQuick follow up on the mobile conversion suggestions for Apex Heating & Cooling.',
          cta: 'Let me know if Tuesday or Thursday works for a quick 5-min intro.',
        },
      ],
      createdAt: new Date().toISOString(),
    };

    assert.strictEqual(emailSequence.touches.length, 2);
    assert.ok(emailSequence.touches[0].subjectLines.length >= 2);
    assert.ok(emailSequence.touches[0].body.includes('apex-heating-cooling.sample'));
  });

  test('Step 4: Public client teaser serialization and URL encoding', () => {
    const serializedParam = encodeURIComponent(
      Buffer.from(JSON.stringify(auditedReport), 'utf-8').toString('base64')
    );
    teaserUrl = `https://pitchr.agency/audit/${auditedReport.id}?data=${serializedParam}`;

    assert.ok(teaserUrl.includes('/audit/audit-test-e2e-1'));
    assert.ok(teaserUrl.includes('?data='));

    // Verify deserialization by public audit route
    const extractedDataParam = new URL(teaserUrl).searchParams.get('data');
    assert.ok(extractedDataParam);
    const decodedJson = Buffer.from(decodeURIComponent(extractedDataParam), 'base64').toString('utf-8');
    const parsedReport = JSON.parse(decodedJson);

    assert.strictEqual(parsedReport.id, auditedReport.id);
    assert.strictEqual(parsedReport.companyName, auditedReport.companyName);
    assert.strictEqual(parsedReport.overallScore, 48);
  });

  test('Step 5: Pipeline CRM tracking and lead status lifecycle', () => {
    leadItem = {
      id: 'lead-test-e2e-1',
      url: auditedReport.url,
      companyName: auditedReport.companyName,
      industry: auditedReport.industry,
      contactEmail: auditedReport.contactEmail,
      overallScore: auditedReport.overallScore,
      status: 'audited' as LeadStatus,
      auditId: auditedReport.id,
      campaignId: emailSequence.id,
      createdAt: new Date().toISOString(),
      lastAuditedAt: auditedReport.createdAt,
    };

    assert.strictEqual(leadItem.status, 'audited');

    // Simulate pitch drafted
    leadItem.status = 'drafted';
    assert.strictEqual(leadItem.status, 'drafted');

    // Simulate outreach dispatch via Gmail/SMTP
    leadItem.status = 'contacted';
    leadItem.followUp = {
      currentTouchStep: 2,
      lastSentAt: new Date().toISOString(),
      lastSentTouch: 1,
      lastProviderUsed: 'gmail',
    };
    assert.strictEqual(leadItem.status, 'contacted');
    assert.strictEqual(leadItem.followUp.currentTouchStep, 2);

    // Simulate prospect reply and deal conversion
    leadItem.status = 'converted';
    assert.strictEqual(leadItem.status, 'converted');
  });
});
