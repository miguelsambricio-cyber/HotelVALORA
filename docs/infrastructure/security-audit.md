# Security Audit

Per-incident log + the standing posture review. Update after every change that touches secrets, RLS, headers or auth.

**Last refreshed:** 2026-05-11

## Standing posture

| Control | State | Notes |
|---|---|---|
| `.env.local` git-ignored | ✅ | Confirmed via `git check-ignore apps/web/.env.local` |
| No secrets in commits | ✅ | Audit: `git log --all --pretty=format: --name-only --diff-filter=A | grep -iE "env\\.local$"` returns nothing |
| Vercel env vars encrypted at rest | ✅ | 6 vars in production — all show `Encrypted` in `vercel env ls` |
| Service-role key server-only | ✅ | `import "server-only"` on `lib/supabase/admin.ts` — build fails if a client component imports it |
| `NEXT_PUBLIC_*` exposure intentional | ✅ | Mapbox token (domain-restricted) · Supabase URL (public by design) · Supabase anon key (safe with RLS) |
| Resend `RESEND_API_KEY` server-only | ✅ | `import "server-only"` on `lib/email/client.ts` |
| Mapbox token domain-restricted | ✅ | Restriction enforced on the Mapbox dashboard side |
| Supabase RLS enabled (when schema applied) | ⚠ Pending | Schema proposal enables RLS on every public table — depends on schema being applied |
| HTTPS-only cookies in production | ✅ | Auth.js cookie name `__Secure-hotelvalora.session-token` + `secure: process.env.NODE_ENV === "production"` |
| Auth.js JWT signed (not encrypted) | ✅ | `session: { strategy: "jwt" }` — JWS, not JWE; `jose` warnings on Edge are unused JWE paths |
| CSRF protection on auth endpoints | ✅ | Auth.js handles via `/api/auth/csrf` |
| Middleware enforces protection on `/settings`, `/library`, `/report`, `/dashboard` | ⏸ Gated | `AUTH_ENABLED=false` until OAuth credentials exist — middleware is intentionally a pass-through |

## Known incidents

### 1. Resend API key + Supabase keys posted in chat (2026-05-11)

**Context:** During the integration setup, the user shared `RESEND_API_KEY` (`re_JNaXTqRo_…`) and both Supabase JWTs (anon + service_role) in chat. They were saved to `apps/web/.env.local` (git-ignored) and `vercel env add` (encrypted).

**Risk profile:**
- Resend key: medium — quota abuse if leaked
- Supabase anon key: low — bounded by RLS policies (but RLS isn't applied yet)
- Supabase service_role: HIGH — bypasses RLS, full DB read/write

**Mitigation status:**
- ✅ Keys never committed
- ⚠ Keys exist in chat history + telemetry — out of repo control
- ☐ Rotation recommended after schema is applied + production traffic warmed (so existing sessions don't break unnecessarily)

**Rotation procedure (when you decide):**

```bash
# Resend
# 1. Generate a new key at https://resend.com/api-keys
# 2. vercel env rm RESEND_API_KEY production
# 3. vercel env add RESEND_API_KEY production    # paste new value
# 4. Update apps/web/.env.local manually
# 5. vercel deploy --prod --yes
# 6. Revoke the old key in the Resend dashboard

# Supabase
# Settings → API → Reset (regenerates BOTH anon + service_role)
# Then mirror the new values into Vercel + .env.local
# All existing sessions invalidated
```

### 2. AUTH_SECRET not yet generated (2026-05-11)

**Context:** Auth.js was scaffolded with placeholder env values. `AUTH_SECRET` MUST be generated before any production OAuth handshake succeeds.

**Risk profile:** None today — middleware is gated by `AUTH_ENABLED=false`. Will be HIGH once OAuth credentials land if `AUTH_SECRET` is forgotten.

**Mitigation:** Listed as step 9 in `integration-checklist.md` § Auth.js. Generate via `openssl rand -base64 32`.

## Frontend exposure scan

Verified zero references to server-only env vars from `"use client"` files:

```
grep -r "process.env.RESEND" apps/web/src --include="*.tsx" → 0 matches
grep -r "process.env.SUPABASE_SERVICE_ROLE_KEY" apps/web/src --include="*.tsx" → 0 matches
grep -r "process.env.GOOGLE_CLIENT_SECRET" apps/web/src --include="*.tsx" → 0 matches
```

The `import "server-only"` guards on `lib/email/client.ts`, `lib/supabase/admin.ts` and `lib/supabase/server.ts` enforce this at build time.

## Auth surface review

Today the app has TWO coexisting auth surfaces:
1. **Mock Zustand store** (`lib/auth/store.ts`) — dev/demo only. Tier inferred from email handle. Persisted to `localStorage`.
2. **Auth.js v5** — scaffolded, providers wired, no credentials, middleware pass-through.

**Risk:** Low — the mock store is `localStorage`-only and has no server-side trust. A user who edits localStorage can grant themselves any tier; that only affects their own client (mock data has no RLS to bypass yet).

**Mitigation:** When Phase 3 wires `@auth/supabase-adapter`, retire the mock store. Until then, never trust `useAuth().user.tier` for any server-side decision.

## Supabase RLS posture

The schema proposal (`docs/database/schema.sql`) enables RLS on every public table with these policies:

| Table | Read | Write |
|---|---|---|
| `user_profiles` | own only | own only |
| `valuations` | public + top-promote (anon ok) + own (auth) | own (auth) |
| `valuation_reports` | mirrors parent valuation | mirrors parent valuation |
| `favorites` | own (auth) | own (auth) |
| `top_promote` | public (anon ok) | valuation owner (auth) |
| `subscriptions` | own (auth) | (Stripe webhook via service-role) |

Storage policies live in the dashboard and need to be set explicitly per bucket — listed in `integration-checklist.md`.

## Authenticated Intelligence Sources — credential controls

Source-of-truth: `docs/integrations/hosteltur.md` (validation source). The three-tier model below applies to every paid source we onboard (Hosteltur, then Alimarket, then STR).

### Three-tier credential model

| Tier | What | Where it lives | Read by | RLS / scope |
|---|---|---|---|---|
| KEK | Encryption key (`INTELLIGENCE_SESSION_ENC_KEY`) | Vercel env (Production · Sensitive) + operator `.env.local` | Crypto envelope module only | n/a — env vars |
| T1.5 | Login credentials (AES-256-GCM encrypted) | `public.intelligence_source_credentials` | Service-role only · admin UI write · refresh script read | RLS enabled · zero policies · `revoke all` from `anon` / `authenticated` |
| T2 | Session artifact (AES-256-GCM encrypted `storageState`) | `public.intelligence_source_sessions` | Service-role only | RLS enabled · zero policies · `revoke all` from `anon` / `authenticated` |
| T3 | Article content (no credentials) | `public.market_news` + companions | Standard read policies (existing) | Same as current intelligence tables |

**T1.5 came in 2026-05-12.** Before then, T1 was raw credentials in Vercel env vars. The migration to encrypted-in-DB credentials happened because the institutional operating model requires HotelVALORA to be the credentials-management console, not Vercel.

### Hard guarantees enforced by the architecture

1. **No plaintext credential in the database.** T1 only lives in env vars. T2 is encrypted with AES-256-GCM before INSERT.
2. **No anon / authenticated read of T2.** Migration 0009 enables RLS, defines zero policies, and `revoke all on public.intelligence_source_sessions from anon, authenticated`. Even a future permissive-policy mistake cannot bypass this without granting privileges first.
3. **No browser exposure.** No `NEXT_PUBLIC_*` mirror exists for any credential variable. The `import "server-only"` guards on `lib/intelligence/*` and `lib/supabase/admin.ts` mean a build error fires the moment a client component imports these.
4. **No credentials in audit rows.** `ai_agent_runs` references sessions by `source_slug` + `enc_key_id` + `refreshed_at` — never by credential value. The redaction utility (`lib/secrets/redact.ts`) replaces any known-credential-name key in structured logs.
5. **No credentials in logs.** The Market Intelligence Agent's `fetch` wrapper logs status + host + timing only. No headers, no body, no cookies. Errors are sanitised before reaching Vercel function logs.
6. **No credentials in Git.** `.env.local` and `.env` are gitignored. `.env.example` documents NAMES only. `gitleaks` pre-commit hook (planned · backlog) catches accidental commits.

### Rotation policy

| Trigger | Action |
|---|---|
| Quarterly (calendar) | Rotate `*_PASSWORD` at source · update Vercel · run `pnpm intel:refresh` |
| Suspected leak | Same as quarterly, immediately, plus `git filter-repo` if the leak was committed |
| Operator offboard | Rotate `*_PASSWORD` + `INTELLIGENCE_SESSION_ENC_KEY` + `INTELLIGENCE_REFRESH_TOKEN` |
| KEK rotation | See `docs/infrastructure/environment-variables.md` § KEK rotation procedure |

### What to verify after every deploy

- `select count(*) from public.intelligence_source_sessions` — anon role must return permission-denied; service-role must return the row count.
- `\d+ public.intelligence_source_sessions` — RLS must be `on`, no policies listed.
- Vercel function logs for the daily cron — `grep -i "hosteltur\|password\|cookie:" $LOG` must return zero credential-bearing lines.

## Audit cadence

After every commit that:
- Adds a new env var
- Adds a new auth surface
- Touches RLS or storage policies
- Introduces a new server action that mutates data
- Adds a new third-party SDK
- Onboards a new authenticated intelligence source

...refresh this file. The audit should answer: "did this change add any path where a non-owner can read or mutate someone else's data?"
