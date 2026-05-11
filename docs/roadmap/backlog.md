# Backlog

Three buckets: **Future ideas** · **Blocked** · **Technical debt**. Anything else lives in `master-roadmap.md` or `current-sprint.md`.

---

## Future ideas

### Library

- Multi-report comparison view (side-by-side underwriting deltas)
- Saved searches + saved filters (per user, sync to backend)
- Folders / tags inside Favorites
- Team collaboration: comments on reports, shared folders
- Export selected rows to Excel / PDF
- AI-ranked "Best match for your investment criteria" surface

### Top Promote marketplace

- Sponsor analytics dashboard (impressions / clicks / lead conversions per promotion)
- Auction-style boost bidding for premium map slots
- Geo-targeted promoted regions (`featuredRegion` ISO codes)
- Auto-expiration emails 7d / 1d before `promotedUntil`

### Report engine

- Section 5 (Financials) implementation — P&L, Underwriting & IRR, Sensitivity
- Section 6 (Methodology) implementation
- Server-side PDF rendering via Puppeteer (replace `window.print()`)
- Multi-currency support across sections

### Settings + Investment criteria

- HMA / lender-side investment criteria tabs
- Scenario import from Excel workbook
- Criteria-vs-asset match score on every Library row

### Cross-cutting

- Notifications system (sonner today is local-only; need persistent + filterable)
- Mobile-responsive Library list (today: optimised for desktop terminals)
- Dark mode (tokens exist but never tested)

---

## Blocked

- 🔴 *(none today)*

---

## Technical debt

| Item | Severity | Notes |
|---|---|---|
| Library map uses static grayscale image | Low | Acceptable for MVP; Phase 4 swaps to Mapbox |
| Mock `MOCK_LIBRARY_REPORTS` duplicated between map markers and table rows | Low | Single source today; will move to API in Phase 3 |
| `FavoritesTable` is named after favorites but used by both lists | Low | Considered rename to `LibraryReportsTable`; kept for commit-history continuity |
| `apps/web/src/lib/library/store.ts` carries no persistence | Low | By design — UI ephemeral state. Re-evaluate if users complain |
| Audit-log rollback paths only cover alias + merge mutations | Medium | Extend coverage when valuation mutations land |
| No type-tests on `LibraryReport` shape | Medium | Add `vitest` + type-only assertions in Phase 3 |
| `pdf-export.ts` is a `window.print()` wrapper | Medium | Replace with server-side render before institutional rollout |
| Auth store is mock-only, tier inferred from email | High | Replace with NextAuth + DB tier in Phase 3 |
| No CI yet — typecheck only via local `pnpm typecheck` | Medium | Add GitHub Actions before opening contributions |
| `ENTRYPOINTS.md` over 200-line cap (357 lines as of 2026-05-12) | Low | Surfaced by `scripts/docs-audit.mjs`. Compress entries that are derivable from `docs/HOTELVALORA_MASTER_SYSTEM.md`; rule is in `CLAUDE.md` |

---

## Promotion criteria

An item moves from this file to `current-sprint.md` when:
- It has a clear shape (no open design questions)
- It unblocks revenue, user retention, or a Phase milestone
- It fits in ≤ 2 days of focused work
