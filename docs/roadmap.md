# Roadmap

> ❄️ **FROZEN · 2026-05-19**
>
> **Status:** frozen · do not update
> **Reason:** This file is a task-level backlog from the FastAPI-era roadmap. Most items reference deprecated backend paths (Python `services/financial_engine/` · `ValuationService` IRR computation · alembic migrations beyond 0006) that are no longer the live underwriting pipeline.
> **Canonical replacements:**
> - **Visible product phases (strategic):** `docs/roadmap/master-roadmap.md`
> - **What just shipped + up-next:** `docs/roadmap/current-sprint.md`
> - **Future ideas · blocked · tech debt:** `docs/roadmap/backlog.md`
>
> Inbound links in `ENTRYPOINTS.md` and other docs that still reference this file should be updated to one of the three canonical files above. Content below is preserved as a historical snapshot of the backend roadmap.

---

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

### Frontend — Report Module
- [ ] `/report/asset-analysis` page (section 2 — hotel personalizado, CAPEX, renders)
- [ ] `/report/market-overview` page (section 4 — overview, transactions, projects, dynamics)
- [ ] `/report/financials` page (section 5 — finance structure, P&L, underwriting IRR)
- [ ] `/report/methodology` page (section 6)
- [ ] Replace all mock data (`getMockCompetitiveSet`, `getExecutiveSummaryMock`) with real API calls to `GET /api/v1/reports/{id}`
- [ ] Mobile print testing — verify `print:col-span-*` pattern holds on different OS/browser print engines
- [ ] Auth wiring — gate report pages behind JWT; redirect to `/` if unauthenticated

### Frontend — General
- [ ] **Library / Saved Reports** — next implementation target (folder tree, search, filters, open/duplicate/export/share)
- [ ] Token refresh interceptor in `lib/api/client.ts`
- [ ] Dark mode
- [ ] Export to PDF / Excel (valuations, underwriting reports) — A4 portrait + landscape templates per report type
- [ ] Mobile-responsive layout
- [ ] Tier gating extension (FREE/PRO/PREMIUM enforcement on every report page, not just Investment Requirements)
- [ ] Real OAuth runtime (NextAuth — providers already registered at `lib/auth/providers.ts`)

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
