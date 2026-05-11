# Environment Variables

Single inventory of every env var that exists, where it's set, who consumes it, and whether it's safe.

**Last refreshed:** 2026-05-11

## Convention

- `NEXT_PUBLIC_*` → exposed to the browser at build time. Safe only when the underlying value is intentionally public (Mapbox public token, Supabase anon key with RLS).
- Everything else → server-only. Never reference from a `"use client"` file (the build will reject it).
- `.env.local` → developer machine only. **Always git-ignored.**
- `.env.example` → committed. Placeholder values + comments explaining where to find the real ones.
- Vercel production env → set via `vercel env add <NAME> production`. All values encrypted at rest.

## Production inventory (Vercel — encrypted)

| Variable | Public? | Set local? | Set Vercel prod? | Required? | Owner / consumer | Notes |
|---|---|---|---|---|---|---|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | ✅ | ✅ | ✅ | Yes — maps fail without it | Mapbox · CompSet + Market Overview maps | Domain-restricted in Mapbox dashboard |
| `RESEND_API_KEY` | ❌ Server | ✅ | ✅ | Yes — email send fails without it | Resend · `lib/email/client.ts` | Throws at call-time when missing |
| `RESEND_FROM_EMAIL` | ❌ Server | ✅ | ✅ | Optional — defaults to sandbox | Resend · `getDefaultFromAddress()` | Format: `"Display Name <addr@domain.com>"` |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ | ✅ | Yes (when Supabase queries land) | Supabase · `lib/supabase/*` | Public — `https://twebgqutuqgonabvhzjk.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ | ✅ | Yes (when Supabase queries land) | Supabase · `lib/supabase/{client,server,middleware}.ts` | Safe in browser **iff** RLS policies enforced |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ Server | ✅ | ✅ | Only for admin operations | Supabase · `lib/supabase/admin.ts` | Bypasses RLS — never expose |

## Auth flags (Supabase Auth — production path)

| Variable | Public? | Where to set | Notes |
|---|---|---|---|
| `AUTH_ENABLED` | ❌ Server | Vercel · per-environment | When `"true"`, middleware protects `/settings`, `/library`, `/report`, `/dashboard` against unauthenticated requests. Default off so the legacy Zustand mock keeps the app accessible. |
| `NEXT_PUBLIC_AUTH_ENABLED` | ✅ | Vercel · per-environment | Mirror of the above for client-side `useAuth()` to pick the Supabase adapter over the mock. **Always set both together.** |

Google OAuth credentials live in the **Supabase Dashboard** (Authentication → Providers → Google), NOT in Vercel env. Supabase handles the OAuth handshake server-side; the app never sees the Google client secret. See `docs/auth.md` for the full activation checklist.

## Placeholders (legacy Auth.js scaffold — parked)

The Auth.js v5 scaffold at `apps/web/src/auth.{config,}.ts` is kept in the repo for future non-OAuth flows (magic links, credentials, SAML). Today it is **inert** — `useOAuth().signInWithProvider` routes through Supabase Auth when `NEXT_PUBLIC_AUTH_ENABLED=true`. Set these only if Auth.js is reactivated:

| Variable | Public? | Where to find it | Notes |
|---|---|---|---|
| `AUTH_SECRET` | ❌ Server | `openssl rand -base64 32` | Auth.js JWT signing key. Unused today |
| `AUTH_URL` | ❌ Server | Production base URL (`https://www.hotelvalora.com`) | Auto-detected on Vercel from `VERCEL_URL` |
| `GOOGLE_CLIENT_ID` / `_SECRET` | ❌ Server | console.cloud.google.com/apis/credentials | Only if Auth.js reactivates as the OAuth engine instead of Supabase |
| `LINKEDIN_CLIENT_ID` / `_SECRET` | ❌ Server | linkedin.com/developers/apps | Same caveat |
| `APPLE_CLIENT_ID` / `_SECRET` | ❌ Server | developer.apple.com | Apple Developer Account required ($99/yr) |
| `NEXT_PUBLIC_API_URL` | ✅ | Empty today | When the FastAPI backend deploys, set to `https://api.hotelvalora.com/api/v1` |

## Future (not yet placeholders)

When these services land, append to `.env.example` AND this table:

| Variable | Service | Phase |
|---|---|---|
| `SENTRY_DSN` + `SENTRY_AUTH_TOKEN` | Sentry | Phase 4 |
| `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST` | PostHog | Phase 5 |
| `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` + `STRIPE_WEBHOOK_SECRET` | Stripe | Phase 5 |
| `OPENAI_API_KEY` | OpenAI | Phase 5 |
| `ANTHROPIC_API_KEY` | Anthropic | Phase 5 |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway | Phase 5 |

## Verification

- `apps/web/.env.local` exists locally and contains every active variable above (6 today, +2 auth flags when AUTH_ENABLED is on).
- `git check-ignore apps/web/.env.local` returns `apps/web/.env.local` — confirmed git-ignored.
- `vercel env ls production` → 6 encrypted entries (Mapbox + 2 Resend + 3 Supabase) ✅. Add `AUTH_ENABLED` + `NEXT_PUBLIC_AUTH_ENABLED` when activating Supabase Auth.

The probe page at `/dev/supabase-test` exposes the three Supabase vars (masked) live — refresh after any env change to confirm Vercel propagation.

## When you add a new env var

1. Add placeholder + descriptive comment to `apps/web/.env.example`
2. Add real value to `apps/web/.env.local` (NEVER commit)
3. `vercel env add <NAME> production` (and `preview` + `development` if needed)
4. `vercel deploy --prod --yes` (so the function bundle picks up the new env)
5. Add row to this file
6. Update `HOTELVALORA_TECH_STACK_MASTER.md` if the underlying service is new
7. Update `security-audit.md` if the new var is sensitive
