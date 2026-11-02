import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pitchr - AI Website Audit & Cold Outreach Engine',
  description: 'Automate website audits for design, speed, mobile, and SEO flaws, turning diagnostic findings into high-converting cold email sequences at scale.',
  openGraph: {
    title: 'Pitchr - AI Website Audit & Cold Outreach Engine',
    description: 'Automate website audits for design, speed, mobile, and SEO flaws, turning diagnostic findings into high-converting cold email sequences at scale.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pitchr - AI Website Audit & Cold Outreach Engine',
    description: 'Automate website audits for design, speed, mobile, and SEO flaws, turning diagnostic findings into high-converting cold email sequences at scale.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#fafbfc] text-slate-900 antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
