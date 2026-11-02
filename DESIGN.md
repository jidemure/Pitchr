---
name: Pitchr
description: Aura design system for AI website audit and cold outreach automation
colors:
  primary: "#f97316"
  primary-hover: "#ea580c"
  primary-light: "#fff7ed"
  neutral-bg: "#faf9f9"
  surface-card: "#ffffff"
  surface-obsidian: "#191c21"
  surface-border: "#e2e8f0"
  text-primary: "#0f172a"
  text-secondary: "#64748b"
  text-muted: "#94a3b8"
  score-critical: "#e11d48"
  score-warning: "#d97706"
  score-success: "#16a34a"
typography:
  heading:
    fontFamily: "Inter, Plus Jakarta Sans, system-ui, sans-serif"
    fontWeight: 500
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Geist, DM Sans, system-ui, sans-serif"
    fontWeight: 400
    lineHeight: 1.5
  mono:
    fontFamily: "JetBrains Mono, monospace"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
---

# Design System

<!-- impeccable:design-schema 1 -->

## Overview

Pitchr's Aura design language balances executive restraint with tactical clarity. Built for boutique agency founders, the interface avoids toy-like AI tropes (purple gradients, bouncy elastic curves, neon halos) in favor of deep obsidian structural surfaces, crisp warm neutrals, and purposeful tangerine orange accents.

## Colors

- **Primary Accent (`#F97316`)**: Tangerine Orange. Reserved strictly for conversion actions (Scan, Send Pitch, Save to Pipeline).
- **Workspace Ground (`#FAF9F9`)**: Clean, warm neutral canvas preventing eye fatigue during extended prospecting sessions.
- **Structural Obsidian (`#191C21`)**: Deep high-contrast container ground used for the primary navigation sidebar and active focus cards.
- **Card Ground (`#FFFFFF`)**: Pure white with subtle 1px border (`#E2E8F0`) for lead cards, diagnostic modals, and data tables.
- **Semantic Statuses**:
  - `Critical / Urgent`: Rose (`#E11D48` / `#FFF1F2`)
  - `Warning / Needs Polish`: Amber (`#D97706` / `#FFFBEB`)
  - `Healthy / Converted`: Emerald (`#16A34A` / `#F0FDF4`)

## Typography

- **Heading**: `Inter` and `Plus Jakarta Sans` with optical letter spacing (`-0.025em`) and refined `font-medium` weights rather than harsh bold weights.
- **Body**: `Geist` and `DM Sans` tuned for reading speed and data clarity.
- **Data & Measurement**: `JetBrains Mono` with mandatory `tabular-nums` on scores, times, metrics, and dates.

## Layout

- **Spacing Rhythm**: 8px baseline grid with strict groupings (4px intra-element, 16px intra-card, 24px-32px section separation).
- **Measure**: Body prose constrained to `65–75ch` maximum measure to maintain comfortable eye movement.
- **Responsive Fluidity**:
  - Desktop: Multi-column Kanban board and comprehensive data spreadsheet.
  - Mobile: Touch-optimized stacked cards with direct tap actions, swipe-friendly horizontal status tabs, and thumb-accessible bottom action bars.

## Elevation & Depth

- Elevation is communicated via subtle 1px border contrast (`border-slate-200/90`) paired with soft, low-intensity offset drop shadows (`shadow-2xs` / `shadow-sm`).
- No zero-blur hard block shadows or colored glow halos.
- Modal backdrops use calm slate darkening (`bg-slate-900/60`) with `backdrop-blur-sm`.

## Shapes

- Small utility badges and tags: `rounded-md` (6px) or `rounded-full` (pills).
- Cards and containers: `rounded-xl` (12px) to `rounded-2xl` (16px).
- Modals: `rounded-2xl` to `rounded-3xl` (24px) for organic containment.
- No thick accent top borders on rounded containers; status is indicated through refined 8px circular status pips or badge chips.

## Components

- **Audit Input**: Large, focused URL intake bar with clear loading spinner and tactile `active:scale-[0.98]` feedback.
- **Kanban Board**: Drag-and-drop columns with column-dragover styling and tap-based stage transfer for mobile devices.
- **Email Studio**: 4-touch sequential timeline selector with 1-click email client dispatchers (Gmail, Outlook, Yahoo, SMTP).
- **Diagnostic Teaser Modal**: Client-facing preview showing real-world prospect perspective with instant copy link.

## Do's and Don'ts

### Do's
- Use `tabular-nums` on all health scores, percentages, and timestamps.
- Ensure every modal supports keyboard `Escape` to close, has `role="dialog"`, and `aria-modal="true"`.
- Provide immediate tactile feedback on buttons (`active:scale-[0.98]`).
- Respect `prefers-reduced-motion` across all transitions and animations.

### Don'ts
- Do not use purple/violet gradients or neon AI tropes.
- Do not use bouncy or elastic animation curves.
- Do not place kicker/eyebrow labels above primary headings.
- Do not use arbitrary section numbers (01/02/03) on feature cards.
