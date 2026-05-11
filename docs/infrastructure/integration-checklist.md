# Integration Checklist

Per-service activation steps. Each section is a stepped recipe — follow top-to-bottom to move a service from 🔴 / 🟡 to 🟢.

**Last refreshed:** 2026-05-11

---

## ☐ Supabase schema (next action)

State: 🟡 → 🟢

1. ☐ Open `https://supabase.com/dashboard/project/twebgqutuqgonabvhzjk/sql/new`
2. ☐ Paste contents of `docs/database/schema.sql`
3. ☐ Run — should complete in < 5 seconds (idempotent `if not exists`)
4. ☐ Verify in `Database → Tables` that 6 tables appear with RLS enabled
5. ☐ Regenerate frontend types:
   ```bash
   cd apps/web
   pnpm dlx supabase gen types typescript \
     --project-id twebgqutuqgonabvhzjk     \
     --schema public                        \
     > src/lib/supabase/types.ts
   ```
6. ☐ Commit `chore(supabase): generate database types from schema`
7. ☐ Update `service-status.md` row from 🟡 → 🟢

## ☐ Supabase storage buckets

State: 🔴 → 🟢

1. ☐ Open `https://supabase.com/dashboard/project/twebgqutuqgonabvhzjk/storage/buckets`
2. ☐ Create 5 buckets:
   - `reports` — public read, RLS: own write
   - `pdfs` — private (signed URLs only)
   - `excel-uploads` — private, RLS: own only
   - `renders` — public read, RLS: own write
   - `avatars` — public read, RLS: own write
3. ☐ Configure per-bucket policies in the dashboard (RLS toggle + policy editor)
4. ☐ Document the bucket policies in `docs/integrations/supabase.md`

## ☐ Resend domain verification (leave sandbox)

State: 🟡 → 🟢
Audited: 2026-05-11

### Pre-flight — what's already in place (audit findings)

The integration is **fully wired in code and Vercel env**. Only DNS / domain verification is missing:

- ✅ `resend ^6.12.3` installed in `apps/web/package.json`
- ✅ `RESEND_API_KEY` + `RESEND_FROM_EMAIL` encrypted on Vercel production (set 2026-05-11)
- ✅ Server-only client singleton (`apps/web/src/lib/email/client.ts`) — `import "server-only"` guard, lazy throw on missing key
- ✅ Typed server action `sendTourRequestAction` (`apps/web/src/lib/email/actions.ts`) — Zod-validated payload, structured error return
- ✅ Multipart HTML+text template (`apps/web/src/lib/email/templates/tour-request.ts`) — XSS-escaped
- ✅ UI surface: `components/library/contact-cell.tsx` calls the server action from the TOP PROMOTE "Schedule a Tour" CTA
- ✅ Reply-to logic + Resend analytics tags (`kind=tour-request`, `reference=<HV-…>`)
- ✅ Comprehensive docs (`docs/integrations/resend.md`)
- 🟡 Sender resolves to the Resend sandbox (`onboarding@resend.dev`) → only the Resend account owner's inbox receives messages

### Steps to leave sandbox

1. ☐ Open `https://resend.com/domains`
2. ☐ Add `hotelvalora.com`
3. ☐ Copy the DKIM + SPF records and add them to the DNS at the domain registrar
4. ☐ Wait for verification (usually < 10 min)
5. ☐ Update Vercel env: `vercel env rm RESEND_FROM_EMAIL production --yes` → `echo "HotelVALORA <noreply@hotelvalora.com>" | vercel env add RESEND_FROM_EMAIL production`
6. ☐ Redeploy: GitHub auto-deploy on the next push to `main`, or `vercel deploy --prod --yes` for an immediate trigger
7. ☐ Verify: send a tour request from the Library — should land in any inbox the account manager owns

## ☐ Auth.js production wire (Google first)

State: 🔴 → 🟢 (per provider)

### Google

1. ☐ Open `https://console.cloud.google.com/apis/credentials`
2. ☐ Create OAuth 2.0 Client ID — Application type: Web application
3. ☐ Authorized JavaScript origins: `https://www.hotelvalora.com`, `http://localhost:3000`
4. ☐ Authorized redirect URIs: `https://www.hotelvalora.com/api/auth/callback/google`, `http://localhost:3000/api/auth/callback/google`
5. ☐ Copy the Client ID + Client Secret
6. ☐ `vercel env add GOOGLE_CLIENT_ID production` (paste id)
7. ☐ `vercel env add GOOGLE_CLIENT_SECRET production` (paste secret)
8. ☐ Add the same to `apps/web/.env.local`
9. ☐ Generate `AUTH_SECRET`: `openssl rand -base64 32` → `vercel env add AUTH_SECRET production`
10. ☐ Flip `AUTH_ENABLED=true` in Vercel
11. ☐ Redeploy: `vercel deploy --prod --yes`
12. ☐ Click the Google card under the login form — should redirect to Google OAuth → callback → `/settings/profile`

### LinkedIn

Same shape — different developer console:
1. ☐ `https://www.linkedin.com/developers/apps` → Create app
2. ☐ Add the "Sign In with LinkedIn using OpenID Connect" product
3. ☐ Redirect URLs: `https://www.hotelvalora.com/api/auth/callback/linkedin` + `http://localhost:3000/api/auth/callback/linkedin`
4. ☐ Copy Client ID + Client Secret → `vercel env add LINKEDIN_CLIENT_ID/SECRET production`

### Apple

Heavier — requires paid Apple Developer Account ($99/yr):
1. ☐ `https://developer.apple.com/account/resources/identifiers/list/serviceId` → Register a Services ID
2. ☐ Enable "Sign In with Apple" capability on the Services ID
3. ☐ Configure return URL: `https://www.hotelvalora.com/api/auth/callback/apple`
4. ☐ Generate a private key (.p8) at `https://developer.apple.com/account/resources/authkeys/list`
5. ☐ The Service ID id → `APPLE_CLIENT_ID`
6. ☐ The .p8 raw content → `APPLE_CLIENT_SECRET` (Auth.js mints the JWT from it)

## ☐ Sentry (frontend)

State: 🔵 → 🟢

1. ☐ Create a Sentry project at `https://sentry.io` for the `next` platform
2. ☐ `cd apps/web && pnpm add @sentry/nextjs`
3. ☐ `pnpm dlx @sentry/wizard@latest -i nextjs` — interactive setup creates `sentry.{client,server,edge}.config.ts`
4. ☐ Set `SENTRY_DSN` + `SENTRY_AUTH_TOKEN` in Vercel
5. ☐ Verify by throwing a test error in dev — should land in the Sentry issues dashboard

## ☐ PostHog

State: 🔵 → 🟢

1. ☐ Create a PostHog project at `https://posthog.com`
2. ☐ `cd apps/web && pnpm add posthog-js`
3. ☐ Wire into `components/providers.tsx` — `posthog.init(NEXT_PUBLIC_POSTHOG_KEY, { api_host: NEXT_PUBLIC_POSTHOG_HOST })`
4. ☐ Set env vars in Vercel
5. ☐ Verify by clicking around — events should land in PostHog within a minute

## ☐ Stripe (Phase 5)

State: 🔵 → 🟢

1. ☐ Create products + prices in the Stripe dashboard (one per tier: PRO / PREMIUM / TEAM / ENTERPRISE)
2. ☐ `cd apps/web && pnpm add stripe @stripe/stripe-js`
3. ☐ Create webhook handler at `apps/web/src/app/api/stripe/webhook/route.ts`
4. ☐ Add `STRIPE_SECRET_KEY` (server) + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (client) + `STRIPE_WEBHOOK_SECRET` (server)
5. ☐ Wire the webhook to update `public.subscriptions` via the service-role Supabase client
6. ☐ Test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

## ☐ GitHub Actions CI

State: 🔴 → 🟢

1. ☐ Create `.github/workflows/ci.yml`
2. ☐ Steps: checkout → setup-node + pnpm → `pnpm install` → `pnpm --filter web typecheck` → `pnpm --filter web build`
3. ☐ Triggers: push to `main` + pull requests
4. ☐ Verify by pushing a typecheck-breaking change to a branch — CI should fail
