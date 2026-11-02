import { CustomSmtpConfig, EmailProvider } from './types';

export interface EmailDispatchPayload {
  to: string;
  subject: string;
  body: string;
  touchStep?: number;
  leadId?: string;
  senderName?: string;
  senderEmail?: string;
  agencyName?: string;
}

export const EMAIL_PROVIDERS_META: Record<
  EmailProvider,
  {
    id: EmailProvider;
    name: string;
    shortName: string;
    description: string;
    color: string;
    textColor: string;
    borderColor: string;
    bgColor: string;
    iconSvg: string;
  }
> = {
  gmail: {
    id: 'gmail',
    name: 'Gmail',
    shortName: 'Gmail',
    description: 'Direct deep-link compose tab in Gmail web client',
    color: 'text-red-600',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    bgColor: 'bg-red-50 hover:bg-red-100/80',
    iconSvg: 'M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.272H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z',
  },
  outlook: {
    id: 'outlook',
    name: 'Outlook / Office 365',
    shortName: 'Outlook',
    description: 'Deep-link compose tab in Microsoft Outlook web',
    color: 'text-sky-600',
    textColor: 'text-sky-700',
    borderColor: 'border-sky-200',
    bgColor: 'bg-sky-50 hover:bg-sky-100/80',
    iconSvg: 'M1 4.5A2.5 2.5 0 0 1 3.5 2h17A2.5 2.5 0 0 1 23 4.5v15a2.5 2.5 0 0 1-2.5 2.5h-17A2.5 2.5 0 0 1 1 19.5v-15zm6.5 4.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm7 1h6v1.5h-6V10zm0 3.5h6V15h-6v-1.5z',
  },
  yahoo: {
    id: 'yahoo',
    name: 'Yahoo Mail',
    shortName: 'Yahoo',
    description: 'Instant compose launcher in Yahoo Mail web',
    color: 'text-purple-600',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
    bgColor: 'bg-purple-50 hover:bg-purple-100/80',
    iconSvg: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5h-2v-4.2L7.3 6h2.2l2.5 4.5L14.5 6h2.2l-3.7 6.3v4.2z',
  },
  custom_smtp: {
    id: 'custom_smtp',
    name: 'Custom SMTP Server',
    shortName: 'Custom SMTP',
    description: 'Direct sending via your dedicated SMTP server (SendGrid, Mailgun, Zoho, etc.)',
    color: 'text-emerald-600',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    bgColor: 'bg-emerald-50 hover:bg-emerald-100/80',
    iconSvg: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM20 6H4l8 5 8-5zm0 12V8.5l-8 5-8-5V18h16z',
  },
  mailto: {
    id: 'mailto',
    name: 'Default Mail App (mailto)',
    shortName: 'Mail App',
    description: 'Launches your system default mail application (Apple Mail, Thunderbird, Windows Mail)',
    color: 'text-slate-600',
    textColor: 'text-slate-700',
    borderColor: 'border-slate-200',
    bgColor: 'bg-slate-50 hover:bg-slate-100/80',
    iconSvg: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z',
  },
};

export function buildGmailUrl(payload: EmailDispatchPayload): string {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: payload.to || '',
    su: payload.subject || '',
    body: payload.body || '',
  });
  if (payload.senderEmail) {
    params.set('authuser', payload.senderEmail);
  }
  return `https://mail.google.com/mail/u/?${params.toString()}`;
}

export function buildOutlookUrl(payload: EmailDispatchPayload): string {
  const params = new URLSearchParams({
    to: payload.to || '',
    subject: payload.subject || '',
    body: payload.body || '',
  });
  return `https://outlook.live.com/mail/0/deeplink/compose?${params.toString()}`;
}

export function buildYahooUrl(payload: EmailDispatchPayload): string {
  const params = new URLSearchParams({
    to: payload.to || '',
    subject: payload.subject || '',
    body: payload.body || '',
  });
  return `https://compose.mail.yahoo.com/?${params.toString()}`;
}

export function buildMailtoUrl(payload: EmailDispatchPayload): string {
  const to = encodeURIComponent(payload.to || '');
  const subject = encodeURIComponent(payload.subject || '');
  const body = encodeURIComponent(payload.body || '');
  return `mailto:${to}?subject=${subject}&body=${body}`;
}

export function getProviderComposeUrl(
  provider: EmailProvider,
  payload: EmailDispatchPayload
): string {
  switch (provider) {
    case 'gmail':
      return buildGmailUrl(payload);
    case 'outlook':
      return buildOutlookUrl(payload);
    case 'yahoo':
      return buildYahooUrl(payload);
    case 'mailto':
    case 'custom_smtp':
    default:
      return buildMailtoUrl(payload);
  }
}

export async function sendViaCustomSmtp(
  config: CustomSmtpConfig,
  payload: EmailDispatchPayload
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const res = await fetch('/api/outreach/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        smtp: config,
        to: payload.to,
        subject: payload.subject,
        body: payload.body,
        fromEmail: config.fromEmail || config.auth.user,
        fromName: config.fromName,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to send email via SMTP server' };
    }
    return { success: true, messageId: data.messageId };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error during SMTP dispatch';
    return { success: false, error: msg };
  }
}

export function triggerDirectProviderLaunch(
  provider: EmailProvider,
  payload: EmailDispatchPayload,
  onSmtpSend?: () => void
): void {
  if (provider === 'custom_smtp' && onSmtpSend) {
    onSmtpSend();
    return;
  }

  const url = getProviderComposeUrl(provider, payload);
  if (provider === 'mailto') {
    window.location.href = url;
  } else {
    // Open web mail client in a new tab so user never loses their app state
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
