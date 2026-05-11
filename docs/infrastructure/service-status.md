# Service Status Dashboard

Quick-scan view. The authoritative table lives in `HOTELVALORA_TECH_STACK_MASTER.md` — bump it when a row's status changes here too.

**Last refreshed:** 2026-05-11

## 🟢 Working (26)

| Service | Production URL / scope |
|---|---|
| Vercel | hotelvalora.com |
| GitHub | github.com/miguelsambricio-cyber/HotelVALORA |
| Next.js 14 + React 18 + TS | apps/web |
| Tailwind CSS | apps/web |
| Zustand (auth fallback · investment · library stores) | apps/web/src/lib/* |
| TanStack Query — /review + /library (4 surfaces) | hooks in `lib/api/*` + `lib/library/queries/*` |
| Mapbox GL | /compset + /report/competitive-set + /report/market-overview |
| Mapbox token | Vercel encrypted env |
| Resend SDK 6.12.3 | server actions in `apps/web/src/lib/email/{client,actions}.ts` + template at `templates/tour-request.ts` |
| Resend prod env (`RESEND_API_KEY` + `RESEND_FROM_EMAIL`) | Vercel encrypted — both set, both required for server-action sends |
| Resend integration (Library "Schedule a Tour" CTA) | wired to `ContactCell` on top-promoted reports — compiles + executes in production, send acknowledged by Resend |
| Resend production sender (`noreply@hotelvalora.com`) | `hotelvalora.com` verified in Resend (DKIM + SPF in Namecheap DNS) since 2026-05-11; delivers to any recipient inbox |
| **Hospitality Intelligence Engine — Phase 1 foundation** | Migration `0006` applied: 9 tables (`market_news`, `hotel_transactions`, `hotel_projects`, `investors`, `operators`, `sources`, `news_entities`, `news_tags`, `news_ingestion_runs`) · 10 sources seeded · RLS public-read · ingestion code lands in Phase 2. See `docs/intelligence/HOTELVALORA_HOSPITALITY_INTELLIGENCE_MASTER_SYSTEM.md` |
| **AI Operations Layer — Phase 1 foundation** | Migrations `0007` + `0008` applied: 7 tables (`ai_agents`, `ai_agent_runs`, `ai_events`, `ai_agent_permissions`, `ai_memory`, `ai_tools`, `ai_human_review`) · **10 agents seeded** (Tier 0 CEO / Orchestration + 9 operational) · 30 tools catalogued · NOT chatbots — operational AI systems with permissions + memory + audit + escalation. See `docs/ai-agents/AI_OPERATIONS_LAYER_MASTER_SYSTEM.md` |
| `useAuth()` unified hook | `apps/web/src/lib/auth/use-auth.ts` — Supabase Auth active in production |
| **Supabase Auth (production runtime)** | Google OAuth dance · `/auth/callback` handler · HttpOnly cookies · `handle_new_user` trigger. Public Beta Mode: `PROTECTED_PREFIXES=[]` — anonymous browsing allowed everywhere |
| **Google OAuth provider** | Configured in Supabase Dashboard + Google Cloud Console with redirect URI `https://twebgqutuqgonabvhzjk.supabase.co/auth/v1/callback`. `/auth/v1/settings` reports `"google": true` |
| Auth middleware (Supabase session refresh) | `apps/web/src/middleware.ts` — refreshes cookie unconditionally; route-protection branch dormant via empty `PROTECTED_PREFIXES` |
| Vercel-GitHub auto-deploy | `vercel git connect` on `prj_Kaujd1oQHrnWD1Oi790f1TmgCscQ`; push to `main` → production, branches → preview |
| OAuth callback handler | `apps/web/src/app/auth/callback/route.ts` |
| Supabase clients (lib/supabase/*) | barrel split (browser-only); server-only direct-imports |
| Supabase schema applied — 32 tables, all with RLS | project `twebgqutuqgonabvhzjk` (eu-central, PG 17) — migrations `0001`–`0005` |
| Supabase Storage — 5 buckets with RLS | `reports`/`pdfs`/`excel-uploads`/`renders`/`avatars` provisioned via migration `0003` + scoped listing fix in `0004` |
| Supabase TS types (generated) | `apps/web/src/lib/supabase/types.ts` mirrors the live schema 1:1 |
| Library data (production) | 4 routes read live `valuations` + `top_promote_reports` + `favorite_reports`; optimistic ⭐ toggle |
| Library seed (production) | 6 institutional valuations + 2 active promotions + demo user (migration `0005`) |
| Postgres (local Docker) | apps/api dev only |
| FastAPI `/review` surface | apps/api/app/api/v1/review |

## 🟡 Partial (3)

| Service | What's missing |
|---|---|
| Library institutional map | Static grayscale image — swap to Mapbox in Phase 4 |
| FastAPI backend | Built endpoints (valuations/imports/auth) NOT consumed by frontend |
| PDF exports | `window.print()` wrapper; server-side renderer planned |

## 🔴 Not configured (3)

| Service | Activation |
|---|---|
| LinkedIn OAuth provider | Create app at linkedin.com/developers/apps + enable LinkedIn in Supabase Dashboard |
| Apple OAuth provider | Apple Developer Account ($99/yr) + Service ID + .p8 + enable Apple in Supabase Dashboard |
| GitHub Actions CI | Phase 5+ — Vercel-GitHub auto-deploy now runs `pnpm build` on every push, which is sufficient. Actions only useful as a separate typecheck/lint check if needed |

## ⚫ Blocked (0)

None.

## 🔵 Planned (13)

| Service | Phase |
|---|---|
| Hospitality Intelligence — Phase 2 (ingestion pipeline + cron) | Phase 2 — next sprint candidate |
| Hospitality Intelligence — Phase 3 (entity extraction + tagging) | Phase 3 |
| Hospitality Intelligence — Phase 4–6 (AI summaries · surfaces · alerts) | Phase 4–6 |
| Stripe | Phase 5 |
| PostHog | Phase 5 |
| Sentry (frontend) | Phase 4 |
| OpenAI / Anthropic / Vercel AI Gateway | Phase 4 (Intelligence summaries) + Phase 5 (UI) |
| Vercel Analytics | Quick win — enable via dashboard |
| Server-side PDF rendering (Puppeteer or react-pdf) | Phase 4 |
| CoStar (live API) / STR / Booking / Catastro / CBRE / MSCI | Phase 5–6 |
| Microsoft / Azure AD OAuth | Future enterprise SSO |
| S3 / MinIO (legacy storage) | Likely retired in favour of Supabase Storage |

## Health score

**26 🟢 · 3 🟡 · 3 🔴 · 0 ⚫ across 32 active services**

Weighted score: (26 × 1.0 + 3 × 0.5 + 3 × 0.0) / 32 = **86%**. AI Operations Layer Phase 1 (schema + 9 agents + 20 tools + 8 strategic docs) joins as 🟢. Tier 1 agent runtimes (Market Intelligence + Data Ingestion + QA / Monitoring) are the next-sprint candidate. Platform remains in **Public Beta / Showcase Mode**.

## Next 5 actions (prioritised)

1. **Realtime subscription on `valuations`** — `supabase.channel("public:valuations").on("postgres_changes", …)` → `queryClient.invalidateQueries({ queryKey: libraryKeys.all })`.
2. **Verify a domain in Resend** — leave sandbox; deliver to arbitrary recipients.
3. **Submit Google OAuth consent for verification** — Google Cloud Console currently set to "Testing" with allowlisted users. Required for any Google account to sign in.
4. **Sign-up + password-reset flows** — `supabase.auth.signUp` and `resetPasswordForEmail`. Optional today (Google OAuth is enough) but useful before broader rollout.
5. **Workspace switcher** — read `public.user_roles` joined with `public.organizations`; surface in AppHeader.
