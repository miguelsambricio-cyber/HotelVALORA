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
| Zustand (auth · investment · library stores) | apps/web/src/lib/* |
| TanStack Query — /review + /library (4 surfaces) | hooks in `lib/api/*` + `lib/library/queries/*` |
| Mapbox GL | /compset + /report/competitive-set + /report/market-overview |
| Mapbox token | Vercel encrypted env |
| Resend SDK | server actions in apps/web/src/lib/email/* |
| Resend prod env (`RESEND_API_KEY` + `RESEND_FROM_EMAIL`) | Vercel encrypted |
| Mock Zustand auth store | apps/web/src/lib/auth/store.ts |
| Supabase clients (lib/supabase/*) | barrel split (browser-only); server-only direct-imports |
| Supabase schema applied — 32 tables, all with RLS | project `twebgqutuqgonabvhzjk` (eu-central, PG 17) — migrations `0001`–`0005` |
| Supabase Storage — 5 buckets with RLS | `reports`/`pdfs`/`excel-uploads`/`renders`/`avatars` provisioned via migration `0003` + scoped listing fix in `0004` |
| Supabase TS types (generated) | `apps/web/src/lib/supabase/types.ts` mirrors the live schema 1:1 |
| Library data (production) | 4 routes read live `valuations` + `top_promote_reports` + `favorite_reports`; optimistic ⭐ toggle |
| Library seed (production) | 6 institutional valuations + 2 active promotions + demo user (migration `0005`) |
| Postgres (local Docker) | apps/api dev only |
| FastAPI `/review` surface | apps/api/app/api/v1/review |

## 🟡 Partial (4)

| Service | What's missing |
|---|---|
| Library institutional map | Static grayscale image — swap to Mapbox in Phase 4 |
| Auth.js v5 scaffold | OAuth credentials missing; `AUTH_SECRET` + `AUTH_ENABLED` not set |
| FastAPI backend | Built endpoints (valuations/imports/auth) NOT consumed by frontend |
| Resend sandbox sender | Only delivers to Resend account owner |
| PDF exports | `window.print()` wrapper; server-side renderer planned |

## 🔴 Not configured (4)

| Service | Activation |
|---|---|
| Google OAuth provider | Create app at console.cloud.google.com/apis/credentials |
| LinkedIn OAuth provider | Create app at linkedin.com/developers/apps |
| Apple OAuth provider | Apple Developer Account ($99/yr) + Service ID + .p8 key |
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

**19 🟢 · 4 🟡 · 4 🔴 · 0 ⚫ across 27 active services**

Weighted score: (19 × 1.0 + 4 × 0.5 + 4 × 0.0) / 27 = **78%** (up from 76% — Library data + Library production reads flipped to 🟢).

## Next 5 actions (prioritised)

1. **Replace mock Zustand auth** — either swap to Supabase Auth or keep Auth.js v5 + `@auth/supabase-adapter`. Keep the `useAuth()` surface. Once signed in, the demo user (UUID `…010001`) sees real favourites; the optimistic toggle becomes truthful.
2. **Realtime subscription on `valuations`** — wire a `supabase.channel("public:valuations").on("postgres_changes", …)` listener that calls `queryClient.invalidateQueries({ queryKey: libraryKeys.all })`.
3. **Verify a domain in Resend** — leave sandbox; deliver to arbitrary recipients.
4. **Create Google OAuth client** — fastest of the three providers; unblocks Auth.js production wire.
5. **Generate `AUTH_SECRET`** (`openssl rand -base64 32`) + flip `AUTH_ENABLED=true` once OAuth credentials are in place.
