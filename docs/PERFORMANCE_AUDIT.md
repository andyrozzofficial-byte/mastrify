# Mastrify performance audit (admin + beta)

**Scope:** Responsiveness without UI redesign.  
**Date:** 2026-05-31 (branch `cursor/mobile-marketing-typography-polish`)

## Executive summary

The app feels heavy mainly from **duplicate network work** (admin overview fetched twice, beta profile refreshed 3–5× per master run) and **unbounded Supabase reads** (full feedback/support tables on many routes). Chart SVG math and bundle size are secondary.

Enable dev timings:

```bash
# .env.local
NEXT_PUBLIC_MASTRIFY_PERF=1
```

Then watch the console for `console.time` labels on dashboard, feedback, analytics, and beta profile loads.

---

## Biggest bottlenecks

| # | Bottleneck | Where | Est. impact |
|---|------------|--------|-------------|
| 1 | **`/api/admin/overview` fetched twice** on `/admin` | `AdminShell` + `app/admin/page.tsx` | **High** — 2× full feedback+support read server-side |
| 2 | **Unbounded `fetchAdminFeedback` / `fetchAdminSupport`** | `lib/adminData.ts` | **High** — grows with every row |
| 3 | **Support ticket detail loads entire inbox** | `fetchSupportTicket` → `fetchAdminSupport()` | **Medium** — O(n) per ticket view |
| 4 | **Beta profile refetch cascade** | Gate + result + completion + feedback + panel refresh | **High** on master result path |
| 5 | **Duplicate `reportBetaMasterCompleted`** | `processing/page.tsx` + `MasterResultClient` | **Medium** — 2× POST + refreshes |
| 6 | **Feedback page renders 9 charts with list** | `app/admin/feedback/page.tsx` | **Medium** — main-thread SVG on first paint |
| 7 | **`fetchBetaUsers` on dashboard summary** | `BetaDashboardSummary` → full table scans | **Medium** on `/admin` only |
| 8 | **`BetaProfileSlideOver` always mounted** | `BetaMasteringGateProvider` | **Low–medium** — listeners + portal |
| 9 | **`MasterSessionProvider` sessionStorage writes** | Large deps → frequent `JSON.stringify` | **Medium** during mastering |
| 10 | **No list virtualization** | Admin tables/lists | **Low until 500+ rows** |

---

## Quick wins (implemented in this pass)

- [x] Share admin overview via `AdminShell` context — remove duplicate dashboard fetch
- [x] Cap feedback/support list queries (500 rows) + targeted support ticket fetch by `id`
- [x] Defer admin chart grids until visible (`AdminWhenVisible`) or idle (`requestIdleCallback` on feedback)
- [x] `React.memo` on chart card components
- [x] Skip duplicate beta master completion when `sessionStorage` already marked
- [x] Skip redundant `refreshAccess` on result mount; reduce profile refresh after completion when `panel`/`betaUi` returned
- [x] Panel refresh: skip full panel refetch when `BETA_PROFILE_PANEL_EVENT` just fired
- [x] Issue submit: avoid extra profile refresh when API returns `panel`
- [x] Dev `console.time` helpers (`lib/perfDebug.ts`)

---

## High-impact improvements (recommended next)

| Change | Impact | Effort |
|--------|--------|--------|
| Paginate `/api/admin/feedback` + support (cursor, 50/page) | High | Medium |
| Server-side summary for beta dashboard (no `fetchBetaUsers` on overview) | High | Medium |
| React Query / SWR for admin with stale-while-revalidate | High | Medium |
| Lazy-mount `BetaProfileSlideOver` only when `profilePanelOpen` | Medium | Low |
| `dynamic()` import admin feedback analytics chunk | Medium | Low |
| Single `/api/admin/me` for shell auth; overview only on dashboard | Medium | Low |
| Narrow `BetaMasteringGate` context (split UI vs access) | Medium | Medium |
| `select` only needed columns on feedback list API | Medium | Low |
| Virtualize feedback list (react-window) | Medium | High |
| Audit `MasterSessionProvider` persist deps | Medium | Medium |

---

## Area notes

### React rendering

- **AdminShell** badge context is fine; overview context added to avoid duplicate fetches.
- **BetaMasteringGate** `useMemo` includes `profilePanelOpen` → toggling profile re-renders all gate consumers (`JoinBetaNavLink`, result page).
- **Feedback list expand** runs `FeedbackSurveyDetail` validation `useEffect` per row — dev-only cost.

### API requests

- Admin list pages: one fetch per mount (OK); no deduping across navigations.
- Beta: profile + resume + panel + complete POST stack on result page.

### Charts

- SVG sparklines recalculate paths each render — memoized wrappers reduce child churn.
- Deferred mount avoids blocking first paint of KPIs/lists.

### Mobile (Safari)

- Admin drawer + `body` overflow lock: fine.
- Framer-motion on beta modals: prefer `useReducedMotion` (already used).
- Large sessionStorage writes during master flow can jank scroll on older iPhones.

### Database

- Add/verify indexes: `beta_master_feedback(created_at desc)`, `support_inbox(created_at desc)`, `beta_reported_issues(user_id)`.
- Overview should not require full table scans for KPIs — consider materialized counts later.

### Bundle

- Run `ANALYZE=true npm run build` locally to inspect admin vs marketing chunks.
- Candidate `dynamic()`: `BetaDashboardSummary`, `BetaFeedbackDashboard` (orphan), heavy admin chart grid.

---

## Profiling labels (`NEXT_PUBLIC_MASTRIFY_PERF=1`)

| Label | Location |
|-------|----------|
| `admin-shell-overview` | `AdminShell` overview fetch |
| `admin-dashboard-render` | `/admin` page data ready |
| `admin-feedback-load` | `/admin/feedback` fetch |
| `admin-analytics-load` | `/admin/analytics` fetch |
| `beta-profile-panel-load` | `BetaProfileSlideOver` panel POST |

---

## What we did not change

- No visual redesign, skeletons, or layout changes.
- No removal of features or dependencies in this pass.
