# HotelVALORA — Web

Next.js 14 frontend for the HotelVALORA institutional hotel valuation platform.

**Stack:** Next 14 (App Router) · React 18 · TypeScript · Tailwind CSS · TanStack Query · Mapbox GL · pnpm

---

## Local development

```bash
# From apps/web/
pnpm install
cp .env.example .env.local      # fill in the Mapbox token
pnpm dev                         # http://localhost:3000
```

Other scripts:

```bash
pnpm typecheck                   # tsc --noEmit
pnpm lint                        # next lint
pnpm build                       # production build
pnpm start                       # serve the production build
```

---

## Environment variables

See `.env.example` for the full list. Public vars (browser-exposed):

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | yes (for `/compset` + `/report/competitive-set`) | Mapbox GL access token. Restrict to your domain in the Mapbox dashboard. |
| `NEXT_PUBLIC_AVUXI_ENABLED` | no (default `"false"`) | Phase 2 AVUXI feature flag. When `"true"` (string · strict equality), `/compset` and `/report/*` skip manual heatmap+metro layers and mount the AVUXI overlay driven by the CAPAS panel. When anything else (default), manual layers from `lib/maps/geo-data.ts` render as today. Rollback: flip to `"false"` on Vercel and redeploy. Centro Histórico polygon is HV-native and unaffected. |
| `NEXT_PUBLIC_API_URL` | no | Backend API base URL. The app currently uses mock data and never hits a real API; leave empty until the FastAPI backend ships. |

---

## Deploy on Vercel

The repo ships with `vercel.json` configured for the monorepo layout (root directory = `apps/web`).

### One-time setup

```bash
npm i -g vercel
vercel login

# From apps/web/
cd apps/web
vercel link --scope=<your-team-id>
vercel env add NEXT_PUBLIC_MAPBOX_TOKEN production --scope=<your-team-id>
```

### Deploy

```bash
vercel deploy --prod --scope=<your-team-id>
```

Returns a public URL (`<project>.vercel.app`). Wire your custom domain via Vercel **Settings → Domains** and the registrar's DNS panel.

### Dashboard alternative

1. [vercel.com](https://vercel.com) → **Add New → Project** → import the GitHub repo.
2. **Root Directory:** `apps/web`.
3. **Environment Variables:** add `NEXT_PUBLIC_MAPBOX_TOKEN`.
4. **Deploy.**

---

## Deploy notes

- **Image hosts:** `next.config.mjs` allows `lh3.googleusercontent.com` (Stitch placeholders), `images.unsplash.com` (Transactions gallery), and `**.cloudfront.net` (future S3 pipeline). Components currently use plain `<img>` tags so any URL works regardless of `remotePatterns`; the list matters for a future `<Image>` migration.
- **Mock data:** every report page reads from `src/lib/report/<section>-data.ts`. No backend calls happen. Production with no API still works end-to-end.
- **Print/PDF:** verified on Chromium. Firefox `@-moz-document` fallback wired but not visually validated. See `docs/print-pdf.md`.
- **Standalone output:** `NEXT_OUTPUT=standalone` toggles the Next standalone build for Docker. Not needed on Vercel.

For the full architecture, see `docs/report-system.md`, `docs/print-pdf.md`, `REPORT_PAGES.md`, `UI_COMPONENTS.md` at the repo root.
