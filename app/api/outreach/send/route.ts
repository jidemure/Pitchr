import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
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
        rejectUnauthorized: false, // Prevents self-signed cert blocks on custom servers
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

    if (!to) {
      return NextResponse.json(
        { success: false, error: 'Recipient email address ("to") is required.' },
        { status: 400 }
      );
    }

    const senderDisplay = fromName ? `"${fromName}" <${fromEmail || smtp.auth.user}>` : fromEmail || smtp.auth.user;

    const info = await transporter.sendMail({
      from: senderDisplay,
      to: to,
      subject: subject || 'Website Redesign & Audit Proposal',
      text: body,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b; max-width: 600px;">
          ${(body || '')
            .split('\n\n')
            .map((p: string) => `<p style="margin-bottom: 14px;">${p.replace(/\n/g, '<br/>')}</p>`)
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
