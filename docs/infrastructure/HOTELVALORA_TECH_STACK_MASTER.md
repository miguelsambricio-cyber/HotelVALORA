# HOTELVALORA — Tech Stack Master

> **Single source of truth** for every platform, API, SaaS, library, integration, database, deploy target, auth provider, analytics tool, payment system, map system and AI provider that touches HotelVALORA.
>
> If a technology doesn't appear here, it's not in the stack.

**Last refreshed:** 2026-05-11 (evening — Supabase initial schema applied to production project: 32 tables live + RLS + advisor warnings closed).

**Live URL:** [hotelvalora.com](https://hotelvalora.com)
**Repo:** `github.com/miguelsambricio-cyber/HotelVALORA`
**Supabase project ref:** `twebgqutuqgonabvhzjk` (eu-central — Frankfurt, Postgres 17)

---

## Status legend

| Symbol | Meaning |
|---|---|
| 🟢 | Working — wired end-to-end, production-tested |
| 🟡 | Partial — wired but inert (env missing, mock data, or one side of the integration outstanding) |
| 🔴 | Not configured — listed but not started |
| ⚫ | Blocked — needs an external decision / credential / contract |
| 🔵 | Planned — on the roadmap, not yet started |

---

## Master table

### Frontend / Runtime

| Service | Category | Status | Environment | Notes | Next action |
|---|---|---|---|---|---|
| Next.js 14.2.14 | Framework | 🟢 | Local + Vercel | App Router, TS, RSC | — |
| React 18.3.1 | UI lib | 🟢 | Local + Vercel | — | — |
| TypeScript 5.9.3 | Language | 🟢 | Local + Vercel | `tsc --noEmit` clean | — |
| Tailwind CSS 3.4.13 | Styles | 🟢 | Local + Vercel | Forest palette + design tokens | — |
| TanStack Query 5.56.2 | Server state | 🟢 | Local + Vercel | Used in /review surface only today | Wire to /library + /report (Phase 3) |
| TanStack Table 8.20.5 | Data tables | 🟢 | Local + Vercel | Used in /review queues | — |
| Zustand 5.0.0 | Local state | 🟢 | Local + Vercel | auth, investment, library stores | Drop auth store when Supabase Auth wires |
| React Hook Form 7.53 + Zod 3.23 | Forms | 🟢 | Local + Vercel | — | — |
| Radix UI primitives | Primitives | 🟢 | Local + Vercel | Dialog, Switch, Tabs, Tooltip | — |
| lucide-react 0.447 | Icons | 🟢 | Local + Vercel | — | — |
| sonner 1.5 | Toasts | 🟢 | Local + Vercel | — | — |
| recharts 2.12.7 | Charts | 🟢 | Local + Vercel | Sparklines, KPI charts | — |
| date-fns 4.1 / numeral 2.0 | Formatters | 🟢 | Local + Vercel | — | — |

### Maps

| Service | Category | Status | Environment | Notes | Next action |
|---|---|---|---|---|---|
| Mapbox GL 3.23.1 + react-map-gl 8.1 | Map provider | 🟢 | Local + Vercel | CompSet + Market Overview maps | — |
| Mapbox token | Credentials | 🟢 | `NEXT_PUBLIC_MAPBOX_TOKEN` (Vercel) | Domain-restricted | — |
| Mock institutional grayscale map | Library map | 🟡 | Local + Vercel | Static image + percentage markers | Swap to Mapbox in Phase 4 (see `docs/architecture/map-engine.md`) |

### Database / Backend

| Service | Category | Status | Environment | Notes | Next action |
|---|---|---|---|---|---|
| Supabase project | Postgres + Storage | 🟢 | Project `twebgqutuqgonabvhzjk` provisioned, schema applied (32 tables · RLS · 2 migrations registered), env wired Vercel | Migration `20260511015418_initial_schema` + `harden_security_definer_functions` applied via MCP; only intentional advisory left (`payment_events` service-role only) | Configure Storage buckets · regenerate `apps/web/src/lib/supabase/types.ts` via CLI |
| Supabase clients (`lib/supabase/*`) | SDK layer | 🟢 | Local + Vercel | Browser + server + middleware + admin + auth-helpers + full `Database` type | Auto-regenerate `types.ts` with CLI when access token lands |
| Supabase Auth | Identity | 🔴 | Project provisioned, no providers configured | Future home of OAuth + magic links | Defer to Phase 3 (Auth.js owns OAuth today) |
| Supabase Storage | Object storage | 🔴 | Project provisioned, buckets NOT created | Planned: reports / pdfs / excel-uploads / renders / avatars | Configure buckets via dashboard |
| FastAPI (apps/api) | API | 🟡 | Local Docker only | Auth + valuations + imports built; only `/review` consumed today | Decide Phase 3: keep FastAPI vs. migrate to Supabase Edge Functions |
| PostgreSQL 16 (local Docker) | Dev DB | 🟢 | docker-compose | Powers FastAPI in dev | — |
| Alembic | Migrations (FastAPI side) | 🟢 | Local | Migrations 0001 → 0005 | Next: `0006` when needed |
| Redis 7 + Celery | Cache + queue | 🟡 | Docker dev | Wired for imports queue; no surface uses it yet | — |
| S3 / MinIO | Object storage (legacy) | 🔵 | Planned | Supabase Storage may absorb this | Decide alongside Phase 3 |

### Auth

| Service | Category | Status | Environment | Notes | Next action |
|---|---|---|---|---|---|
| Auth.js v5 (next-auth 5.0.0-beta.31) | Auth runtime | 🟡 | Local + Vercel | Scaffolded; gated by `AUTH_ENABLED` | Flip when OAuth credentials land |
| Google OAuth provider | OAuth | 🔴 | `GOOGLE_CLIENT_ID/SECRET` placeholders | Provider wired in `auth.config.ts` | Create app at https://console.cloud.google.com/apis/credentials |
| LinkedIn OAuth provider | OAuth | 🔴 | `LINKEDIN_CLIENT_ID/SECRET` placeholders | Provider wired | Create app at https://www.linkedin.com/developers/apps |
| Apple OAuth provider | OAuth | 🔴 | `APPLE_CLIENT_ID/SECRET` placeholders | Provider wired (JWT minting via .p8) | Create Service ID at https://developer.apple.com |
| Microsoft / Azure AD | OAuth | 🔵 | Disabled in registry | Future enterprise SSO | — |
| Mock Zustand auth store | Auth (dev only) | 🟢 | Local + Vercel | Email handle infers tier; survives Auth.js coexistence | Retire when Phase 3 wires Supabase adapter |

### Payments

| Service | Category | Status | Environment | Notes | Next action |
|---|---|---|---|---|---|
| Stripe | Subscriptions + checkout | 🔵 | Not installed | Schema has `public.subscriptions` ready (`docs/database/schema.sql`) | Defer to Phase 5; install `stripe` + `@stripe/stripe-js`, set up webhook handler at `/api/stripe/webhook` |

### Email

| Service | Category | Status | Environment | Notes | Next action |
|---|---|---|---|---|---|
| Resend SDK 6.12.3 | Transactional email | 🟢 | `RESEND_API_KEY` + `RESEND_FROM_EMAIL` set on Vercel | Library "Schedule a Tour" CTA fires real sends | Verify a custom domain to leave the sandbox |
| Resend sandbox sender (`onboarding@resend.dev`) | Sender | 🟡 | Vercel prod | Only delivers to the Resend account owner's inbox | Verify `hotelvalora.com` domain at https://resend.com/domains |

### Analytics

| Service | Category | Status | Environment | Notes | Next action |
|---|---|---|---|---|---|
| PostHog | Product analytics | 🔵 | Not installed | Planned: event tracking + funnels + session replay | Phase 5 — `pnpm add posthog-js`; install at `apps/web/src/components/providers.tsx` |
| Vercel Analytics | RUM | 🔴 | Not installed | Free with Vercel Hobby | Enable via Vercel dashboard → Analytics |

### Error tracking + observability

| Service | Category | Status | Environment | Notes | Next action |
|---|---|---|---|---|---|
| Sentry | Error monitoring | 🔵 | Not installed in `apps/web` | Backend `apps/api` has Sentry config; frontend pending | `pnpm add @sentry/nextjs`, instrument the app, set `SENTRY_DSN` |
| structlog (backend) | Logging | 🟢 | Local only | apps/api configured | — |

### AI

| Service | Category | Status | Environment | Notes | Next action |
|---|---|---|---|---|---|
| OpenAI | LLM | 🔵 | Not installed | Planned for AI renders + investment match scoring + chatbot | Phase 5 — wire via Vercel AI SDK |
| Anthropic / Claude | LLM | 🔵 | Not installed | Backup provider | — |
| Vercel AI Gateway | Provider routing | 🔵 | Not installed | Recommended when multi-provider lands | Use `@vercel/ai` |

### Deployment + CI/CD

| Service | Category | Status | Environment | Notes | Next action |
|---|---|---|---|---|---|
| Vercel | Hosting | 🟢 | Production active | Project `hotelvalora`, root `apps/web`, scope `miguel-sambricio-s-projects` | — |
| Vercel custom domain | DNS | 🟢 | `hotelvalora.com` + `www.hotelvalora.com` aliased | — | — |
| GitHub (origin) | VCS | 🟢 | `main` branch | All commits pushed; no auto-deploy → CLI `vercel deploy --prod --yes` | Consider GitHub auto-deploy if team grows |
| GitHub Actions | CI | 🔴 | Not configured | Local `pnpm typecheck` + `pnpm build` is the only gate today | Phase 5 — add typecheck + lint workflow |

### Document I/O

| Service | Category | Status | Environment | Notes | Next action |
|---|---|---|---|---|---|
| Excel ingestion (services/data_pipeline) | ETL | 🟡 | Local CLI + apps/api endpoint built | No frontend upload surface yet | Settings → Imports surface — Phase 3 |
| CoStar normaliser | ETL | 🟡 | Local CLI + apps/api endpoint built | No live API | Phase 3 frontend / Phase 5 API |
| PDF exports (`pdf-export.ts`) | Document gen | 🟡 | Local + Vercel | `window.print()` wrapper today | Phase 4 — server-side Puppeteer / react-pdf |

### Future data sources

| Service | Category | Status | Environment | Notes | Next action |
|---|---|---|---|---|---|
| CoStar (live API) | Comparable hotels | 🔵 | Not licensed | Workbook ingestion already supports manual exports | Phase 5 — license + webhook |
| STR | RevPAR / ADR / occupancy benchmarks | 🔵 | Not licensed | Investment scenarios use internal mock today | Phase 4 |
| Booking | OTA pricing | 🔵 | Not licensed | — | Phase 6 |
| Catastro (España) | Land registry | 🔵 | Public API | — | Phase 5 |
| CBRE | Transactions | 🔵 | Not licensed | — | Phase 6 |
| MSCI / Real Capital | Institutional comps | 🔵 | Not licensed | — | Phase 6 |

### Dev tools (external, not in the runtime stack)

| Tool | Use |
|---|---|
| Stitch | UI design ref — every Library page started in a Stitch HTML drop |
| Claude Code | This terminal — pair-programming + repo automation |
| ChatGPT / Claude | Ad-hoc design + code review |

---

## Cross-references

| Need | Doc |
|---|---|
| Per-service detail + tracking fields | `docs/infrastructure/INFRASTRUCTURE_MASTER_TRACKER.md` |
| Health dashboard (quick scan) | `docs/infrastructure/service-status.md` |
| Every env variable + safety | `docs/infrastructure/environment-variables.md` |
| Vercel + GitHub deploy state | `docs/infrastructure/deployment-status.md` |
| Per-service activation steps | `docs/infrastructure/integration-checklist.md` |
| Exposed secrets + rotation log | `docs/infrastructure/security-audit.md` |
| Architecture deep dive | `docs/architecture/*` |
| Phase roadmap | `docs/roadmap/master-roadmap.md` |
| Per-service integration dossier | `docs/integrations/{costar,str,excel-ingestion,supabase,resend}.md` |

---

## Maintenance contract

After EVERY new integration:

1. Add a row to the master table above
2. Update `INFRASTRUCTURE_MASTER_TRACKER.md` with the per-service detail
3. Update `service-status.md`
4. Update `environment-variables.md` if a new env var landed
5. Update `deployment-status.md` if Vercel env / deploy changed
6. Update `security-audit.md` if a new secret was introduced
7. Bump the **Last refreshed** date at the top of THIS file
8. Update `docs/roadmap/current-sprint.md` if it shipped this week
