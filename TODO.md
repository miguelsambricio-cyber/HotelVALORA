# TODO

Concrete pending items. Strategic roadmap at [`ROADMAP.md`](ROADMAP.md). Backend / data pipeline / observability backlog at [`docs/roadmap.md`](docs/roadmap.md).

---

## High Priority — frontend

### Library / Saved Reports — **next implementation target**
- [ ] `/library` route + page composition
- [ ] `LibraryShell` (filter sidebar + search + grid/table toggle)
- [ ] Saved report data model (id, asset, market, status, date, tier, tags, owner)
- [ ] `lib/library/` Zustand store (mock catalog v1; backend adapter v2)
- [ ] Folder tree component (drag-drop optional; v1 is flat)
- [ ] Search bar with fuzzy match on asset + market + submarket
- [ ] Filter chips (status / tier / date range / tags)
- [ ] Report card primitive (cover image + title + metrics + actions)
- [ ] Open · Duplicate · Export PDF · Share actions
- [ ] Tag system + favorites

### PDF generation
- [ ] A4 portrait template per report type (executive-summary, asset-analysis, financials, market-overview, methodology)
- [ ] A4 landscape variant (CompSet, financials sensitivity)
- [ ] Print preview from any report page
- [ ] Server-side rendering pipeline (puppeteer or Vercel @sparticuz/chromium) — evaluate
- [ ] Mobile/Firefox print fallback verification

### Tier gating extension
- [ ] FREE/PRO/PREMIUM enforcement on every report page (not just Investment Requirements)
- [ ] `<UpgradeGate>` wrapping for premium-only sections
- [ ] Unit-test the tier resolver (auth → URL override → default)

---

## High Priority — data ingestion (CoStar / STR / CBRE)

- [ ] Excel parser stub for CoStar exports
- [ ] Mapping: CoStar columns → `criteria` + `market scenarios` fields
- [ ] STR CSV import → market RevPAR / OCC / ADR baselines
- [ ] Adapter test fixtures (sample CoStar + STR files)
- [ ] CBRE / MSCI transactions ingestion module

---

## Medium Priority — backend

### Auth (real OAuth runtime)
- [ ] Install NextAuth + wire LinkedIn / Google / Apple / Microsoft providers (registry already shipped at `lib/auth/providers.ts`)
- [ ] JWT refresh interceptor in Axios client
- [ ] Token revocation / blacklist (Redis-backed)
- [ ] `GET /auth/me` route (currently stub)

### Underwriting engine
- [ ] DCF projection from `criteria.value.financeStructure` + market scenarios
- [ ] Levered + unlevered IRR
- [ ] Debt sizing (LTV cap, DSCR floor)
- [ ] Equity waterfall
- [ ] Sensitivity grid (cap rate × exit yield)
- [ ] Monte Carlo (extend beyond 2D)

### Match engine (replace stub)
- [ ] Per-category scoring functions (location, size, facilities, financials, capex, strategy)
- [ ] Weighted aggregation → `MatchResult`
- [ ] Surface `<MatchIndicator>` next to candidate hotels on Executive Summary, CompSet, Deal Screening

### Data pipeline
- [ ] Auto-resolve `auto_merge` recommendations
- [ ] Merge execution (alias transfer + FK re-pointing)
- [ ] Scheduled dedup scan (Celery beat nightly)
- [ ] Import progress streaming (WebSocket / SSE)

---

## Low Priority — polish

- [ ] AI-generated report narratives (IC commentary, sensitivity callouts)
- [ ] Team collaboration (multi-user orgs, shared portfolios, deal pipeline)
- [ ] Notifications (in-app + email)
- [ ] Workflow automation (auto-flag deal opportunities matching criteria)
- [ ] AI-rendered hotel imagery (replace render rows on Asset tab)
- [ ] Dark mode
- [ ] Mobile responsive full pass
- [ ] i18n (Spanish / English UI strings)

---

## Tech debt

- [ ] Consolidate `_key()` / `_normalize()` (currently inlined 3x)
- [ ] Observability: Prometheus metrics + log aggregation config
- [ ] Production Docker Compose with TLS
- [ ] CI/CD pipeline (GitHub Actions: lint, typecheck, test, build)
- [ ] Database backup automation (pg_dump → S3)
