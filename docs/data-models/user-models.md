# Data Models · User

## Frontend types

```ts
// apps/web/src/lib/auth/types.ts
export type UserTier =
  | "free"
  | "pro"
  | "premium"
  | "team"        // multi-seat workspace (planned)
  | "enterprise"; // bulk export, API, SSO, audit (planned)

export type UserRole = "user" | "admin" | "owner";

export interface User {
  id: string;
  email: string;
  name?: string;
  tier: UserTier;
  role?: UserRole;
  organization?: string;
}

export interface SignInResult { ok: boolean; error?: string }
```

## Auth.js v5 module augmentation

`apps/web/src/types/next-auth.d.ts` extends Auth.js's `Session`, `User` and `JWT` to carry `tier` + `role`. Consumers read `session.user.tier` directly.

```ts
declare module "next-auth" {
  interface Session {
    user: { tier: UserTier; role: UserRole } & DefaultSession["user"];
  }
  interface User { tier?: UserTier; role?: UserRole; }
}
declare module "next-auth/jwt" {
  interface JWT { tier?: UserTier; role?: UserRole; provider?: string; }
}
```

## Frontend store (Zustand persisted)

```ts
// apps/web/src/lib/auth/store.ts
useAuthStore({
  user: User | null,
  isAuthenticated: boolean,
  signIn(email, password): Promise<SignInResult>,
  signOut(): void,
})

// Convenience hook
useAuth() // returns { user, isAuthenticated }
```

Today's mock behaviour (v1 — preserved alongside Auth.js):
- Any non-empty email + password authenticates
- Tier is inferred from the email handle:
  - `enterprise@…` (or legacy `institutional@…`) → enterprise
  - `team@…` → team
  - `premium@…` (or default for plain emails) → premium
  - `pro@…` → pro
  - `free@…` → free
- Persisted to `localStorage` so the "logged-in" state survives reload

The mock store is independent of the Auth.js session. While OAuth credentials remain placeholders, email/password keeps demos working. Phase 3 retires this store in favour of the Auth.js session.

## OAuth provider registry (NextAuth-shaped)

```ts
// apps/web/src/lib/auth/providers.ts
export const PROVIDERS = [
  { id: "linkedin",  name: "LinkedIn",  Brand: LinkedInBrandMark },
  { id: "google",    name: "Google",    Brand: GoogleBrandMark   },
  { id: "apple",     name: "Apple",     Brand: AppleBrandMark    },
  { id: "microsoft", name: "Microsoft", Brand: MicrosoftBrandMark },
];
```

Brand marks: `components/auth/provider-marks.tsx`.

## Auth.js v5 (frontend session — `feat(auth)` scaffold)

| File | Purpose |
|---|---|
| `apps/web/src/auth.config.ts` | Edge-safe config — providers, callbacks, cookies, session strategy |
| `apps/web/src/auth.ts` | Full instance — exports `auth()` · `signIn()` · `signOut()` · `handlers` |
| `apps/web/src/app/api/auth/[...nextauth]/route.ts` | App Router OAuth handler |
| `apps/web/src/middleware.ts` | Edge middleware — gates `/settings`, `/library`, `/report`, `/dashboard` |
| `apps/web/src/types/next-auth.d.ts` | Module augmentation (tier + role on Session / User / JWT) |

Providers wired today (env placeholders only):
- **Google** — `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- **LinkedIn** — `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET`
- **Apple** — `APPLE_CLIENT_ID` / `APPLE_CLIENT_SECRET` (Apple's client secret is a short-lived JWT signed with the .p8 private key — Auth.js mints it from the raw key in production)

Middleware enforcement is opt-in via `AUTH_ENABLED=true`. Without it the `authorized()` callback returns `true` unconditionally so the product keeps working while the OAuth apps are being created.

Session strategy: JWT (no DB adapter today). Cookie name in production: `__Secure-hotelvalora.session-token` (httpOnly + secure + sameSite=lax). Max age: 30 days.

## Backend (FastAPI) — what exists

| Endpoint | Status |
|---|---|
| `POST /auth/login` | Built — neither Zustand store nor Auth.js call it yet |
| `POST /auth/refresh` | Built |
| `GET /auth/me` | Built |

JWT flow + token lifetimes: see `docs/auth.md`.

## Phase 3 swap plan

- Keep the `useAuth()` surface identical
- Replace `signIn` implementation with NextAuth (`signIn("provider")`) or Supabase (`auth.signInWithPassword`)
- Populate `user.tier` from the row in the `users` table (not from email handle)
- Add `signInWithProvider(provider)` for SSO

## Tier-derived UI behaviour

Tier drives:
- The tier badge in `AppHeader`
- The locked-cell pattern in the Library list views (gated financial cells)
- The Upgrade gates in the Report sections (`UpgradeGate` / `UpgradeCard` primitives)

See `docs/business-rules/tier-system.md` for the full tier matrix.

## Cross-references

| Topic | Doc |
|---|---|
| Backend auth flow | `docs/auth.md` |
| Investment criteria persistence | `docs/data-models/library-models.md` |
| Tier system | `docs/business-rules/tier-system.md` |
