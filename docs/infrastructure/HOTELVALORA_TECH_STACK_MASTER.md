# HOTELVALORA — Tech Stack Master

> **Single source of truth** for every platform, API, SaaS, library, integration, database, deploy target, auth provider, analytics tool, payment system, map system and AI provider that touches HotelVALORA.
>
> If a technology doesn't appear here, it's not in the stack.

**Last refreshed:** 2026-05-11 (AI Operations Layer foundation — schema + **10 agents declared** in 4 tiers including CEO / Orchestration (Tier 0 supervisor) + 30 tools catalogued + 8 strategic + technical docs; Phase 2 agent runtime pending).

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
| Supabase project | Postgres + Storage | 🟢 | Project `twebgqutuqgonabvhzjk` provisioned, schema applied (32 tables · RLS · 5 migrations registered · Library demo seeded), env wired Vercel | Migrations `0001`–`0005` applied via MCP; only intentional advisory left (`payment_events` service-role only) | Realtime subscriptions on `valuations` to invalidate `libraryKeys.all` |
| Supabase clients (`lib/supabase/*`) | SDK layer | 🟢 | Local + Vercel | Browser + server + middleware + admin + auth-helpers + CLI-generated `Database` type. Barrel `index.ts` is browser-only by design; server-only modules import-direct from `./server`/`./admin`/`./auth-helpers` | — |
| TanStack Query (Library hooks) | Data layer | 🟢 | Local + Vercel | `useLibraryReports` / `useFavoriteValuationIds` / `useToggleFavorite` (5-min staleTime · optimistic mutations · queryKeys ready for realtime invalidation) | — |
| Library production data | Domain | 🟢 | DB seeded via migration `0005` | Six institutional showcases (visibility=public) + 2 active top_promote rows + demo user with favourites | Replace anonymous fallback with real Supabase Auth |
| Supabase Auth | Identity | 🔴 | Project provisioned, no providers configured | Future home of OAuth + magic links | Defer to Phase 3 (Auth.js owns OAuth today) |
| Supabase Storage | Object storage | 🟢 | 5 buckets provisioned via migration `0003` (`reports`/`pdfs`/`excel-uploads`/`renders`/`avatars`) with 19 own-namespace RLS policies on `storage.objects` | Path convention `{bucket}/{auth.uid}/…`; private buckets served via signed URLs minted server-side; avatars on public CDN | Wire upload UI to `lib/supabase/storage.ts` when Settings → Avatar / Reports → Attachments / Imports → Excel surfaces ship |
| Supabase Storage helpers | Frontend | 🟢 | `apps/web/src/lib/supabase/storage.ts` (browser) + `storage-server.ts` (signed URLs, admin moves/deletes) | Typed against generated `Database` shape; `BUCKETS` catalog mirrors migration 0003 | — |
| FastAPI (apps/api) | API | 🟡 | Local Docker only | Auth + valuations + imports built; only `/review` consumed today | Decide Phase 3: keep FastAPI vs. migrate to Supabase Edge Functions |
| PostgreSQL 16 (local Docker) | Dev DB | 🟢 | docker-compose | Powers FastAPI in dev | — |
| Alembic | Migrations (FastAPI side) | 🟢 | Local | Migrations 0001 → 0005 | Next: `0006` when needed |
| Redis 7 + Celery | Cache + queue | 🟡 | Docker dev | Wired for imports queue; no surface uses it yet | — |
| S3 / MinIO | Object storage (legacy) | 🔵 | Planned | Supabase Storage may absorb this | Decide alongside Phase 3 |

### Auth

| Service | Category | Status | Environment | Notes | Next action |
|---|---|---|---|---|---|
| Supabase Auth | Auth runtime | 🟢 | Activated end-to-end · `AUTH_ENABLED=true` + `NEXT_PUBLIC_AUTH_ENABLED=true` on Vercel production | Google OAuth dance + `/auth/callback` + `useAuth()` adapter all live. Public Beta Mode: `PROTECTED_PREFIXES=[]` in middleware so no route blocks anonymous traffic | Submit Google OAuth consent for verification (Testing → Production); add prefixes back when private surfaces land |
| Google OAuth provider | OAuth | 🟢 | OAuth client `1023396989060-…apps.googleusercontent.com`; credentials inside Supabase Dashboard | `/auth/v1/settings` returns `"google": true`; redirect URI = `https://twebgqutuqgonabvhzjk.supabase.co/auth/v1/callback`; URL allowlist on Supabase includes prod + localhost + Vercel preview wildcard | Submit consent screen for verification to allow any Google user |
| LinkedIn OAuth provider | OAuth | 🔴 | Not wired in Supabase Dashboard | Code maps to Supabase's `linkedin_oidc` provider | Enable LinkedIn in Supabase Dashboard with OAuth credentials |
| Apple OAuth provider | OAuth | 🔴 | Not wired in Supabase Dashboard | Apple Developer Account required ($99/yr) | Enable Apple in Supabase Dashboard with Service ID + .p8 |
| Microsoft / Azure AD | OAuth | 🔵 | Future enterprise SSO | Code maps to Supabase's `azure` provider | — |
| Auth.js v5 (next-auth 5.0.0-beta.31) | Auth scaffold (inert) | 🔵 | Local + Vercel | Files kept for future non-OAuth flows (magic links, credentials, SAML). Today: no consumer | Reactivate only if a flow needs Auth.js' provider catalogue |
| Mock Zustand auth store | Auth (fallback) | 🟢 | Local + Vercel | Survives Supabase Auth coexistence — drives `useAuth()` when `NEXT_PUBLIC_AUTH_ENABLED` is unset/false | Stays — used by dev + preview deploys without OAuth |
| Middleware route protection | Edge | 🟢 | Local + Vercel | Refreshes Supabase session cookie on every request; redirects unauthenticated requests on protected paths when `AUTH_ENABLED=true` | — |

### Payments

| Service | Category | Status | Environment | Notes | Next action |
|---|---|---|---|---|---|
| Stripe | Subscriptions + checkout | 🔵 | Not installed | Schema has `public.subscriptions` ready (`docs/database/schema.sql`) | Defer to Phase 5; install `stripe` + `@stripe/stripe-js`, set up webhook handler at `/api/stripe/webhook` |

### Email

| Service | Category | Status | Environment | Notes | Next action |
|---|---|---|---|---|---|
| Resend SDK 6.12.3 | Transactional email | 🟢 | `RESEND_API_KEY` + `RESEND_FROM_EMAIL` set on Vercel | Singleton `getResend()` (`import "server-only"`) + Zod-validated server action `sendTourRequestAction` + typed HTML/text template. Library "Schedule a Tour" CTA fires real sends in production. Audited 2026-05-11 | Verify a custom domain to leave the sandbox |
| Resend production sender (`noreply@hotelvalora.com`) | Sender | 🟢 | Vercel prod | `hotelvalora.com` verified in Resend (DKIM + SPF in Namecheap DNS) since 2026-05-11. Delivers to any recipient — sandbox restrictions cleared | — |

### Analytics

| Service | Category | Status | Environment | Notes | Next action |
|---|---|---|---|---|---|
| PostHog | Product analytics | 🔵 | Not installed | Planned: event tracking + funnels + session replay | Phase 5 — `pnpm add posthog-js`; install at `apps/web/src/components/providers.tsx` |
| Vercel Analytics 2.0.1 | RUM + page-view tracking | 🟢 | Installed in `apps/web` 2026-05-11 · `<Analytics />` mounted in root layout | Cookie-free, GDPR-compliant; auto-enabled on production deploys via Vercel. No env vars needed | — |

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

### Hospitality Intelligence Engine

| Service | Category | Status | Environment | Notes | Next action |
|---|---|---|---|---|---|
| Intelligence schema (9 tables) | Database | 🟢 | Applied via migration `0006` on 2026-05-11 | `market_news`, `hotel_transactions`, `hotel_projects`, `investors`, `operators`, `sources`, `news_entities`, `news_tags`, `news_ingestion_runs`. RLS public-read; service-role writes only | — |
| Sources registry (10 seeded) | Data | 🟢 | Live in `public.sources` | Hosteltur, Alimarket, Expansión, HospitalityNet, Hotel News Now, CoStar News, THP, HVS, Skift, Reuters — with reliability scores | Expand to ~50 in Phase 3 |
| Daily ingestion cron | Pipeline | 🔵 | Not yet wired | Phase 2 — Vercel Cron at `48 7 * * *` UTC = 08:48 Europe/Madrid (CET) / 09:48 (CEST). Route handler at `apps/web/src/app/api/cron/hospitality-intel/route.ts` pending | Phase 2 implementation |
| RSS / scrape / API fetchers | Pipeline | 🔵 | Not yet wired | Architecture designed in `docs/intelligence/ingestion-pipeline.md` | Phase 2 |
| AI summaries + embeddings | Enrichment | 🔵 | Not yet wired | Phase 4 — LLM via Vercel AI Gateway, embeddings in `pgvector` | Phase 4 |
| Investor/operator dossier surfaces | UI | 🔵 | Not yet built | Phase 5 — `/intelligence/...` routes consume the corpus | Phase 5 |
| Alerts engine | UX | 🔵 | Not yet built | Phase 6 — Supabase Realtime broadcast + Resend dispatch | Phase 6 |

### AI Operations Layer

| Service | Category | Status | Environment | Notes | Next action |
|---|---|---|---|---|---|
| AI Ops schema (7 tables) | Database | 🟢 | Applied via migration `0007` on 2026-05-11 | `ai_agents`, `ai_agent_runs`, `ai_events`, `ai_agent_permissions`, `ai_memory`, `ai_tools`, `ai_human_review`. RLS: public-read on catalogue tables; service-role only on operational ones | — |
| 10 agents declared (4 tiers) | Agent registry | 🟢 | Seeded in `public.ai_agents` | **Tier 0:** ceo (orchestration) · **Tier 1:** market_intelligence · data_ingestion · qa_monitoring · **Tier 2:** underwriting · report_generation · **Tier 3:** crm_dealflow · customer_success · cmo · cfo (all `status='planned'`, `enabled=false`) | Implement Tier 1 agents in Phase 2; CEO Agent in Phase 3 |
| 30 tools catalogue | Tool catalogue | 🟢 | Seeded in `public.ai_tools` | Supabase / Resend / Stripe / Vercel / LinkedIn / X / WhatsApp / Puppeteer / PagerDuty + 10 CEO-Agent supervisory tools (`ai_ops.*`, advisors, audit_logs, github commits) — destructive flags + human-approval flags pre-declared | — |
| CEO / Orchestration Agent (Tier 0) | Supervisor / orchestrator | 🔵 | Not yet implemented | Operations command center, AI chief-of-staff — supervises every other agent. Hourly + daily supervisory cycles. NOT a chatbot. Lands in Phase 3 alongside reactive orchestrator + pgvector + admin dashboard | Phase 3 |
| Agent runtime (`invoke()`) | Runtime | 🔵 | Not yet implemented | Phase 2 — `apps/web/src/lib/ai-agents/core/runtime.ts` per `ai-agent-architecture.md` | Phase 2 implementation |
| Tier 1 agents (Market Intelligence · Data Ingestion · QA / Monitoring) | Agents | 🔵 | Not yet implemented | Phase 2 next-sprint candidates — lowest risk, highest leverage | Phase 2 |
| Tier 2 agents (Underwriting · Report Generation) | Agents | 🔵 | Not yet implemented | Phase 4 — requires underwriting UX shell + Mapbox swap first | Phase 4 |
| Tier 3 agents (CRM/Dealflow · CS · CMO · CFO) | Agents | 🔵 | Not yet implemented | Phases 5–6 — only after PMF signals + revenue volume | Phase 5+ |
| pgvector memory | Memory | 🔵 | Not yet enabled | Phase 3 — separate migration enables extension + adds `ai_memory.embedding vector(1536)` | Phase 3 |
| Realtime event bus | Orchestration | 🔵 | Not yet wired | Phase 3 — Supabase Realtime subscriptions on `ai_events` for sub-second fan-out | Phase 3 |
| Admin dashboard `/admin/ai-ops` | UI | 🔵 | Not yet built | Phase 3+ — surfaces runs, events, memory, KPIs, human-review queue | Phase 3 |
| LLM provider (OpenAI / Anthropic via Vercel AI Gateway) | LLM | 🔵 | Not yet installed | Phase 2 — wire via `@ai-sdk/openai` for first agent (Market Intelligence) summaries | Phase 2 |

### Deployment + CI/CD

| Service | Category | Status | Environment | Notes | Next action |
|---|---|---|---|---|---|
| Vercel | Hosting | 🟢 | Production active | Project `hotelvalora`, root `apps/web`, scope `miguel-sambricio-s-projects` | — |
| Vercel custom domain | DNS | 🟢 | `hotelvalora.com` + `www.hotelvalora.com` aliased | — | — |
| GitHub (origin) | VCS | 🟢 | `main` branch | Connected to Vercel via `vercel git connect`. Auto-deploy: push to `main` → production; push to any other ref → preview. CLI `vercel deploy --prod --yes` still works as escape hatch | — |
| Vercel-GitHub auto-deploy | CI/CD | 🟢 | All branches | Vercel runs `pnpm build` on every push; failed builds block the deploy and post a failed commit status. Preview URLs aliased per commit SHA | — |
| GitHub Actions | CI | 🔵 | Not configured | Vercel build is the only gate today — sufficient. GitHub Actions only useful if separating typecheck/lint as required checks distinct from build | Phase 5 if needed |

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
