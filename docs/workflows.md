# Workflows

User-facing flows and CTA wiring. Each step maps to a route and key component.

---

## Primary Valuation Workflow

```
Step 1 — Landing Page (/)
  Component: HeroSection, PricingSection
  CTA: "Empezar" / "Valorar Hotel" → /compset

Step 2 — CompSet Selection (/compset)
  Component: CompsetMap → CompetitorPanel
  Action: User reviews AI-suggested competitors, adds/removes from panel
  CTA: "Confirmar CompSet →" → /report/executive-summary
  Wiring: <Link href="/report/executive-summary"> in CompetitorPanel CTA footer

Step 3 — Executive Summary (/report/executive-summary)
  Component: ReportShell → ReportPaper → [AssetSection, MarketSection, ValuationSection]
  Action: User reviews institutional valuation report
  CTAs:
    - PDF export (PaperHeader button) → window.print()
    - FAVORITOS | GUARDAR | UPGRADE (ActionBar)
    - Back to landing: "HotelVALORA" logo → /
```

---

## Navigation Wiring (current state)

| Source | Element | Destination | Status |
|---|---|---|---|
| Landing Header | "Empezar" CTA | `/compset` | To wire |
| CompetitorPanel | "Confirmar CompSet →" | `/report/executive-summary` | ✓ Wired |
| ReportTopNav | "HotelVALORA" logo | `/` | ✓ Wired |
| ReportTopNav | "Biblioteca" | `#` | Placeholder |
| ReportTopNav | "Login" | `#` | Placeholder |
| ReportFooter | Footer links | `#` | Placeholders |
| ActionBar | "FAVORITOS" | — | Not wired |
| ActionBar | "GUARDAR" | — | Not wired |
| ActionBar | "UPGRADE" | — | Not wired |
| PaperHeader | PDF export button | `window.print()` | Check |

---

## Report Internal Navigation

Report sections listed in `src/lib/report/report-nav.ts`.  
Sidebar renders links using this registry.  
Planned sections after Executive Summary:
1. Asset Analysis (3 sub-pages)
2. CompSET
3. Market Overview (4 sub-pages)
4. Financials (3 sub-pages)
5. Methodology

---

## CompSet Panel Interaction

1. Panel opens via chevron toggle button (right edge of map).
2. User sees "CompSet Activo" (reference hotel name at top).
3. "Seleccionados" list shows active competitors with remove (×) button.
4. "Sugeridos por IA" list shows AI suggestions with add (+) button.
5. "Confirmar CompSet →" confirms and navigates to report.

---

## Future Flows (not yet implemented)

- Auth flow: Login → token stored → dashboard access
- Report generation: User inputs hotel address/ID → system generates report ID → redirect to `/report/[reportId]/executive-summary`
- Saved reports: "GUARDAR" → persist to user account
- Upgrade flow: "UPGRADE" → pricing modal or `/pricing`
