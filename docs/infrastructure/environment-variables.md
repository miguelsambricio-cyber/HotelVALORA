# Environment Variables

Single inventory of every env var that exists, where it's set, who consumes it, and whether it's safe.

**Last refreshed:** 2026-05-12

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

## AI Operations Layer (Phase 2+)

The Tier 1 agents + audit-chain unification depend on three additional secrets. All ship as encrypted Vercel env vars; the cron routes refuse to run without them in production.

### `CRON_SECRET` — Vercel Cron Bearer token

| Where it's read | What it guards |
|---|---|
| `apps/web/src/lib/cron-auth.ts` → `assertCron()` | `/api/cron/hospitality-intel`, `/api/cron/market-intelligence`, `/api/cron/qa-monitoring` |

The cron route handler enforces `Authorization: Bearer $CRON_SECRET`. Vercel Cron injects this header automatically when the env var is set on the project. Manual operator retriggers must pass the same header explicitly.

**Posture per environment**

| Env | Without secret | Behaviour |
|---|---|---|
| Production | `assertCron()` returns 401 | Hard gate — cron routes deny all requests |
| Preview / dev | `assertCron()` logs a warning + allows | Soft posture so local + preview can exercise the cron path |

**Generate**: `openssl rand -hex 32` (or any 32+ char random string). Mirror to `apps/web/.env.local` for local dev runs.

```bash
TOKEN="$(openssl rand -hex 32)"
echo "$TOKEN" | vercel env add CRON_SECRET production
echo "$TOKEN" | vercel env add CRON_SECRET preview
echo "CRON_SECRET=$TOKEN" >> apps/web/.env.local
```

### `INGESTION_AUDIT_TOKEN` — Operator-CLI ↔ cloud bridge

| Where it's read | What it guards |
|---|---|
| `apps/web/src/app/api/agents/data-ingestion-summary/route.ts` → `assertAuth()` | The audit-sync endpoint that records `ai_agent_runs` rows from the Python CLI |
| `services/transactions/scripts/audit_sync.py` | Operator CLI POSTs Bearer header with this value |

**Without the secret on Vercel** every CLI run still completes locally (MASTER + INGESTION_LOG + per-run jsonl remain authoritative) but the `audit_sync.sync_outcomes()` call fails. The CLI prints a soft-fail message + a recovery hint; it never rolls back the local commit.

```bash
TOKEN="$(openssl rand -hex 32)"
echo "$TOKEN" | vercel env add INGESTION_AUDIT_TOKEN production
export INGESTION_AUDIT_TOKEN="$TOKEN"    # add to ~/.bashrc or ~/.zshrc
```

Optional companion: `INGESTION_AUDIT_URL` (defaults to `https://hotelvalora.com/api/agents/data-ingestion-summary`). Useful when testing against a preview deployment.

### `INTERNAL_ALERT_RECIPIENTS` — QA / Monitoring escalation list

| Where it's read | What it powers |
|---|---|
| `apps/web/src/lib/ai-agents/core/escalation.ts` → `parseRecipients()` | The recipient list for Resend internal alerts |

Comma-separated email list. The QA / Monitoring Agent sends escalations to this list with a 15-minute cooldown per `dedup_key`. When unset, falls back to a hard-coded `miguel.sambricio@metcub.com`.

```bash
echo "miguel.sambricio@metcub.com,ops@metcub.com" | vercel env add INTERNAL_ALERT_RECIPIENTS production
```

Used together with the `monitoring.escalate.email` tool (registered in `public.ai_tools`, integration=`resend`, `requires_human_approval=false` — escalations go to the closed env-pinned list, no per-send approval).

### `ADMIN_OPERATOR_EMAILS` — Operator Console allow-list (Phase 2.C · security gate)

| Where it's read | What it powers |
|---|---|
| `apps/web/src/lib/security/operator-guard.ts` → `requireOperator()` | The fail-closed gate guarding every `/user/admin/*` surface (layout RSC check + server actions) |

Comma-separated email list (case-insensitive). Required in production when `AUTH_ENABLED=true`. Falls back to `INTERNAL_ALERT_RECIPIENTS` if unset.

**Fail-closed semantics:**
- `AUTH_ENABLED !== "true"` → guard is permissive (dev / showcase mode — preserves local DX)
- `AUTH_ENABLED === "true"` + no Supabase session → middleware redirects to `/login`
- `AUTH_ENABLED === "true"` + signed-in user with email NOT on the list → layout renders `notFound()` (opaque 404 · no info-leak about the admin section)
- `AUTH_ENABLED === "true"` + **both env vars empty** → all callers denied (this was the gap before Phase 2.C)

```bash
# Set on Vercel (preview + production both):
echo "miguel.sambricio@metcub.com" | vercel env add ADMIN_OPERATOR_EMAILS production
echo "miguel.sambricio@metcub.com" | vercel env add ADMIN_OPERATOR_EMAILS preview

# Companion flip — engages the middleware + guard:
echo "true" | vercel env add AUTH_ENABLED production
echo "true" | vercel env add NEXT_PUBLIC_AUTH_ENABLED production
```

Add additional operators by re-running with the full comma-separated list. The guard normalises to lowercase before compare.

### Activation summary

| Var | Required for | Generate |
|---|---|---|
| `CRON_SECRET` | Cron routes in production | `openssl rand -hex 32` |
| `INGESTION_AUDIT_TOKEN` | Audit-sync from Python CLI | `openssl rand -hex 32` |
| `INTERNAL_ALERT_RECIPIENTS` | QA Resend escalations to operators | Comma-separated emails |
| `ADMIN_OPERATOR_EMAILS` | Operator Console allow-list (`/user/admin/*`) | Comma-separated emails |
| `AUTH_ENABLED` + `NEXT_PUBLIC_AUTH_ENABLED` | Engages middleware + guard | `"true"` |

`ADMIN_OPERATOR_EMAILS` + `AUTH_ENABLED` are the load-bearing pair that closes the operator-console security gap. Until both are set on Vercel production, `/user/admin/*` runs in dev-permissive mode and any signed-in (or anonymous) visitor can reach it.

## Authenticated Intelligence Sources (Phase 2.5+)

Three-tier credential model. Validation source: **Hosteltur**. Full architecture: `docs/integrations/hosteltur.md`. Migration: `docs/database/migrations/0009_intelligence_source_sessions.sql`.

| Tier | Var | Scope | Purpose | Generate |
|---|---|---|---|---|
| T1 | `HOSTELTUR_USERNAME` | Vercel Production + local `.env.local` | Hosteltur subscriber email | Manually — from Hosteltur account |
| T1 | `HOSTELTUR_PASSWORD` | Vercel Production + local `.env.local` | Hosteltur subscriber password | Manually — from Hosteltur account |
| T1 | `HOSTELTUR_LOGIN_URL` | optional, Vercel + local | Override if login URL moves | Default `https://www.hosteltur.com/login` |
| T1.5 | `INTELLIGENCE_SESSION_ENC_KEY` | Vercel Production + local `.env.local` | AES-256-GCM KEK that wraps every `intelligence_source_sessions` row | `openssl rand -base64 32` |
| T1.5 | `INTELLIGENCE_SESSION_ENC_KEY_ID` | Vercel + local | Active-KEK identifier (`v1`, `v2`, …) | Literal string, default `v1` |
| T1 | `INTELLIGENCE_REFRESH_TOKEN` | Vercel Production + local | Auth for future `POST /api/agents/refresh-session` | `openssl rand -hex 32` |

### Hard rules

1. **Sensitive flag must be set in Vercel** for every variable above. Sensitive keeps values out of build logs and out of the dashboard UI after creation.
2. **Production scope only** in Vercel — never Preview, never Development. Preview deployments must not receive subscription credentials (PR previews are public URLs).
3. **Never log these values.** The Market Intelligence Agent's `fetch` wrapper logs status + host + timing only — no headers, no body, no cookies. Errors are sanitised via `lib/secrets/redact.ts`.
4. **Never write these values to `ai_agent_runs.inputs` / `.outputs` / `.error`.** The audit row references the session by `source_slug` + `enc_key_id` + `refreshed_at`, never by credential.
5. **Never expose via a `NEXT_PUBLIC_*` mirror.** There is no client-side consumer.
6. **Rotate quarterly** plus immediately on any incident (suspected leak, role change, vendor compromise).

### Generation runbook

```bash
# One-time per environment — different values per env.
openssl rand -base64 32   # → INTELLIGENCE_SESSION_ENC_KEY
openssl rand -hex 32      # → INTELLIGENCE_REFRESH_TOKEN

# Then add to Vercel (Sensitive · Production):
vercel env add INTELLIGENCE_SESSION_ENC_KEY production
vercel env add INTELLIGENCE_SESSION_ENC_KEY_ID production   # paste "v1"
vercel env add INTELLIGENCE_REFRESH_TOKEN production
vercel env add HOSTELTUR_USERNAME production
vercel env add HOSTELTUR_PASSWORD production

# Pull to local:
vercel env pull apps/web/.env.local --environment=production
```

### KEK rotation procedure

1. Generate new key: `openssl rand -base64 32`.
2. Set `INTELLIGENCE_SESSION_ENC_KEY_V2` (new) and `INTELLIGENCE_SESSION_ENC_KEY_V1` (old, kept for decrypt of legacy rows).
3. Flip `INTELLIGENCE_SESSION_ENC_KEY_ID=v2`.
4. New writes wrap with v2; old rows decrypt with v1 until they expire.
5. Once `WHERE enc_key_id = 'v1'` returns zero rows, remove `INTELLIGENCE_SESSION_ENC_KEY_V1`.

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
