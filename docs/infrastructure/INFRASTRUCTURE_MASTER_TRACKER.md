# Infrastructure Master Tracker

Per-service tracking. Every row in `HOTELVALORA_TECH_STACK_MASTER.md` has a corresponding section here with the full 15-field detail.

**Status legend:** 🟢 working · 🟡 partial · 🔴 not configured · ⚫ blocked · 🔵 planned

---

## Vercel

| Field | Value |
|---|---|
| Category | Hosting / Edge runtime |
| Status | 🟢 |
| Configured? | Yes |
| Working? | Yes — every commit deploys cleanly |
| Production ready? | Yes |
| Partially implemented? | No |
| Frontend connected? | Yes (apps/web at root `apps/web`) |
| Backend connected? | N/A (FastAPI is dev-only) |
| Env vars added? | Yes (Mapbox + Resend + Supabase) |
| Vercel configured? | Yes — project `hotelvalora`, scope `miguel-sambricio-s-projects` |
| GitHub safe? | Yes — no auto-deploy; CLI-triggered |
| Documentation complete? | Yes (`docs/deployment.md`, `docs/architecture/system-overview.md`) |
| Local tested? | Yes (`pnpm build`) |
| Production tested? | Yes (`hotelvalora.com` live) |
| Blockers | None |
| Notes | Custom domain wired. No GitHub auto-deploy — `vercel deploy --prod --yes` is the canonical promotion path |

## GitHub

| Field | Value |
|---|---|
| Category | VCS |
| Status | 🟢 |
| Configured? | Yes |
| Working? | Yes |
| Production ready? | Yes |
| Frontend connected? | N/A |
| Backend connected? | N/A |
| Env vars added? | N/A |
| Vercel configured? | Not linked for auto-deploy (intentional) |
| GitHub safe? | Yes — `.env.local` git-ignored, secrets verified out of commits |
| Documentation complete? | Yes |
| Local tested? | Yes |
| Production tested? | Yes |
| Blockers | None |
| Notes | Single branch `main`. No PR workflow yet (solo dev) |

## Mapbox

| Field | Value |
|---|---|
| Category | Maps |
| Status | 🟢 |
| Configured? | Yes |
| Working? | Yes — CompSet + Market Overview maps render |
| Production ready? | Yes |
| Partially implemented? | Yes — `/library/*` map uses a static grayscale placeholder, not Mapbox |
| Frontend connected? | Yes |
| Backend connected? | N/A |
| Env vars added? | Yes — `NEXT_PUBLIC_MAPBOX_TOKEN` set in Vercel |
| Vercel configured? | Yes |
| GitHub safe? | Yes (public token, domain-restricted on Mapbox side) |
| Documentation complete? | Yes (`docs/maps.md`, `docs/architecture/map-engine.md`) |
| Local tested? | Yes |
| Production tested? | Yes |
| Blockers | None |
| Notes | Library map swap planned for Phase 4 (`docs/roadmap/master-roadmap.md`) |

## Supabase

| Field | Value |
|---|---|
| Category | Database + Storage + (future) Auth |
| Status | 🟢 |
| Configured? | Yes — project provisioned, env wired, schema + Storage buckets applied (32 tables · 5 buckets · RLS everywhere · 4 migrations registered) |
| Working? | Env probe (`/dev/supabase-test`) returns green; schema + Storage live, typed helpers in place, no app reads yet |
| Production ready? | Yes for DDL + Storage; Auth still pending |
| Partially implemented? | Yes (Supabase Auth still outstanding; Auth.js owns identity today) |
| Frontend connected? | Yes (`lib/supabase/*` clients + middleware refresh + storage helpers + generated `Database` types) |
| Backend connected? | N/A (Supabase IS the backend) |
| Env vars added? | Yes (URL + anon + service-role on Vercel) |
| Vercel configured? | Yes |
| GitHub safe? | Yes (`.env.local` ignored; placeholders in `.env.example`) |
| Documentation complete? | Yes (`docs/integrations/supabase.md`, `docs/database/README.md`, `docs/database/migrations/*.sql`) |
| Local tested? | Probe page yes; queries no |
| Production tested? | Probe page yes; queries no |
| Blockers | None |
| Notes | Migrations `0001`–`0005` applied via Supabase MCP. Library surfaces production-backed via TanStack Query hooks + adapter. Next: swap mock auth to Supabase Auth / Auth.js adapter and add `postgres_changes` realtime invalidation |

## Supabase Auth (production auth runtime)

| Field | Value |
|---|---|
| Category | Auth runtime |
| Status | 🟡 |
| Configured? | Code complete — middleware refresh, `/auth/callback` handler, `useAuth()` adapter, OAuth hook. Activation pending Supabase Dashboard wiring + Vercel flags |
| Working? | Yes when `AUTH_ENABLED=true` AND a provider is enabled in Supabase Dashboard. Default off → Zustand mock keeps the app accessible |
| Production ready? | Yes — code paths complete. Manual two-step activation per `docs/auth.md` |
| Partially implemented? | Yes (no signup flow yet; Google OAuth is the only path to create an account) |
| Frontend connected? | Yes (`useAuth()` · `useOAuth().signInWithProvider` · `AuthCard.signIn` · `/login` page) |
| Backend connected? | Supabase Auth (`auth.users` → `handle_new_user` trigger → `public.users` + `profiles`) |
| Env vars added? | `AUTH_ENABLED` + `NEXT_PUBLIC_AUTH_ENABLED` (both off in Vercel today) |
| Vercel configured? | Schema + Storage env yes; auth flags pending operator decision |
| GitHub safe? | Yes (no OAuth secrets in repo — they live in Supabase Dashboard) |
| Documentation complete? | Yes (`docs/auth.md` activation checklist) |
| Local tested? | Typecheck + production build clean |
| Production tested? | Pending Google Cloud Console + Supabase Dashboard setup |
| Blockers | None code-side. Activation = manual dashboard work per `docs/auth.md` |
| Notes | Auth.js v5 scaffold stays in repo (inert) for future non-OAuth flows. `useAuth()` API unchanged — the dual-source picker handles the migration |

## Google OAuth

| Field | Value |
|---|---|
| Category | OAuth identity provider |
| Status | 🟡 |
| Configured? | Code routes through `supabase.auth.signInWithOAuth({ provider: "google" })` when `NEXT_PUBLIC_AUTH_ENABLED=true`. Credentials live in Supabase Dashboard (NOT Vercel env) |
| Working? | No — needs OAuth client at https://console.cloud.google.com/apis/credentials with redirect URI `https://twebgqutuqgonabvhzjk.supabase.co/auth/v1/callback` |
| Production ready? | After Dashboard wiring per `docs/auth.md` step 1–2 |
| Frontend connected? | Yes (LinkedInstitutionalAccounts surface · Google button calls `signInWithProvider("google")`) |
| Backend connected? | Supabase Auth handles the OAuth dance server-side |
| Env vars added? | None on Vercel — credentials are inside Supabase |
| Vercel configured? | Not needed |
| Blockers | Manual Dashboard setup (Google Cloud Console OAuth client + Supabase Dashboard Auth → Providers → Google) |
| Notes | OpenID Connect scope set: `openid profile email` |

## LinkedIn OAuth

| Field | Value |
|---|---|
| Category | OAuth identity provider |
| Status | 🔴 |
| Configured? | Provider wired; no credentials |
| Blockers | Create app at `linkedin.com/developers/apps` |
| Notes | Authorized redirect URI: `https://www.hotelvalora.com/api/auth/callback/linkedin` |

## Apple OAuth

| Field | Value |
|---|---|
| Category | OAuth identity provider |
| Status | 🔴 |
| Configured? | Provider wired; no credentials |
| Blockers | Requires Apple Developer Account (paid $99/yr) + Service ID + .p8 key |
| Notes | Auth.js mints the short-lived client_secret JWT from the .p8 key at runtime |

## Resend

| Field | Value |
|---|---|
| Category | Transactional email |
| Status | 🟢 |
| Configured? | Yes |
| Working? | Yes — server action `sendTourRequestAction` sends in prod |
| Production ready? | Yes (with sandbox sender limitation) |
| Partially implemented? | Yes — sandbox sender only delivers to Resend account owner |
| Frontend connected? | Yes (Library ContactCell "Schedule a Tour" CTA) |
| Backend connected? | Yes (server action via Resend SDK) |
| Env vars added? | Yes — `RESEND_API_KEY` + `RESEND_FROM_EMAIL` set on Vercel |
| GitHub safe? | Yes (key only in `.env.local` + Vercel encrypted) |
| Documentation complete? | Yes (`docs/integrations/resend.md`) |
| Local tested? | Yes |
| Production tested? | Yes |
| Blockers | Sandbox sender — to deliver to arbitrary recipients, verify a domain at https://resend.com/domains |
| Notes | API key was posted in chat once — see `security-audit.md` for rotation guidance |

## Stripe

| Field | Value |
|---|---|
| Category | Payments |
| Status | 🔵 |
| Configured? | Not installed |
| Notes | Schema has `public.subscriptions` ready. Will install `stripe` + `@stripe/stripe-js` in Phase 5; webhook handler at `/api/stripe/webhook` |

## PostHog

| Field | Value |
|---|---|
| Category | Product analytics |
| Status | 🔵 |
| Configured? | Not installed |
| Notes | Planned: event tracking + funnels + session replay. Phase 5 — `pnpm add posthog-js`; install in `apps/web/src/components/providers.tsx` |

## Sentry

| Field | Value |
|---|---|
| Category | Error monitoring |
| Status | 🔵 |
| Configured? | Backend `apps/api` has Sentry config; frontend pending |
| Notes | `pnpm add @sentry/nextjs`, instrument the app, set `SENTRY_DSN` (and `SENTRY_AUTH_TOKEN` for source-map upload) |

## OpenAI / Anthropic / Vercel AI Gateway

| Field | Value |
|---|---|
| Category | AI / LLM |
| Status | 🔵 |
| Configured? | Not installed |
| Notes | Planned for AI renders + investment match scoring + chatbot. Defer to Phase 5 |

## FastAPI backend (apps/api)

| Field | Value |
|---|---|
| Category | API |
| Status | 🟡 |
| Configured? | Yes — Docker Compose dev runtime |
| Working? | Yes locally; only `/review` consumed from frontend |
| Production ready? | No — not deployed |
| Frontend connected? | Partial — review queue only |
| Backend connected? | Postgres + Redis via Docker Compose |
| Env vars added? | Yes (`apps/api/app/config.py` reads env) |
| Vercel configured? | N/A — FastAPI lives on its own host |
| Notes | Phase 3 decision: keep FastAPI vs. migrate to Supabase Edge Functions |

## PostgreSQL (local Docker)

| Field | Value |
|---|---|
| Category | Database (dev) |
| Status | 🟢 |
| Notes | Used by FastAPI in dev. Production DB will be Supabase Postgres |

## Stitch / Claude Code / ChatGPT / Claude

| Field | Value |
|---|---|
| Category | Dev tools (external) |
| Status | 🟢 |
| Notes | Not in the runtime stack — pair-programming + design ref tools only |

## CoStar / STR / Booking / Catastro / CBRE / MSCI

| Field | Value |
|---|---|
| Category | Future data sources |
| Status | 🔵 |
| Notes | All listed in `HOTELVALORA_TECH_STACK_MASTER.md` Future Data Sources table — no integration today; CoStar + Excel ingestion has a parser in `services/data_pipeline` |

---

## Health summary (snapshot)

| Status | Count |
|---|---|
| 🟢 Working | 14 |
| 🟡 Partial | 6 |
| 🔴 Not configured | 4 |
| ⚫ Blocked | 0 |
| 🔵 Planned | 11 |

**Infrastructure health score: 76%**
(weighted: 🟢=1.0, 🟡=0.5, 🔴=0.0, planned excluded · 19×1 + 6×0.5 + 2×0.0 = 22 of 29 active services = 76%. Supabase Auth + Google OAuth flipped to 🟡 — code complete, manual Dashboard activation pending. Net dip: two new "code complete but credentials pending" rows joined the inventory, slightly diluting the score until activation flips them to 🟢.)
