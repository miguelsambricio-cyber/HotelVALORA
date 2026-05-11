# Service Status Dashboard

Quick-scan view. The authoritative table lives in `HOTELVALORA_TECH_STACK_MASTER.md` — bump it when a row's status changes here too.

**Last refreshed:** 2026-05-11

## 🟢 Working (14)

| Service | Production URL / scope |
|---|---|
| Vercel | hotelvalora.com |
| GitHub | github.com/miguelsambricio-cyber/HotelVALORA |
| Next.js 14 + React 18 + TS | apps/web |
| Tailwind CSS | apps/web |
| Zustand (auth · investment · library stores) | apps/web/src/lib/* |
| TanStack Query + Table | /review surface |
| Mapbox GL | /compset + /report/competitive-set + /report/market-overview |
| Mapbox token | Vercel encrypted env |
| Resend SDK | server actions in apps/web/src/lib/email/* |
| Resend prod env (`RESEND_API_KEY` + `RESEND_FROM_EMAIL`) | Vercel encrypted |
| Mock Zustand auth store | apps/web/src/lib/auth/store.ts |
| Supabase clients (lib/supabase/*) | code in place + env wired |
| Postgres (local Docker) | apps/api dev only |
| FastAPI `/review` surface | apps/api/app/api/v1/review |

## 🟡 Partial (6)

| Service | What's missing |
|---|---|
| Supabase project `twebgqutuqgonabvhzjk` | Schema NOT applied; storage buckets NOT created |
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

## 🔵 Planned (11)

| Service | Phase |
|---|---|
| Stripe | Phase 5 |
| PostHog | Phase 5 |
| Sentry (frontend) | Phase 4 |
| OpenAI / Anthropic / Vercel AI Gateway | Phase 5 |
| Vercel Analytics | Quick win — enable via dashboard |
| Supabase Storage buckets (reports/pdfs/excel-uploads/renders/avatars) | Phase 3 |
| Supabase Auth + `@auth/supabase-adapter` | Phase 3 |
| Server-side PDF rendering (Puppeteer or react-pdf) | Phase 4 |
| CoStar (live API) / STR / Booking / Catastro / CBRE / MSCI | Phase 5–6 |
| Microsoft / Azure AD OAuth | Future enterprise SSO |
| S3 / MinIO (legacy storage) | Likely retired in favour of Supabase Storage |

## Next 5 actions (prioritised)

1. **Apply Supabase schema** — run `docs/database/schema.sql` via SQL editor → regenerate types
2. **Verify a domain in Resend** — leave sandbox; deliver to arbitrary recipients
3. **Create Google OAuth client** — fastest of the three providers; unblocks Auth.js production wire
4. **Configure Supabase storage buckets** — needed before PDFs / Excel uploads land
5. **Generate `AUTH_SECRET`** (`openssl rand -base64 32`) + flip `AUTH_ENABLED=true` once OAuth credentials are in place
