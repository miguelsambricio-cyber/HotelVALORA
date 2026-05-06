# API Reference

**Base URL:** `http://localhost:8000/api/v1`  
**Docs (dev):** `http://localhost:8000/docs`  
**Auth:** JWT Bearer token — obtain via `POST /auth/login`

All responses follow the envelope:
```json
{ "data": {...}, "errors": [] }
```

---

## Auth — `/auth`

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create user account |
| POST | `/auth/login` | Obtain access + refresh tokens |
| POST | `/auth/refresh` | Rotate access token |
| GET | `/auth/me` | Current user profile |

---

## Hotel Assets — `/assets/hotels`

| Method | Path | Description |
|---|---|---|
| GET | `/assets/hotels` | List hotel assets (paginated) |
| POST | `/assets/hotels` | Create hotel asset |
| GET | `/assets/hotels/{id}` | Get asset by ID |
| PATCH | `/assets/hotels/{id}` | Update asset |
| DELETE | `/assets/hotels/{id}` | Delete asset |
| GET | `/assets/hotels/{id}/financials` | Asset financial history |

---

## Flex Living — `/assets/flex-living`

| Method | Path | Description |
|---|---|---|
| GET | `/assets/flex-living` | List flex living assets |
| POST | `/assets/flex-living` | Create flex living asset |
| GET | `/assets/flex-living/{id}` | Get asset by ID |
| PATCH | `/assets/flex-living/{id}` | Update asset |
| DELETE | `/assets/flex-living/{id}` | Delete asset |

---

## Valuations — `/valuations`

### DCF — `/valuations/dcf`

| Method | Path | Description |
|---|---|---|
| POST | `/valuations/dcf` | Run DCF valuation |
| GET | `/valuations/dcf/{id}` | Get DCF result |
| GET | `/valuations/dcf/{id}/sensitivity` | Sensitivity grid |

### Underwriting — `/valuations/underwriting`

| Method | Path | Description |
|---|---|---|
| POST | `/valuations/underwriting` | Create underwriting model |
| GET | `/valuations/underwriting/{id}` | Get underwriting detail |
| PATCH | `/valuations/underwriting/{id}` | Update assumptions |

---

## Market Intelligence — `/market`

### Intelligence — `/market/intelligence`

| Method | Path | Description |
|---|---|---|
| GET | `/market/intelligence` | Market overview by city/submarket |
| GET | `/market/intelligence/{submarket}` | Submarket detail + snapshots |

### Comparables — `/market/comparables`

| Method | Path | Description |
|---|---|---|
| GET | `/market/comparables` | List transaction comps |
| POST | `/market/comparables` | Add transaction comp |
| GET | `/market/comparables/{id}` | Get comp detail |

---

## Imports — `/imports`

| Method | Path | Description |
|---|---|---|
| POST | `/imports/excel` | Upload Excel template (multipart) |
| POST | `/imports/costar` | Trigger CoStar data sync |

Query param `?template_type=hotels|financials|transactions` required for Excel import.

---

## Health

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Service health check |

---

## Middleware

| Middleware | Behavior |
|---|---|
| `RequestIDMiddleware` | Injects `X-Request-ID` on every request |
| `TimingMiddleware` | Adds `X-Process-Time` header |
| `GZipMiddleware` | Compresses responses ≥ 1 KB |
| `CORSMiddleware` | Origins controlled by `API_ALLOWED_ORIGINS` env var |
