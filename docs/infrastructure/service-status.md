# Service Status Dashboard

Quick-scan view. The authoritative table lives in `HOTELVALORA_TECH_STACK_MASTER.md` — bump it when a row's status changes here too.

**Last refreshed:** 2026-05-11

## 🟢 Working (19)

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
| Resend SDK | server actions in apps/web/src/lib/email/* |
| Resend prod env (`RESEND_API_KEY` + `RESEND_FROM_EMAIL`) | Vercel encrypted |
| `useAuth()` unified hook | `apps/web/src/lib/auth/use-auth.ts` — Supabase or mock at build time |
| Auth middleware (Supabase session refresh + protected-route gating) | `apps/web/src/middleware.ts` |
| OAuth callback handler | `apps/web/src/app/auth/callback/route.ts` |
| Supabase clients (lib/supabase/*) | barrel split (browser-only); server-only direct-imports |
| Supabase schema applied — 32 tables, all with RLS | project `twebgqutuqgonabvhzjk` (eu-central, PG 17) — migrations `0001`–`0005` |
| Supabase Storage — 5 buckets with RLS | `reports`/`pdfs`/`excel-uploads`/`renders`/`avatars` provisioned via migration `0003` + scoped listing fix in `0004` |
| Supabase TS types (generated) | `apps/web/src/lib/supabase/types.ts` mirrors the live schema 1:1 |
| Library data (production) | 4 routes read live `valuations` + `top_promote_reports` + `favorite_reports`; optimistic ⭐ toggle |
| Library seed (production) | 6 institutional valuations + 2 active promotions + demo user (migration `0005`) |
| Postgres (local Docker) | apps/api dev only |
| FastAPI `/review` surface | apps/api/app/api/v1/review |

## 🟡 Partial (6)

| Service | What's missing |
|---|---|
| Supabase Auth (production runtime) | Code complete (`useAuth` adapter, `/auth/callback`, middleware). Activation pending Supabase Dashboard wiring + `AUTH_ENABLED=true` / `NEXT_PUBLIC_AUTH_ENABLED=true` on Vercel — see `docs/auth.md` |
| Google OAuth provider | Code routes through Supabase. Pending OAuth client creation at console.cloud.google.com + paste credentials into Supabase Dashboard |
| Library institutional map | Static grayscale image — swap to Mapbox in Phase 4 |
| FastAPI backend | Built endpoints (valuations/imports/auth) NOT consumed by frontend |
| Resend sandbox sender | Only delivers to Resend account owner |
| PDF exports | `window.print()` wrapper; server-side renderer planned |

## 🔴 Not configured (2)

| Service | Activation |
|---|---|
| LinkedIn OAuth provider | Create app at linkedin.com/developers/apps + enable LinkedIn in Supabase Dashboard |
| Apple OAuth provider | Apple Developer Account ($99/yr) + Service ID + .p8 + enable Apple in Supabase Dashboard |
| GitHub Actions CI | Phase 5 — add typecheck + lint workflow |

## ⚫ Blocked (0)

None.

## 🔵 Planned (10)

| Service | Phase |
|---|---|
| Stripe | Phase 5 |
| PostHog | Phase 5 |
| Sentry (frontend) | Phase 4 |
| OpenAI / Anthropic / Vercel AI Gateway | Phase 5 |
| Vercel Analytics | Quick win — enable via dashboard |
| Supabase Auth + `@auth/supabase-adapter` | Phase 3 |
| Server-side PDF rendering (Puppeteer or react-pdf) | Phase 4 |
| CoStar (live API) / STR / Booking / Catastro / CBRE / MSCI | Phase 5–6 |
| Microsoft / Azure AD OAuth | Future enterprise SSO |
| S3 / MinIO (legacy storage) | Likely retired in favour of Supabase Storage |

## Health score

**19 🟢 · 6 🟡 · 3 🔴 · 0 ⚫ across 28 active services**

Weighted score: (19 × 1.0 + 6 × 0.5 + 3 × 0.0) / 28 = **78.6%**. Supabase Auth + Google OAuth joined as 🟡 (code complete · manual Dashboard activation pending). Flipping them to 🟢 after the operator finishes the `docs/auth.md` checklist takes the score to **82%**.

## Next 5 actions (prioritised)

1. **Activate Supabase Auth** — follow `docs/auth.md`: Google Cloud Console OAuth client → Supabase Dashboard (Providers + URL allowlist) → Vercel `AUTH_ENABLED=true` + `NEXT_PUBLIC_AUTH_ENABLED=true` → redeploy.
2. **Add sign-up + password-reset flows** — `supabase.auth.signUp` and `supabase.auth.resetPasswordForEmail`. Today only Google OAuth creates accounts.
3. **Realtime subscription on `valuations`** — `supabase.channel("public:valuations").on("postgres_changes", …)` → `queryClient.invalidateQueries({ queryKey: libraryKeys.all })`.
4. **Verify a domain in Resend** — leave sandbox; deliver to arbitrary recipients.
5. **Workspace switcher** — read `public.user_roles` joined with `public.organizations`; surface in AppHeader.
