# Auth

**Mechanism:** JWT (HS256) via `python-jose`  
**Passwords:** bcrypt via `passlib`  
**Implementation:** `app/core/security.py`, `app/api/v1/auth/auth.py`

---

## Token Types

| Type | Lifetime | Payload fields |
|---|---|---|
| Access | 60 min (`JWT_ACCESS_TOKEN_EXPIRE_MINUTES`) | `sub` (user UUID), `exp`, `type: "access"`, `role` |
| Refresh | 30 days (`JWT_REFRESH_TOKEN_EXPIRE_DAYS`) | `sub`, `exp`, `type: "refresh"` |

Both signed with `APP_SECRET_KEY` using HS256.

---

## Endpoints

### `POST /auth/register`
```json
{ "email": "...", "full_name": "...", "password": "...", "role": "analyst" }
```
Returns `UserRead`. Raises `ConflictError` if email already exists.

### `POST /auth/login`
```json
{ "email": "...", "password": "..." }
```
Returns `{ "access_token": "...", "refresh_token": "..." }`.  
Raises `UnauthorizedError` if credentials invalid or account inactive.

### `POST /auth/refresh`
```json
{ "refresh_token": "..." }
```
Validates `type == "refresh"`. Returns new token pair. Old tokens are not revoked (stateless).

### `GET /auth/me`
Requires `Authorization: Bearer <access_token>`. Returns current user profile.

---

## Security Functions (`app/core/security.py`)

```python
hash_password(plain: str) -> str               # bcrypt hash
verify_password(plain, hashed) -> bool         # bcrypt verify
create_access_token(subject, extra?) -> str    # signs JWT with role in payload
create_refresh_token(subject) -> str           # signs JWT, type="refresh"
decode_token(token) -> dict                    # raises UnauthorizedError on invalid/expired
```

---

## Frontend Storage

Tokens stored in `localStorage`:
- `access_token` — attached to every API request by Axios interceptor
- `refresh_token` — sent to `/auth/refresh` manually when access expires

On 401: both tokens cleared, redirect to `/login`. Token refresh is not automatic — must be wired explicitly if needed.

---

## User Roles

`role` field on `users` table: `analyst` | `manager` | `admin` (default: `analyst`).  
Role is embedded in the access token payload (`"role"` claim). Route-level role enforcement is not yet implemented — all authenticated users can access all endpoints.

---

## Notes

- No token revocation / blacklist (stateless). Rotate `APP_SECRET_KEY` to invalidate all tokens.
- `/health` is public — no auth required.
- OpenAPI `/docs` disabled in production (`is_production=True`).

---

## Frontend Auth Prep (Client — `apps/web/src/lib/auth/`)

The web app ships a NextAuth-shaped auth layer that is wired through every UI surface but has **no real OAuth runtime in v1**. The shape is deliberate so activating real providers later is a single PR with no UI churn.

### Modules
- `types.ts` — `UserTier`, `User`, `AuthSession`, `OAuthProvider`, `LinkedAccount`
- `store.ts` — `useAuthStore` (Zustand mock signIn/signOut, in-memory session, tier inferred from email domain)
- `providers.ts` — `OAUTH_PROVIDERS` registry (NextAuth-shaped: `nextAuthId`, `scopes`, `enabled: false`, brand colour)
- `use-oauth.ts` — `useOAuth()` hook with `signInWithProvider` / `unlinkProvider` / `isProviderEnabled`. Bodies are no-op + `console.warn` until activated.

### UI consumers
- `AppHeader` — auto-derives the tier badge from `useAuth`
- `AuthCard` — calls `useAuth().signIn(email, password)` (mock — accepts any well-formed input)
- `LinkedInstitutionalAccounts` — renders provider cards, routes click intent through `useOAuth().signInWithProvider`. Buttons are placeholders until an `OAUTH_PROVIDERS[id].enabled` flips to `true`.

### Tier resolution (`lib/report/use-tier.ts`)
Resolution priority: `?tier=` URL override → authenticated user's tier → default `premium`. Helpers: `canEditAssumptions(t)` (premium + institutional), `canViewFinancials(t)` (anything except free).

### NextAuth wire-up plan (when ready, NOT before)
1. `pnpm add next-auth` in `apps/web`
2. Flip `enabled: true` per provider in `OAUTH_PROVIDERS` (start with Google + LinkedIn — Apple needs Apple Developer + Services ID)
3. `app/api/auth/[...nextauth]/route.ts` — iterate `getEnabledOAuthProviders()` to build `authOptions.providers[]`
4. Wrap app in `<SessionProvider>` (in `app/layout.tsx` Providers)
5. Replace `useOAuth().signInWithProvider` body with `signIn(provider.nextAuthId)`
6. Replace `useAuthStore.signIn` body with `signIn("credentials", { email, password })` or remove if going OAuth-only
7. Wire `user.tier` from JWT claim or DB lookup in NextAuth callbacks

UI components do not change. Inline comments in `providers.ts` and `use-oauth.ts` document the exact swap points.
