# Swokei Engine: AI Website Audit & Cold Email Pipeline

An end-to-end client acquisition engine for web design and development agencies. It audits outdated prospect websites for design flaws, SEO weaknesses, mobile issues, and speed bottlenecks, transforming those diagnostic insights into hyper-personalized, multi-stage cold email sequences that convert.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following product specifications were confirmed during our initial requirements review:
> - **Audit Strategy**: Live server-side HTML scraping combined with Gemini 3.8 Flash analysis to diagnose visual hierarchy, outdated UI patterns, mobile responsiveness, and SEO tags.
> - **Outreach Strategy**: Multi-stage cold email sequences (Value-first teaser, detailed critique + redesign suggestion, polite follow-up, and break-up email) with customized subject lines and objection handling.
> - **Database Strategy**: Hybrid persistence. Provides immediate browser-local persistence (zero-setup offline sandbox) alongside an integrated Supabase connector modal where users can connect their Supabase URL and anon key to sync leads and campaigns into real cloud tables.

---

### 1. Overview & Core Concept

- **What It Does**: Automates the painful manual research agencies perform when hunting for redesign clients. Users enter prospect URLs (single audit or bulk list), the engine evaluates performance indicators, visual age, meta tags, and mobile readiness, and instantly generates custom redesign pitch angles and copy-ready cold email sequences.
- **Target Audience / Persona**: Web design agencies, freelance UI/UX developers, digital marketing firms, and conversion rate optimization (CRO) consultants.
- **Key Value**: Replaces generic, low-converting mass cold email blasts with tailored, flaw-specific pitches that cite tangible issues (e.g., non-responsive navigation, missing OpenGraph cards, outdated font stacks, uncompressed hero banners) and propose concrete fixes.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Audit Launchpad**:
   - Agency user pastes a prospect's domain (e.g. `example-plumbing.com`) or loads sample prospect websites with varying degrees of design rot (outdated 2012 layout, broken mobile viewport, slow uncompressed assets, missing SEO).
   - Live scanning indicator steps through stages: Fetching DOM $\rightarrow$ Parsing SEO & Meta tags $\rightarrow$ Evaluating UX/Aesthetics with Gemini $\rightarrow$ Synthesizing Audit Scorecard.
2. **Interactive Audit Scorecard**:
   - Comprehensive diagnostic breakdown across 4 key dimensions:
     - **Design & UX Freshness**: Visual age, typography scale, modern contrast, layout balance.
     - **Mobile Optimization**: Viewport tags, tap target density, responsive structure.
     - **Performance & Speed**: Asset weight indicators, scripts, resource bottlenecks.
     - **SEO & Discoverability**: Title, description, OpenGraph tags, schema markup, header hierarchy.
   - Live "Client Teaser Preview": A shareable audit card view that can be linked or embedded in outbound emails.
3. **Multi-Stage Cold Email Studio**:
   - Generates a customized 4-touch outreach campaign:
     - *Touch 1 (The Hook)*: Value-led observation highlighting 1 major flaw and a low-friction offer.
     - *Touch 2 (The Redesign Teaser)*: Actionable mockup pitch detailing specific UX improvements and expected conversion gains.
     - *Touch 3 (The Case Study / Follow-Up)*: Social proof, ROI framing, and low-pressure demo question.
     - *Touch 4 (The Respectful Break-Up)*: Leaves the door open with goodwill and links to the full web audit.
   - Tone & Angle switcher: "Casual Freelancer", "Boutique Design Agency", "Direct ROI / Performance Focused".
   - One-click copy, quick-edit markdown, and mailto/export to CSV format.
4. **Lead CRM & Outreach Pipeline**:
   - Filter and search leads by audit score, status (`Audited`, `Drafted`, `Contacted`, `Replied`, `Won`), or date.
   - Bulk actions: batch re-audit, batch export, mark contacted.
5. **Supabase Connector & Settings**:
   - Intuitive settings panel to input Supabase Project URL + Anon API Key.
   - "Test Connection" button with automated schema verification and table creation guide (`leads`, `audits`, `email_campaigns`).
   - Seamless sync toggle between Local Storage and Supabase Cloud.

#### Visual Identity & Theme
- **Aesthetic Direction**: High-trust, sleek B2B SaaS console inspired by the Neuform CreatorStudio design system and modern developer tools (Vercel, Linear, Raycast).
- **Color Palette**:
  - Dominant Canvas: Crisp neutral white (`#FFFFFF`) with cool slate accents (`#0F172A`).
  - Structural Surfaces: Soft emerald-tinted surface tones (`#F0F5F2` / `#F8FAFC`), crisp hairline dividers (`#E2E8F0`).
  - Primary Accent: Precision Emerald (`#10B981` / `#059669`) for primary calls to action, badges, and high-conversion states.
  - Semantic Status: Rose (`#EF4444`) for critical audit alerts, Amber (`#F59E0B`) for warnings, Emerald (`#10B981`) for passing criteria.
- **Typography**:
  - Display & Headings: `Plus Jakarta Sans` for clean, contemporary authority.
  - Body Copy: `DM Sans` for crisp legibility across dense data tables and long email previews.
  - Tabular & Metrics: `JetBrains Mono` with `tabular-nums` for scores, timestamps, and technical audit tags.
- **Micro-Interactions**:
  - Smooth stage transitions with `motion/react`.
  - Copy button feedback with confirmation toast.
  - Tabbed email touchpoint navigation with animated active slider.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Server-Side Web Fetching & Gemini Multi-Modal Analysis**
  - *Chosen Approach*: Next.js API route (`/api/audit/scan`) that securely fetches the target website's HTML/DOM on the server, parses structured technical metadata (title, meta tags, scripts, stylesheets, viewport), and passes technical signals + DOM extracts to Gemini 3.8 Flash (`@google/genai`) for nuanced UX and aesthetic critique.
  - *Why*: Direct client-side `fetch` from the browser is blocked by CORS. Server-side scraping with fallback handling provides reliable DOM extraction, while Gemini performs genuine human-grade design analysis rather than superficial regexes.
- **Decision 2: Hybrid Supabase & Local Database Architecture**
  - *Chosen Approach*: Local storage as the instant, zero-friction default for immediate demonstration and testing, backed by an integrated Supabase client (`@supabase/supabase-js`) that activates whenever user credentials are provided in settings.
  - *Why*: Allows anyone to immediately test and use the app out of the box without requiring manual cloud database credentials, while giving real agencies seamless cloud sync to their own Supabase PostgreSQL tables.
- **Decision 3: Multi-Touch Sequence Generation with Structured JSON Output**
  - *Chosen Approach*: Utilizing `@google/genai` with `responseMimeType: "application/json"` and `responseSchema` to guarantee consistent, structured 4-stage cold emails with subject variations and personalization anchors.
  - *Why*: Prevents parsing bugs or broken markdown templates, giving the user clean fields for subject lines, body paragraphs, and call-to-actions ready for immediate copy or CRM export.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                             CLIENT UI                                  │
│  ┌─────────────────────────┐  ┌──────────────────────────────────────┐ │
│  │ Single & Bulk URL Input │  │ Scorecard & Visual Redesign Mockup   │ │
│  └────────────┬────────────┘  └──────────────────┬───────────────────┘ │
│               │                                  │                     │
│  ┌────────────▼────────────┐  ┌──────────────────▼───────────────────┐ │
│  │ Lead CRM & Pipeline Tab │  │ Cold Email Studio (4-Touch Sequence) │ │
│  └────────────┬────────────┘  └──────────────────┬───────────────────┘ │
└───────────────┼──────────────────────────────────┼─────────────────────┘
                │                                  │
                ▼                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS SERVER API                              │
│  ┌──────────────────────────────┐  ┌─────────────────────────────────┐ │
│  │  POST /api/audit/scan        │  │  POST /api/outreach/generate    │ │
│  │  - Safe DOM fetcher & parser │  │  - Gemini 3.8 Flash             │ │
│  │  - Speed & SEO analyzer      │  │  - Structured JSON response     │ │
│  │  - Gemini design critique    │  │  - Multi-stage sequences        │ │
│  └──────────────┬───────────────┘  └─────────────────┬───────────────┘ │
└─────────────────┼────────────────────────────────────┼─────────────────┘
                  │                                    │
                  ▼                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       DATA PERSISTENCE LAYER                           │
│  ┌──────────────────────────────┐  ┌─────────────────────────────────┐ │
│  │ Browser Local Storage Cache  │  │ Supabase Client (@supabase/js)  │ │
│  │ (Zero-setup instant CRM)     │  │ (Cloud PostgreSQL Sync)         │ │
│  └──────────────────────────────┘  └─────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

#### Core Data Entities
- **Lead / Prospect**:
  - `id`: string (uuid)
  - `url`: string
  - `companyName`: string
  - `industry`: string
  - `status`: `'audited' | 'drafted' | 'contacted' | 'replied' | 'converted'`
  - `overallScore`: number (0-100)
  - `createdAt`: ISO timestamp
- **Audit Result**:
  - `id`: string
  - `leadId`: string
  - `scores`: `{ design: number, speed: number, mobile: number, seo: number }`
  - `detectedIssues`: `Array<{ category: string, severity: 'critical' | 'warning' | 'info', title: string, description: string, recommendation: string }>`
  - `techStackDetected`: `string[]`
  - `visualFlaws`: `string[]`
- **Email Sequence**:
  - `id`: string
  - `leadId`: string
  - `touches`: `Array<{ step: number, name: string, subjectLines: string[], body: string, hook: string, cta: string }>`
  - `personalizationSnippets`: `string[]`

---
