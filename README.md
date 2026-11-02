# Pitchr - AI Website Audit & Cold Outreach Engine

> Turn dated local business websites into booked discovery calls and signed redesign deals.

Pitchr is a full-featured B2B sales automation engine for design studios, digital agencies, and freelance web developers. It audits target websites in real-time, diagnoses conversion bottlenecks with Google Gemini, drafts high-converting 4-touch outreach sequences, and tracks leads through an interactive Kanban pipeline.

---

## ⚡ Key Features

- **Live Site Diagnostic Scanner**: Fetches live website markup, inspects mobile viewport meta tags, page weight, image optimization, heading hierarchy, and legacy code (jQuery 1.x, Bootstrap 3, obsolete Flash embeds).
- **AI Conversion Bottleneck Detection**: Powered by Google Gemini (`gemini-2.5-flash` / `gemini-3.1-flash-lite`), synthesizing 4 categorized health scores (Design, Speed, Mobile, SEO) and concrete recommendations.
- **4-Touch Personalized Cold Outreach**: Generates a sequential campaign tailored to the prospect's industry and critical site flaws:
  - **Touch 1**: Initial Hook & Specific Flaw Evidence
  - **Touch 2**: Redesign Wireframe Blueprint
  - **Touch 3**: Case Study ROI & Conversion Uplift
  - **Touch 4**: Polite Breakup & Direct Calendar Link
- **1-Click Multi-Provider Dispatch**:
  - Direct web-mail launch for **Gmail**, **Outlook**, and **Yahoo Mail**.
  - Direct **Authenticated SMTP** delivery with TLS encryption and server-side rate limiting.
- **Visual Kanban Pipeline & CRM**: Drag-and-drop and touch-friendly cards tracking prospects through stages: `Audited` → `Draft Ready` → `Contacted` → `Replied` → `Converted`.
- **Public Client Teaser Pages**: Generate sleek, client-facing audit teaser links (`/audit/[id]`) with live health scores and interactive redesign previews to link in cold emails.
- **Hardened Security**: Server-side API key containment, SSRF prevention blocking private subnets/metadata endpoints, input validation, and IP sliding window rate limiting.
- **Optional Supabase Cloud Sync**: Synchronize leads, audit scorecards, and email sequences across devices with instant SQL schema scaffolding.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **UI & Runtime**: [React 19](https://react.dev/), [TypeScript 5.9](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with Aura design tokens (Obsidian `#191C21`, Tangerine Orange `#F97316`)
- **AI Intelligence**: [Google GenAI SDK](https://www.npmjs.com/package/@google/genai) (`@google/genai`)
- **Email Delivery**: [Nodemailer](https://nodemailer.com/) with strict TLS verification
- **Testing**: Node 24 native test runner (`node:test`) with zero runtime overhead

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- Node.js `20.x` or `24.x`
- A Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

### 1. Clone the repository
```bash
git clone https://github.com/jidemure/Pitchr.git
cd Pitchr
```

### 2. Install dependencies
```bash
npm install
# or
pnpm install
```

### 3. Configure environment variables
Copy the example environment template:
```bash
cp .env.example .env.local
```

Open `.env.local` and insert your Gemini API key:
```env
GEMINI_API_KEY="AIzaSyYourActualKeyHere..."
```

*(Optional) Configure custom SMTP if you plan to send cold emails directly from the server:*
```env
SMTP_HOST="smtp.yourdomain.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="alex@yourdomain.com"
SMTP_PASS="your-app-password"
SMTP_FROM="Alex Rivers <alex@yourdomain.com>"
```

### 4. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing

Pitchr includes a comprehensive test suite verifying URL normalization, SSRF prevention, bottleneck prioritization, sliding-window rate limiters, and end-to-end user workflows:

```bash
npm test
```

---

## 📜 Available Scripts

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `next dev` | Starts local Next.js development server on port 3000 |
| `npm run build` | `next build` | Creates optimized production build with static generation |
| `npm run start` | `next start` | Runs the production build locally |
| `npm test` | `node --test tests/*.test.ts` | Runs the automated test suite |
| `npm run lint` | `eslint .` | Runs ESLint code quality checks |

---

## 🌐 Production Deployment

### Recommended: Vercel (Zero Configuration)

1. Push your repository to GitHub.
2. Visit [Vercel](https://vercel.com/) and click **Add New Project**.
3. Import your `Pitchr` repository. Next.js 15 settings are auto-detected.
4. Under **Environment Variables**, add:
   - `GEMINI_API_KEY`: Your Gemini API key.
   - *(Optional)* `SMTP_*` variables if using server-side outbound email.
5. Click **Deploy**. Your application will be live with automatic global SSL in under 2 minutes.

### Alternative: Google Cloud Run (Docker Container)

Create a `Dockerfile`:
```dockerfile
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

Build and deploy to Cloud Run:
```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/pitchr
gcloud run deploy pitchr --image gcr.io/PROJECT_ID/pitchr --platform managed --allow-unauthenticated
```

---

## 📋 Launch Checklist

- [x] Gemini API calls secured behind server-side API routes (`/api/audit/scan` & `/api/outreach/generate`).
- [x] SSRF guard enabled blocking private IP ranges (10.x, 192.168.x, 172.16.x) and cloud metadata services.
- [x] Sliding-window rate limiters active on all public POST endpoints.
- [x] PII sanitized; no real developer credentials or email accounts hardcoded.
- [x] WCAG AA accessibility attributes and keyboard Escape handlers wired to all modals.
- [x] Public read-only teaser route (`/audit/[id]`) fully operational.
- [x] Automated test suite passing with 100% success rate.
- [ ] Add production domain to Google AI Studio API key restrictions (HTTP Referrers).

---

## 🔮 Recommended Next Features

1. **Google Lighthouse Integration**: Combine Gemini's visual design critique with official PageSpeed Insights JSON scores.
2. **Automated Follow-up Webhooks**: Integration with Zapier / Make to trigger SMS alerts or CRM syncing when a prospect clicks their teaser link.
3. **Multi-User Agency Workspaces**: Role-based access control (Admin, Closer, SDR) with team email signature templates.
