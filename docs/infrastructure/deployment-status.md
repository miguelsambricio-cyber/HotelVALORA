# Deployment Status

**Last refreshed:** 2026-05-11
**Pipeline last verified:** 2026-05-11 — preview path (this commit, on branch `test/auto-deploy-preview`) + production path (commit `9c73722` on `main`).

## Production

| Field | Value |
|---|---|
| Hosting | Vercel |
| Project | `hotelvalora` |
| Scope | `miguel-sambricio-s-projects` (personal) |
| Project ref | `prj_Kaujd1oQHrnWD1Oi790f1TmgCscQ` |
| Org id | `team_3fQvljCh2epRJzAs9qOv6bWi` |
| Linked dir | `apps/web/` |
| **Root Directory** (project setting) | `apps/web` — **REQUIRED** for GitHub-triggered builds. If unset, Vercel clones the repo and runs the build from `/`, where `package.json` doesn't have Next.js (Next.js lives in `apps/web/package.json`). Set via Project Settings → General → Root Directory in the Dashboard. CLI-triggered builds bypass this because they upload only the linked dir |
| Custom domains | `hotelvalora.com` · `www.hotelvalora.com` (aliased on every prod deploy) |
| Build command | `next build` (auto-detected from `apps/web/package.json`) |
| Output | Next.js — 34 routes (33 static + `/dev/supabase-test` dynamic + Auth.js handler) |
| Middleware bundle | 81.8 kB (`@supabase/ssr` only — Auth.js wrapper removed) |
| First Load JS (Library routes) | 214 kB (Supabase JS + TanStack Query) |
| Git integration | **GitHub connected** → `miguelsambricio-cyber/HotelVALORA` |
| Auto-deploy on push to `main` | **Yes — production** |
| Auto-deploy on push to other branches | **Yes — preview** (URL: `hotelvalora-<sha>-miguel-sambricio-s-projects.vercel.app`) |
| GitHub commit status checks | Automatic per Vercel-GitHub integration (Preview Ready / Production Ready) |

## Promotion workflow (since 2026-05-11)

```
edit code locally
  ↓
pnpm build           # local sanity check (typecheck + production build)
  ↓
git commit + push origin <branch>
  ↓
Vercel auto-builds:
  - main           → production deploy → aliased to www.hotelvalora.com
  - any other ref  → preview deploy at hotelvalora-<sha>-…vercel.app
  ↓
GitHub commit status check posts back (Preview Ready / Production Ready)
  ↓
~60-90s end to end
```

The `vercel deploy --prod --yes` CLI path still works and is the canonical "skip git" escape hatch (eg. for emergency rollbacks where pushing a fix-up commit is undesirable).

### Preview deploys

Every push to a non-`main` ref creates a preview deploy. The URL pattern is `hotelvalora-<sha-prefix>-miguel-sambricio-s-projects.vercel.app`. Preview deploys inherit production env vars by default unless a variable is scoped to "Production only" in Vercel.

The two auth flags (`AUTH_ENABLED`, `NEXT_PUBLIC_AUTH_ENABLED`) are currently **Production-only**, so previews fall back to the Zustand mock — preview reviewers can navigate the entire app without needing Google OAuth.

## Recent deploys

| Commit | Feature | Deploy ID | Status |
|---|---|---|---|
| _next_ | GitHub → Vercel auto-deploy enabled (this commit triggers it as the verification) | _pending_ | _pending_ |
| `722efb7` | Public Beta / Showcase Mode — `PROTECTED_PREFIXES=[]` | `dpl_CVVn7ZDtYvKm5goATAjQ8drMcLui` | Deployed |
| `5c3ef91` | Supabase Auth wired (Google OAuth-ready) | `dpl_GcD2jM47icS8KzWDRNdYcyZY6iZF` | Deployed |
| `d754a69` | Library surfaces wired to Supabase via TanStack Query | _bundled in 5c3ef91_ | Deployed |
| `2d891c2` | Supabase Storage + typed helpers + regen TS types | _bundled in 5c3ef91_ | Deployed |
| `f7e40b4` | Apply Supabase initial schema + harden SECURITY DEFINER | _bundled in 5c3ef91_ | Deployed |
| `b326f0b` | Comprehensive Supabase schema (30 tables) | _bundled in 5c3ef91_ | Deployed |
| `14f523a` | Reusable Supabase migration runner script | _bundled in 5c3ef91_ | Deployed |
| `407599f` | Supabase architecture initialized | `dpl_2MK3gkWCX3Uga334vmWqi7hmt7mS` | Superseded |
| `e2ba909` | Resend wired for tour-request CTA | `dpl_3yY1Tfah8ZsZq2h5SggSw42hS8kL` | Superseded |
| `8c66542` | Auth.js v5 institutional scaffold | — | Superseded |
| `f2136e0` | Contact card popover for top-promoted reports | `dpl_EV43K26b198Wsu6QZUpx6KsFisGD` | Superseded |
| `fb03160` | `/library/top-list` (Top Reports institutional list) | `dpl_FVjv1WfUhxRbtcpQvtxtTL7nYDbQ` | Superseded |

Full history: `docs/changelog.md`.

## Production env (encrypted at Vercel)

8 variables, all encrypted at rest:
- `NEXT_PUBLIC_MAPBOX_TOKEN`
- `RESEND_API_KEY` · `RESEND_FROM_EMAIL`
- `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY`
- `AUTH_ENABLED` · `NEXT_PUBLIC_AUTH_ENABLED`

See `environment-variables.md` for the full inventory and `auth.md` for why both auth flags exist together.

## Preview environments

Active. Every git push to a non-`main` ref auto-creates a preview deploy at `hotelvalora-<hash>-miguel-sambricio-s-projects.vercel.app`. The Vercel-GitHub commit status check posts back on the commit / PR with a "Preview Ready" link. Manual `vercel deploy` (without `--prod`) still works for ad-hoc previews from arbitrary local changes.

Preview deploys inherit Production env by default unless explicitly scoped. The two auth flags are scoped Production-only so preview reviewers don't get redirected to OAuth.

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

- ✅ Vercel-GitHub auto-deploy on push (main → production, branches → preview)
- ✅ Vercel build runs `pnpm build` per push — failed build blocks the deploy and posts back a failed commit status
- ✅ Local `pnpm typecheck` + `pnpm build` remains the fast-feedback gate before pushing
- 🔵 GitHub Actions planned for Phase 5 (typecheck + lint as a separate required check, useful if Vercel build ever skips a TS error)

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
- ✅ Vercel Analytics installed since 2026-05-11 (`@vercel/analytics` 2.0.1, mounted in `apps/web/src/app/layout.tsx`)
- Vercel runtime logs accessible via `vercel logs <deploy-url>` only

Activation roadmap: `docs/roadmap/master-roadmap.md` Phase 4 + 5.
