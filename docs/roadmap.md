# Roadmap

Planned features and improvements. Update this file when items are shipped or priorities shift.

---

## Near-Term

### Auth & Access Control
- [ ] Route-level role enforcement (`analyst` / `manager` / `admin`)
- [ ] Token refresh auto-wired in Axios interceptor (currently manual)
- [ ] Token revocation / blacklist (Redis-backed)

### Data Quality
- [ ] Auto-resolve `auto_merge` recommendations without human review
- [ ] Merge execution — actually absorb loser asset into winner (alias transfer, FK re-pointing)
- [ ] Conflict resolution suggestions powered by confidence scoring
- [ ] Scheduled dedup scan (Celery beat, e.g. nightly)

### Import Pipeline
- [ ] Import progress streaming (WebSocket or SSE) for large files
- [ ] Duplicate report download (CSV export of skipped/flagged rows)
- [ ] CoStar live API sync (currently file-based only)

---

## Medium-Term

### Financial Engine
- [ ] IRR calculation in `ValuationService` (currently stored manually)
- [ ] Equity multiple and DSCR auto-computed from underwriting model
- [ ] Scenario comparison view (multiple DCF runs side-by-side)
- [ ] Monte Carlo sensitivity (extend beyond 2D grid)

### Market Intelligence
- [ ] Market snapshot time-series charts in UI
- [ ] Comp selection assistant (filter by submarket, date range, star rating)
- [ ] Pipeline supply tracker per submarket

### Frontend
- [ ] Token refresh interceptor in `lib/api/client.ts`
- [ ] Dark mode
- [ ] Export to PDF / Excel (valuations, underwriting reports)
- [ ] Mobile-responsive layout

---

## Infrastructure / Ops

- [ ] Production Docker Compose (`docker-compose.prod.yml`) — Nginx TLS, no volume mounts
- [ ] CI/CD pipeline (GitHub Actions) — lint, typecheck, test, build
- [ ] Prometheus + Grafana for API latency / error rate
- [ ] Celery Flower monitoring
- [ ] Database backup automation (pg_dump to S3)

---

## Technical Debt

- [ ] Consolidate `_key()` / `_normalize()` — currently inlined in 3 places; consider a shared internal package
- [ ] `GET /auth/me` not yet implemented (route stub only)
- [ ] Observability gaps: no Prometheus metrics, no log aggregation config
- [ ] `import_jobs` status transitions not fully atomic (race condition possible under concurrent imports)
