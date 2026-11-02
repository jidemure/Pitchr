import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  normalizeUrl,
  extractDomainName,
  deriveCompanyName,
  isSafePublicUrl,
  analyzePrimaryConversionBottleneck,
  createRateLimiter,
} from '../lib/auditHelpers.ts';

describe('Audit Helpers & URL Normalization', () => {
  test('normalizeUrl prepends https:// to bare domains and trims whitespace', () => {
    assert.strictEqual(normalizeUrl('apexstudio.io'), 'https://apexstudio.io');
    assert.strictEqual(normalizeUrl('  example.com  '), 'https://example.com');
    assert.strictEqual(normalizeUrl('http://insecure.org'), 'http://insecure.org');
    assert.strictEqual(normalizeUrl('https://secure.org/path'), 'https://secure.org/path');
    assert.strictEqual(normalizeUrl(''), '');
  });

  test('extractDomainName cleans www and ports from URLs', () => {
    assert.strictEqual(extractDomainName('https://www.apple.com/iphone'), 'apple.com');
    assert.strictEqual(extractDomainName('http://subdomain.apexstudio.io:8080/'), 'subdomain.apexstudio.io');
    assert.strictEqual(extractDomainName('WWW.EXAMPLE.COM'), 'example.com');
    assert.strictEqual(extractDomainName('acme-corp.com'), 'acme-corp.com');
  });

  test('deriveCompanyName extracts brand from title and falls back gracefully', () => {
    assert.strictEqual(
      deriveCompanyName('apexhvac.com', 'Apex HVAC Solutions | Heating, Air Conditioning & Repair'),
      'Apex HVAC Solutions'
    );
    assert.strictEqual(
      deriveCompanyName('millerdental.com', 'Miller Family Dental - Appointments & Pediatric Care'),
      'Miller Family Dental'
    );
    // Ignore Cloudflare / bot trap titles
    assert.strictEqual(
      deriveCompanyName('acme-tech.com', 'Just a moment... Cloudflare Verification'),
      'Acme Tech'
    );
    // Pure domain fallback
    assert.strictEqual(deriveCompanyName('vanguard-legal.com'), 'Vanguard Legal');
  });
});

describe('Security: SSRF Prevention', () => {
  test('blocks loopback and localhost addresses', () => {
    assert.strictEqual(isSafePublicUrl('http://localhost:3000').safe, false);
    assert.strictEqual(isSafePublicUrl('http://127.0.0.1:8080').safe, false);
    assert.strictEqual(isSafePublicUrl('http://0.0.0.0').safe, false);
    assert.strictEqual(isSafePublicUrl('http://[::1]').safe, false);
  });

  test('blocks cloud metadata endpoints (AWS, GCP, Azure)', () => {
    assert.strictEqual(isSafePublicUrl('http://169.254.169.254/latest/meta-data').safe, false);
    assert.strictEqual(isSafePublicUrl('http://metadata.google.internal/computeMetadata/v1').safe, false);
  });

  test('blocks private RFC1918 subnets', () => {
    assert.strictEqual(isSafePublicUrl('http://10.0.0.1/admin').safe, false);
    assert.strictEqual(isSafePublicUrl('http://192.168.1.1').safe, false);
    assert.strictEqual(isSafePublicUrl('http://172.20.0.1:9000').safe, false);
  });

  test('permits legitimate public domains and demo test domains', () => {
    assert.strictEqual(isSafePublicUrl('https://stripe.com').safe, true);
    assert.strictEqual(isSafePublicUrl('https://acme-plumbing.com').safe, true);
    assert.strictEqual(isSafePublicUrl('https://apex-hvac.sample').safe, true);
  });
});

describe('Conversion Bottleneck Analysis', () => {
  test('flags mobile as primary bottleneck when mobile score is critically low', () => {
    const analysis = analyzePrimaryConversionBottleneck({
      mobile: 32,
      speed: 65,
      design: 60,
      seo: 75,
    });
    assert.strictEqual(analysis.category, 'mobile');
    assert.ok(analysis.headline.toLowerCase().includes('mobile'));
    assert.ok(analysis.pitchHook.length > 20);
  });

  test('flags speed when load performance is worst category', () => {
    const analysis = analyzePrimaryConversionBottleneck({
      mobile: 80,
      speed: 25,
      design: 70,
      seo: 85,
    });
    assert.strictEqual(analysis.category, 'speed');
    assert.ok(analysis.headline.toLowerCase().includes('asset') || analysis.headline.toLowerCase().includes('load'));
  });
});

describe('Sliding Window Rate Limiter', () => {
  test('enforces quota and rejects requests beyond threshold', () => {
    const limiter = createRateLimiter(1000, 3); // 3 requests per 1000ms
    const ip = '198.51.100.1';

    const r1 = limiter.check(ip);
    assert.strictEqual(r1.allowed, true);
    assert.strictEqual(r1.remaining, 2);

    const r2 = limiter.check(ip);
    assert.strictEqual(r2.allowed, true);

    const r3 = limiter.check(ip);
    assert.strictEqual(r3.allowed, true);

    const r4 = limiter.check(ip);
    assert.strictEqual(r4.allowed, false);
    assert.strictEqual(r4.remaining, 0);
    assert.ok(r4.retryAfterSec && r4.retryAfterSec >= 1);
  });
});
