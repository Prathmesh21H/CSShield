# CyRO Frontend — SIH26105

Next.js 15 (App Router) + TypeScript + Tailwind CSS v4.3 frontend for the AI-Powered Continuous Cyber Risk Quantification and Investment Optimization Platform.

## What's here

This is the **frontend** as scoped in the Next.js + Supabase build prompt — pages, components, hooks, and the shared type/utility layer. The `app/api/**/route.ts` handlers referenced by the hooks below (`/api/risk/summary`, `/api/optimize`, `/api/chat`, `/api/ingest/*`, etc.) are **not included yet** — build those next following the module order in the build prompt. Every screen here is already wired to call the real endpoint and handles loading/empty/error states explicitly; nothing is hardcoded.

## Stack

- Next.js 15 (App Router), React 19, TypeScript
- Tailwind CSS v4.3 (CSS-based config via `@theme` in `app/globals.css` — no `tailwind.config.js`)
- Supabase (`@supabase/ssr` + `@supabase/supabase-js`)
- Recharts for charts, lucide-react for icons

## Design system

Defined entirely in `app/globals.css` under `@theme`. Public Sans for UI text, IBM Plex Mono for every ₹ figure and data value (`.font-figures` utility / `font-figures` class) — currency gets its own typographic identity since it's the thing this product exists to produce. Palette: cool slate ink/paper, one cobalt accent (`--color-accent`) for actions, a separate brick-red (`--color-risk`) reserved only for risk/exposure states, and a deep teal (`--color-gain`) reserved only for reduction/positive outcomes. Structural containers (`Card`) stay sharp-cornered; only pills/badges use `--radius-pill`.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in real Supabase + AI provider keys
npm run dev
```

## Folder guide

```
app/
  (auth)/            login, register — call /api/auth/*
  (dashboard)/        auth-gated shell (see layout.tsx) — dashboard, analyst drill-down,
                       optimizer, compliance, chat, admin
  api/                 build these next — see the build prompt's module order
components/
  ui/                 Button, Card, Badge, Input, Skeleton, StateMessage — shared primitives
  layout/             Sidebar, Navbar, RoleGate
  dashboard/           RiskScoreCard (the hero number), RiskTrendChart, TopContributorsTable
  optimizer/           BudgetSlider, RecommendedControlsList, RiskReductionChart
  compliance/          ComplianceMatrixTable
  chat/                ChatWindow, ChatMessage
  admin/               DataSourceRow (ingestion freshness + manual refresh)
hooks/                 useRiskSummary, useOptimizer (debounced), useChat — all real fetch calls
lib/
  supabase/            browser client, server client, service-role client, DB types
  auth/                server-side session helper
  utils/                ₹ lakh/crore currency formatting, className merge
types/                  Asset, Finding, Control, RiskScore, Compliance, Chat, User
```

## Switching the AI provider (Gemini ↔ AWS Bedrock)

Only `hooks/useChat.ts` and the future `app/api/chat/route.ts` care which provider is in use — the frontend UI (`ChatWindow`, `ChatMessage`) is provider-agnostic and just renders `{ answer, sources }`. Set the matching env vars in `.env.local` and build the route handler per whichever build prompt you're following.

## Next steps

1. Build `app/api/**/route.ts` handlers per the build prompt's module order (Supabase schema → Auth → Ingestion → Risk Engine → Optimizer → Compliance → Chat).
2. Run `npm run typecheck` once route handlers exist — several hooks currently type-check against endpoints that don't exist on disk yet, which is expected until Module 1–7 are built.
3. Replace `lib/supabase/types.ts` with `supabase gen types typescript` output once the real schema is migrated, to keep types authoritative.