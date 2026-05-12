# Authentication

HotelVALORA's production authentication runs on **Supabase Auth** (OAuth + sessions + cookie management). The Auth.js v5 scaffold is still in the repo but inert — kept for future non-OAuth flows.

**Last refreshed:** 2026-05-12
**Platform mode:** 🟢 Public Beta / Institutional Showcase — public surfaces stay anonymous-readable. **Two paths are auth-gated as of 2026-05-12:** `/user/admin/*` (operator console · credentials · agents · integrations) and `/settings/*` (user preferences). Activation requires `AUTH_ENABLED=true` on Vercel — without it the middleware refreshes sessions but never redirects. Public surfaces (`/`, `/library`, `/report`) remain anonymous.

---

## TL;DR

| Concern | Implementation |
|---|---|
| OAuth dance | Supabase Auth (`supabase.auth.signInWithOAuth`) |
| Provider credentials | Supabase Dashboard → Authentication → Providers (NOT Vercel env) |
| Cookie strategy | HttpOnly, `__Secure-` prefixed in prod, `sameSite: lax` (handled by `@supabase/ssr`) |
| Session refresh | Middleware (`apps/web/src/middleware.ts`) calls `supabase.auth.getUser()` to rotate the JWT on every request |
| Protected routes | `/user/admin` + `/settings` (when `AUTH_ENABLED=true`). Public Beta keeps everything else anonymous. List lives in `middleware.ts` `PROTECTED_PREFIXES` |
| User provisioning | `handle_new_user` trigger on `auth.users` → auto-inserts `public.users` + `public.profiles` |
| RBAC | `public.users.role` enum (`user` / `admin` / `owner`); RLS uses `auth.uid()` |
| Org membership | `public.user_roles (user_id, organization_id, role)` join |
| Client surface | `useAuth()` — engine-agnostic, picks Supabase or Zustand mock at build time |
| Migration safety | `AUTH_ENABLED` flag controls Supabase Auth runtime; `PROTECTED_PREFIXES` array (separate concern) controls which routes redirect anonymous traffic |

---

## Activation runbook — Administrator section (Camino A · 2026-05-12)

Activates Supabase Auth route protection on `/user/admin/*` so credential provisioning + agent operations require a real signed-in operator. **One-time bootstrap per environment.**

### Step 1 — Create your Supabase Auth user

Supabase Dashboard → Authentication → **Users** → **Add user**:

- **Email:** your operator email (e.g., `miguel.sambricio@metcub.com`)
- **Password:** a strong password you generate locally (NOT one you've shared anywhere · ≥ 16 chars · password manager)
- **Auto Confirm User:** ✅ (otherwise you'd need a verification email round-trip)

Note the user's UUID for the audit trail. The `handle_new_user` trigger auto-inserts the matching `public.users` + `public.profiles` rows.

### Step 2 — Set Vercel env vars (Production scope · Sensitive flag for keys)

```bash
# Auth activation — both required, both must match
AUTH_ENABLED=true                          # server-side middleware enforcement
NEXT_PUBLIC_AUTH_ENABLED=true              # client-side `useAuth()` engine pick

# Operator allow-list — comma-separated, lower-case
ADMIN_OPERATOR_EMAILS=miguel.sambricio@metcub.com

# Credential-store encryption KEK (generate ONCE per environment)
INTELLIGENCE_SESSION_ENC_KEY=$(openssl rand -base64 32)
INTELLIGENCE_SESSION_ENC_KEY_ID=v1
```

Set via Vercel dashboard → Project → Environment Variables → **Production**, mark the two key values as **Sensitive**. Trigger a redeploy (Vercel will do this automatically on env-var change).

### Step 3 — Sign in

Navigate to `https://www.hotelvalora.com/login` → enter your operator email + the password from Step 1. The `AuthCard` posts to `supabase.auth.signInWithPassword` and the cookie lands.

### Step 4 — Provision credentials

Now `/user/admin/integrations/hosteltur` → **Provision Credentials** → enter the **rotated** Hosteltur email + password (rotated since the previous chat leak) → **Encrypt & Store**.

Same flow for Alimarket. The server action runs `assertAdminContext()` → finds your Supabase session + your email in `ADMIN_OPERATOR_EMAILS` → passes → encrypts → upserts → audit row written with `actor_user_id` set to your UUID.

### Step 5 — Verify

- `/user/admin/integrations/hosteltur` should now show the credentials panel badge as `Active · Encrypted` instead of `Not Provisioned`.
- `/user/admin/agents/market_intelligence` → **Authenticated Sources** panel should reflect the same change.
- Supabase Studio → `public.intelligence_credentials_audit` → see the `provisioned` row.

### Diagnostic surface

Server action `provisionCredentialsAction` returns explicit messages so you can self-diagnose:

| Error message | Root cause | Fix |
|---|---|---|
| `Supabase Auth is not activated (AUTH_ENABLED=false)…` | Vercel env still has the flag off | Step 2 |
| `Sign in required. Visit /login?next=…` | Auth on but no active session | Step 3 |
| `Your account (X) is not in ADMIN_OPERATOR_EMAILS…` | Email mismatch | Step 2 — add to allow-list |
| `intelligence: encryption key unavailable` | KEK env missing/malformed | Step 2 — verify `INTELLIGENCE_SESSION_ENC_KEY` is 32-byte base64 |

### Rollback

If something breaks during activation, set `AUTH_ENABLED=false` in Vercel and redeploy. Middleware reverts to no-redirects (session refresh stays — harmless), and `/user/admin` becomes anonymous again. Credentials already stored are untouched.

---

## Public Beta / Institutional Showcase Mode

This is the platform's current operating mode. **Auth must exist and work, but auth must not block access anywhere yet.**

### Why

HotelVALORA today is being validated by partners, prospects and the underwriting team:

- Financial engine (DCF, NOI, RevPAR, IRR, exit-cap, sensitivity grids)
- Underwriting workflows (assumption surfaces, scenario forking, tier-gated lock pattern)
- Report rendering shell (executive summary, market overview, financials, competitive set, asset analysis)
- Library system (saved + community + TOP PROMOTE surfaces, ⭐ favourites)
- Infrastructure wiring (Supabase schema + Storage + RLS + Edge middleware)
- Production deployments (Vercel + custom domain + cookie strategy)

None of these surfaces have private-user features yet. **Forced login on a showcase product kills the showcase.**

### How it's enforced

```ts
// apps/web/src/middleware.ts
const PROTECTED_PREFIXES: readonly string[] = [];
```

`isProtected(pathname)` calls `.some()` on that empty array → always `false` → the redirect branch never fires, even when `AUTH_ENABLED=true`. The Supabase session refresh half of the middleware still runs unconditionally — so a user who DOES sign in via Google keeps their session warm across navigations.

### What stays unaffected

- **RLS** on `public.valuations` etc. — the public-read policy already grants anonymous SELECT on `visibility ∈ ('public','top-promote')` rows. The Library has been showing those rows to anon callers for days already.
- **Supabase Auth** — Google OAuth dance, callback handler, cookie management, `useAuth()` hydration — all live and tested. Any user who clicks "Sign in with Google" gets a real session.
- **`useAuth()` surface** — when `NEXT_PUBLIC_AUTH_ENABLED=true` it sources from Supabase (real session); the Zustand mock is the dev-only fallback when the flag is off.

### When this changes

Private-user features that will be added later trigger flipping prefixes back in:

| Future surface | Prefix to add | Phase |
|---|---|---|
| Saved-report management | `/library/saved` | Phase 4 — when the "save a report" feature lands |
| CRM | `/crm` | Phase 5 |
| Collaboration / shares | `/share/*` | Phase 5 |
| Stripe billing | `/billing` | Phase 5 |
| Institutional dashboards | `/dashboard` | Phase 5 |
| Operator admin | `/admin` | Phase 5 |
| User preferences | `/settings` | Whenever the settings surface stops being a public underwriting workbench |

Editing one line of `PROTECTED_PREFIXES` activates protection for the listed prefix — no other code change required.

---

## Architecture

```
Browser
  /login → AuthCard (email/password)    │  Google button → useOAuth
                │                       │           │
                ▼                       ▼           │
        signInWithPassword     signInWithOAuth(google)
                │                       │
                └─── Supabase JS (createBrowserClient) ───┐
                                                          │
                                                          ▼
                                          Supabase Auth (twebgqutuqgonabvhzjk)
                                                          │
                                                          │ Google OAuth dance
                                                          ▼
                                          accounts.google.com → user consents
                                                          │
                                                          ▼
                                          auth.users row created
                                                          │ (handle_new_user trigger)
                                                          ▼
                                          public.users + public.profiles populated
                                                          │
                                                          ▼
                                          Redirect ${origin}/auth/callback?code=…
                                                          │
                                                          ▼
                                          app/auth/callback/route.ts
                                            exchangeCodeForSession → HttpOnly cookies
                                                          │
                                                          ▼
                                          Redirect to ?next=/settings/profile
```

## File map

| Concern | File |
|---|---|
| `useAuth()` — unified hook | `apps/web/src/lib/auth/use-auth.ts` |
| Supabase auth adapter | `apps/web/src/lib/auth/use-supabase-auth.ts` |
| Zustand mock store | `apps/web/src/lib/auth/store.ts` |
| OAuth provider hook | `apps/web/src/lib/auth/use-oauth.ts` |
| Build-time flags | `apps/web/src/lib/auth/auth-mode.ts` |
| OAuth callback handler | `apps/web/src/app/auth/callback/route.ts` |
| Route protection middleware | `apps/web/src/middleware.ts` |
| Server session readers | `apps/web/src/lib/supabase/auth-helpers.ts` |
| Login surface | `apps/web/src/app/login/page.tsx` + `components/auth/auth-card.tsx` |
| Linked Accounts panel | `components/auth/linked-institutional-accounts.tsx` |
| Auth.js v5 scaffold (inert) | `apps/web/src/auth.{config,}.ts`, `app/api/auth/[...nextauth]/route.ts` |

---

## Activation checklist

Follow these steps **in order**. Step 1–4 give the platform a working Google OAuth flow without blocking anonymous access (Public Beta mode). To enable route protection later, see § "Public Beta / Showcase Mode" — flip prefixes into `PROTECTED_PREFIXES`.

### 1. Google Cloud Console

1. Open https://console.cloud.google.com/apis/credentials.
2. **Project**: create a new project named "HotelVALORA" or pick the existing one. (Top-left dropdown.)
3. **OAuth consent screen** (left nav):
   - **User type**: External (unless you're on Google Workspace and want internal-only).
   - **App name**: HotelVALORA
   - **User support email**: your email
   - **App logo**: optional but recommended for production
   - **App domain**: `https://www.hotelvalora.com`
   - **Authorized domains**: `hotelvalora.com` AND `supabase.co`
   - **Developer contact**: your email
   - **Scopes**: `openid`, `email`, `profile` (the defaults)
   - **Test users** (only if you keep status = "Testing"): add your own email so you can sign in before the app is "Published".
4. **Credentials** → **Create Credentials** → **OAuth client ID**:
   - **Application type**: Web application
   - **Name**: HotelVALORA Web
   - **Authorized JavaScript origins**:
     - `https://hotelvalora.com`
     - `https://www.hotelvalora.com`
     - `http://localhost:3000`
   - **Authorized redirect URIs** — **CRITICAL**:
     - `https://twebgqutuqgonabvhzjk.supabase.co/auth/v1/callback` ← Supabase is the OAuth callback target
     - (No need to add `localhost` here; Supabase's callback handles the inner redirect.)
   - **Save**. Copy the **Client ID** and **Client Secret** — you'll paste them into Supabase next.

### 2. Supabase Dashboard — wire Google provider

1. Open https://supabase.com/dashboard/project/twebgqutuqgonabvhzjk/auth/providers.
2. Find **Google** in the provider list → toggle **Enable**.
3. Paste the **Client ID** + **Client Secret** from step 1.
4. **Authorized Client IDs** can stay empty (only needed for native iOS / Android client IDs).
5. **Save**.

### 3. Supabase Dashboard — URL allowlist

1. Open https://supabase.com/dashboard/project/twebgqutuqgonabvhzjk/auth/url-configuration.
2. **Site URL**: `https://www.hotelvalora.com`
3. **Redirect URLs** (allowlist — every entry that may appear in `redirectTo`):
   - `https://www.hotelvalora.com/auth/callback`
   - `https://hotelvalora.com/auth/callback`
   - `http://localhost:3000/auth/callback`
   - `https://*.vercel.app/auth/callback` (preview deploys — Supabase supports wildcards in the last subdomain)
4. **Save**.

### 4. Vercel env vars

```bash
vercel env add AUTH_ENABLED production
# → paste: true
vercel env add NEXT_PUBLIC_AUTH_ENABLED production
# → paste: true
```

Optionally mirror to `preview` if previews should require auth.

> Both vars must be flipped together. `AUTH_ENABLED` gates the middleware (server / edge); `NEXT_PUBLIC_AUTH_ENABLED` gates the client-side `useAuth()` source picker. With only one set, the engines disagree and `/login` would loop.

### 5. Redeploy & verify

```bash
cd apps/web
vercel deploy --prod --yes
```

After deploy:

1. Open https://www.hotelvalora.com/login in an incognito window.
2. Click the **Google** button under "Linked institutional accounts".
3. You should be redirected to `accounts.google.com`, consent, and land on `/settings/profile`.
4. Hit `/dev/supabase-test` — "Current Supabase session" should now show your email.
5. Hit `/library/favorites-map` — should render normally; the ⭐ toggle now persists to `public.favorite_reports`.

### Local development

In `apps/web/.env.local`:

```bash
AUTH_ENABLED=true
NEXT_PUBLIC_AUTH_ENABLED=true
```

`pnpm dev` will pick those up. The Google redirect resolves to `http://localhost:3000/auth/callback` because the OAuth `redirectTo` is built from `window.location.origin`.

---

## Why Supabase Auth and not Auth.js v5 + `@auth/supabase-adapter`?

The HotelVALORA schema was designed around Supabase Auth from day one:

- `public.users.id` has a foreign key on `auth.users.id`.
- A `handle_new_user` trigger on `auth.users` populates `public.users` + `public.profiles` automatically.
- Every RLS policy uses `auth.uid()` — the Postgres function that resolves to the Supabase JWT's `sub` claim.

Using `@auth/supabase-adapter` would have meant:

- Creating a separate `next_auth.users` table that does **not** participate in the FK above.
- Either dropping the FK (and the trigger) or duplicating every signup into both schemas.
- Manually minting a Supabase-compatible JWT in the Auth.js `session` callback (signed with `SUPABASE_JWT_SECRET`) so the frontend Supabase client still gets `authenticated`-role RLS.
- Carrying two cookie schemes (`__Secure-authjs.session-token` and `sb-…-auth-token`) in parallel.

Net: Auth.js + adapter solves a problem Supabase Auth doesn't have, and adds two extra moving parts (`next_auth` schema, JWT-mint side-channel) on top of the existing one. We picked the cleaner side.

The Auth.js scaffold stays in the repo for future flows where it would add value:

- **Magic-link email** with custom branded templates beyond what Supabase Auth surfaces.
- **Credentials-grant SSO** (SAML, OIDC) for enterprise customers — Auth.js's third-party provider catalogue is wider.
- **Account-linking workflows** that compose multiple OAuth providers under one HotelVALORA identity.

When any of those land, the Auth.js handler at `/api/auth/[...nextauth]` is already wired through; the swap is local to that surface.

---

## Mock auth (development default)

`apps/web/src/lib/auth/store.ts` exposes a Zustand mock store with `persist` middleware. When `NEXT_PUBLIC_AUTH_ENABLED` is unset (or `false`), `useAuth()` returns this mock — same shape, same behaviour the app has been shipping:

- Any non-empty email + 4+ character password → sign in succeeds.
- Tier inferred from email local-part (`premium@…`, `pro@…`, `enterprise@…`, etc).
- Session persisted to `localStorage` under key `hv-auth-v1`.
- `signOut()` clears the store.

The mock is **not** removed when Supabase Auth activates — it stays available for developer demos and Vercel preview deploys that don't have OAuth credentials wired. The picker in `lib/auth/use-auth.ts` is the only thing that decides which source `useAuth()` returns.

---

## RBAC + organisations

The schema already exposes the building blocks; the auth surface just has to read them.

- **`public.users.role`** — platform-wide role (`user` / `admin` / `owner`). Set during signup via the `handle_new_user` trigger (defaults to `user`); flipped by an admin via a server action.
- **`public.user_roles (user_id, organization_id, role org_role)`** — per-org role, where `org_role ∈ ('owner','admin','member','viewer')`. Use this to enforce "only org owners can promote a report", etc.
- **`public.users.current_organization_id`** — the active workspace in the workspace switcher. Updated when the user clicks an org in the picker.

`useAuth()` exposes `user.role` (platform role) and `user.organization` (current org id) today. The org-membership read (current_organization_id → organizations row) is opportunistic — the workspace switcher will fetch the full org row when it lands.

---

## What's still mock after this commit

| Surface | Status |
|---|---|
| OAuth dance | ✅ Supabase Auth (Google ready; LinkedIn + Apple require Supabase Dashboard wiring) |
| Email/password sign-in | ✅ Supabase Auth — but no signup flow yet, so existing accounts must onboard via Google first |
| Sign-out | ✅ Supabase Auth |
| Protected-route middleware | ✅ Supabase session check |
| User row hydration into `useAuth()` | ✅ `public.users` + `public.profiles` join |
| Session persistence | ✅ HttpOnly cookies, refreshed in middleware |
| **Sign-up surface** | ❌ Not built — Google OAuth is the only path to create an account today |
| **Password reset** | ❌ "¿Has olvidado la contraseña?" link still points back to `/login?reset=true`; needs a flow that calls `supabase.auth.resetPasswordForEmail(...)` |
| **Linked accounts unlink** | ⚠️ Soft sign-out only; full unlink (delete `oauth_accounts` row + revoke provider token) needs a server action |
| **Workspace switcher** | ❌ `user.organization` is the current org id but no UI exposes a switcher |
| **`AUTH_ENABLED=false` (default)** | ✅ Zustand mock — kept on purpose so dev + preview deploys keep working |
