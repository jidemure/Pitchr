import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Basic in-memory sliding window rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) {
    return false;
  }
  entry.count += 1;
  return true;
}

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    if (!checkRateLimit(ip, 12, 60000)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait a minute before sending more emails.' },
        { status: 429 }
      );
    }

    const data = await req.json();
    const { smtp, to, subject, body, fromEmail, fromName, test } = data;

    if (!smtp || !smtp.host || !smtp.auth?.user || !smtp.auth?.pass) {
      return NextResponse.json(
        {
          success: false,
          error: 'Incomplete SMTP configuration. Host, username, and password are required.',
        },
        { status: 400 }
      );
    }

    const port = Number(smtp.port) || 587;
    const isSecure = smtp.secure !== undefined ? Boolean(smtp.secure) : port === 465;

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: port,
      secure: isSecure,
      auth: {
        user: smtp.auth.user,
        pass: smtp.auth.pass,
      },
      tls: {
        rejectUnauthorized: true, // Enforce strict TLS validation
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });

    // Test connection check
    if (test) {
      await transporter.verify();
      return NextResponse.json({
        success: true,
        message: `Successfully connected to SMTP server ${smtp.host}:${port}! Ready to dispatch outreach emails.`,
      });
    }

    if (!to || typeof to !== 'string' || !EMAIL_REGEX.test(to.trim())) {
      return NextResponse.json(
        { success: false, error: 'A valid recipient email address ("to") is required.' },
        { status: 400 }
      );
    }

    const sanitizedTo = to.trim();
    const sanitizedSubject = (subject || 'Website Redesign & Audit Proposal').replace(/[\r\n]/g, ' ');
    const senderDisplay = fromName ? `"${fromName.replace(/[\r\n"]/g, '')}" <${fromEmail || smtp.auth.user}>` : fromEmail || smtp.auth.user;

    const info = await transporter.sendMail({
      from: senderDisplay,
      to: sanitizedTo,
      subject: sanitizedSubject,
      text: body,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b; max-width: 600px;">
          ${(body || '')
            .split('\n\n')
            .map((p: string) => `<p style="margin-bottom: 14px;">${p.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}</p>`)
            .join('')}
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      envelope: info.envelope,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown SMTP server failure';
    console.error('SMTP send error:', errorMsg);
    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
