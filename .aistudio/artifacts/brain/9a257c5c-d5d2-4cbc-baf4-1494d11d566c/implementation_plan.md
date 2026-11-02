# Aura Design System Restyling

Restyling Pitchr with the **Aura** design specification: dark obsidian structural surfaces (`#191C21`), warm off-white content canvas (`#FAF9F9`), high-energy orange accents (`#F97316`), and refined typography.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed during clarification:
> - **Layout Posture**: Dark obsidian (`#191C21`) sidebar and header accents paired with a clean, warm off-white canvas (`#FAF9F9`) for optimal legibility and contrast.
> - **Primary Accent Transition**: Comprehensive transition from the legacy green palette to Aura's vibrant orange (`#F97316` / `#FB923C`) across all primary CTAs, active navigation items, brand emblems, and interactive focus states.

- **Confirmed Decision 1**: Apply `#191C21` dark obsidian to the fixed navigation sidebar with hairline `#2A2524` borders, light typography, and orange glow active states.
- **Confirmed Decision 2**: Content canvas background set to `#FAF9F9` with refined card radius (`rounded-2xl` / 16px) and button/control radius (`rounded-lg` / 8px).
- **Confirmed Decision 3**: Typography harmonized to Inter display headers, Geist body text, and JetBrains Mono / tabular figures for metrics, scores, and dates.

---

## 1. Overview & Core Concept

- **What It Does**: Elevates Pitchr from a generic dashboard aesthetic into a modern B2B SaaS platform inspired by Aura. Combines a dark sidebar with a warm off-white workspace canvas, striking orange accent CTAs, and refined typography.
- **Target Audience / Persona**: Growth agency founders, web development studio leads, and cold outreach specialists looking for an executive-grade platform.
- **Key Value**: Provides a high-contrast visual identity that makes audits, score breakdowns, and Kanban pipelines feel fast, authoritative, and tactile.

---

## 2. User Experience & Visual Design

### Palette Distribution (60-30-10 Rule)
- **60% Dominant Canvas**: Warm off-white (`#FAF9F9` / `bg-[#FAF9F9]`) for page backgrounds, avoiding blinding stark white while maintaining crisp contrast.
- **30% Structural Surfaces**: Dark obsidian (`#191C21` / `border-[#2A2524]`) for the sidebar, user profile card, modal headers, and contrasting stat banners; crisp white (`bg-white`) for data cards and table containers.
- **10% High-Intent Accent**: Aura Tangerine Orange (`#F97316` primary, `#FB923C` hover/accent) reserved strictly for:
  - Primary CTA buttons (`New Website Scan`, `Export CSV`, `Launch Outreach`)
  - Active navigation state in the sidebar
  - Brand mark icon badge
  - Kanban drag highlights and drop targets
  - High-urgency audit issues and active filters

### Typography & Spacing Math
- **Display**: Inter / semi-bold heading font (`font-heading font-semibold tracking-tight text-slate-900`) for top headers and section titles.
- **Body**: Geist / clean sans (`text-slate-600` / `text-slate-800`, line-height 1.6) for card descriptions and email copy.
- **Telemetry & Numerals**: JetBrains Mono (`font-mono tabular-nums`) for health scores, dates, domain URLs, and step indicators.
- **Radius Geometry**:
  - Cards & Containers: `rounded-2xl` (16px)
  - Interactive Buttons & Inputs: `rounded-lg` (8px)
  - Badges & Pills: `rounded-full` (9999px)

### Component Refinements
1. **Sidebar Navigation**:
   - Background: Dark obsidian (`bg-[#191C21] text-white border-r border-[#2A2524]`).
   - Brand Emblem: Orange gradient icon (`bg-gradient-to-br from-orange-500 to-amber-600`).
   - Active Tab: High-contrast orange pill highlight (`bg-orange-500/15 text-orange-400 font-semibold border-l-2 border-orange-500`).
   - Inactive Tabs: Subtle light slate (`text-slate-400 hover:text-white hover:bg-white/5`).
   - User Profile Card: Sleek dark surface (`bg-[#22262F] border border-[#2A2524]`) with user avatar.
2. **Dashboard Overview**:
   - Hero button: `bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-sm`.
   - KPI Stat cards: Clean white with subtle border, orange trend icons, and mono numbers.
   - Recent Scans table: Clean row hover styling with orange score badges.
3. **CRM Pipeline & Kanban Board**:
   - View Mode Switch: `[ ⊞ Kanban | ≡ Table ]` with orange active state.
   - Kanban Column Headers: Obsidian/orange accent borders (`border-t-orange-500`).
   - Drop Target: Dashed orange highlight (`border-orange-400 bg-orange-500/5`).
   - Quick "Pitch" button: Orange micro-action button (`bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200`).
4. **Email Studio & Audit Modal**:
   - Tabs and action buttons updated to Aura orange.
   - Provider launcher buttons (Gmail, Outlook, Yahoo, Custom Mail) styled with consistent rounded-lg geometry.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual-Contrast Layout (Dark Sidebar + Warm Light Canvas)**:
  - *Chosen Approach*: Dark obsidian `#191C21` sidebar paired with `#FAF9F9` warm workspace canvas.
  - *Why*: Balances executive desktop aesthetic with high-density tabular readability. Long data tables and email drafts are significantly easier to read on a light canvas than on an all-dark spreadsheet.
  - *Alternatives Considered*: Full dark mode across all tables was considered, but risks reduced readability for long-form email copy reviews.
- **Decision 2: Global Tailwind & Token Consistency**:
  - *Chosen Approach*: Update `globals.css` with the new theme background `#FAF9F9` and replace legacy `emerald-*` classes across views with `orange-*` tokens and `#191C21` surfaces.
  - *Why*: Eliminates color fragmentation across the applet and ensures every view feels cohesive.

---

## 4. Technical Architecture & System Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│                        App Root (app/page.tsx)                         │
│                    Canvas Background: bg-[#FAF9F9]                     │
├──────────────────────────┬─────────────────────────────────────────────┤
│   Sidebar (Sidebar.tsx)  │              Main Workspace Area            │
│   Surface: #191C21       │   Header & Hero CTAs (Orange #F97316)       │
│   Border: #2A2524        ├─────────────────────────────────────────────┤
│   Active: Orange #F97316 │   Active View Container:                    │
│   Avatar: Tariq Lanez    │   - DashboardView.tsx                       │
│                          │   - LeadsPipelineView.tsx (Table / Kanban)  │
│                          │   - KanbanBoardView.tsx                     │
│                          │   - EmailStudioView.tsx                     │
│                          │   - PerformanceView.tsx                     │
└──────────────────────────┴─────────────────────────────────────────────┘
```

### Component Update Scope:
- `app/globals.css`: Set canvas background token to `#FAF9F9` and text to `#111827`.
- `components/Sidebar.tsx`: Transform to dark obsidian `#191C21`, `#2A2524` borders, orange active tabs, and refined profile card.
- `components/DashboardView.tsx`: Replace emerald CTAs and highlights with `#F97316` orange.
- `components/LeadsPipelineView.tsx`: Restyle filters, view toggle, and search inputs with orange accents.
- `components/KanbanBoardView.tsx`: Update drop indicators, pitch buttons, and column accents to Aura palette.
- `components/EmailStudioView.tsx`: Restyle sequence tabs, dispatch buttons, and tone selectors.
- `components/AuditInput.tsx`: Update landing hero input and scan button with Aura orange.
- `components/AuditModal.tsx`: Harmonize modal headers and CTA buttons.
