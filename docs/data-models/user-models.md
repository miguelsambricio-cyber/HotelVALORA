# Data Models · User

## Frontend types

```ts
// apps/web/src/lib/auth/types.ts
export type UserTier = "free" | "pro" | "premium" | "institutional";

export interface User {
  id: string;
  email: string;
  name?: string;
  tier: UserTier;
}

export interface SignInResult { ok: boolean; error?: string }
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

Today's mock behaviour (v1):
- Any non-empty email + password authenticates
- Tier is inferred from the email handle:
  - `institutional@…` → institutional
  - `premium@…` → premium (also default for plain emails)
  - `pro@…` → pro
  - `free@…` → free
- Persisted to `localStorage` so the "logged-in" state survives reload

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

## Backend (FastAPI) — what exists

| Endpoint | Status |
|---|---|
| `POST /auth/login` | Built — Zustand auth store does not yet call it |
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
