# Deployment Status

**Last refreshed:** 2026-05-11

## Production

| Field | Value |
|---|---|
| Hosting | Vercel |
| Project | `hotelvalora` |
| Scope | `miguel-sambricio-s-projects` (personal) |
| Project ref | `prj_Kaujd1oQHrnWD1Oi790f1TmgCscQ` |
| Org id | `team_3fQvljCh2epRJzAs9qOv6bWi` |
| Linked dir | `apps/web/` |
| Custom domains | `hotelvalora.com` · `www.hotelvalora.com` (aliased on every prod deploy) |
| Build command | `next build` (auto-detected from `apps/web/package.json`) |
| Output | Next.js — 34 routes (33 static + `/dev/supabase-test` dynamic + Auth.js handler) |
| Middleware bundle | 134 kB (Auth.js + Supabase ssr on Edge) |
| First Load JS (protected routes) | 138 kB |
| Auto-deploy on push | **No** — GitHub integration not enabled; promotion is CLI-triggered |

## Promotion workflow

```
edit code locally
  ↓
pnpm build           # local sanity check (typecheck + production build)
  ↓
git commit + push origin main
  ↓
vercel deploy --prod --yes    # from apps/web/
  ↓
Aliased: https://www.hotelvalora.com    (~50-60s end to end)
```

## Recent deploys

| Commit | Feature | Status |
|---|---|---|
| `407599f` | Supabase architecture initialized | Deployed |
| `e2ba909` | Resend wired for tour-request CTA | Deployed |
| `8c66542` | Auth.js v5 institutional scaffold | Deployed |
| `f2136e0` | Contact card popover for top-promoted reports | Deployed |
| `fb03160` | `/library/top-list` (Top Reports institutional list) | Deployed |
| `ced6f2e` | `/library/favorites-list` (Bloomberg-grade table) | Deployed |
| `429446e` | `/library/top-map` | Deployed |
| `f7ea4c3` | `/library/favorites-map` | Deployed |

Full history: `docs/changelog.md`.

## Production env (encrypted at Vercel)

6 variables, all encrypted at rest. See `environment-variables.md` for the full inventory.

## Preview environments

Not in active use. `vercel deploy` (without `--prod`) creates preview URLs at `hotelvalora-<hash>-miguel-sambricio-s-projects.vercel.app`. No PR workflow exists today (solo dev).

## Local development

```bash
cd apps/web
pnpm install
cp .env.example .env.local   # paste secrets per environment-variables.md
pnpm dev                     # http://localhost:3000
```

FastAPI backend (optional for review-queue dev):

```bash
docker compose -f infrastructure/docker/docker-compose.dev.yml up -d
bash infrastructure/scripts/migrate.sh
```

## CI/CD

- ✅ Local `pnpm typecheck` + `pnpm build` is the only gate today
- 🔵 GitHub Actions planned for Phase 5 (typecheck + lint + build on every push)

## Rollback procedure

Vercel keeps the last N deploys. To roll back:

```bash
vercel rollback             # interactive — pick a previous deployment
# or
vercel alias set <previous-deploy-url> www.hotelvalora.com
```

Production has never been rolled back as of this refresh.

## Observability gaps

- No Sentry on the frontend (apps/web)
- No PostHog
- No Vercel Analytics
- Vercel runtime logs accessible via `vercel logs <deploy-url>` only

Activation roadmap: `docs/roadmap/master-roadmap.md` Phase 4 + 5.
