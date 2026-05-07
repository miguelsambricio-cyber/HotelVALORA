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
