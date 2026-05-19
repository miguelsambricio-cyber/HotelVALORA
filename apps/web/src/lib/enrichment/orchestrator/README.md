# Orchestrator Module

End-to-end execution layer for the enrichment pipeline.

**Strategic role:** the orchestrator is the conductor — it ties together provider client, parser, mapper, dedup engine, confidence calculator, and conflict resolver into one safe execution path. Without it, each component is a useful library; with it, they are an institutional system.

## Phase 1 surface

- `runEnrichmentJob(job, ctx)` — single-job execution. Returns a `JobExecutionResult` with full audit trail.
- `InMemoryCanonicalStore` — simulates the canonical table for dry-run validation. Same interface as the Supabase-backed store that will replace it in Phase 3.
- Retry / DLQ policy — error classification, exponential backoff, jitter, max-attempt limits, circuit breaker per source.
- Dry-run mode — no DB writes, no real HTTP.

## Execution flow

```
EnrichmentJob
   │
   ▼
fetchSourceData (ctx.fetchSourceData — dry-run/fixture/live)
   │
   ▼
parseHotelData  (defensive parser)
   │
   ▼  if critical gap → DLQ (VALIDATION)
mapToCanonical  (uses brands/amenities/municipios/types registries)
   │
   ▼
evaluateCandidate (block-key dedup + composite scoring)
   │
   ├─ auto_merge / needs_review → resolveFieldConflict per field
   │                              (uses confidence calculator + overwrite policy)
   ▼
computeCoverage (TIER-0/1/2 counts)
   │
   ▼
decideOutcome → JobExecutionResult
```

## File layout

```
orchestrator/
  types.ts             EnrichmentJob · JobExecutionResult · ExecutionContext · ErrorClass
  retry-policy.ts      classifyError · decideRetryOrDlq · CircuitBreakerState
  in-memory-store.ts   InMemoryCanonicalStore (Phase 1 dry-run only)
  runner.ts            runEnrichmentJob — the conductor
  index.ts             barrel
  README.md            this file
```

## Outcomes

`JobOutcome` enumeration captures the institutional contract:

| Outcome | Meaning |
|---|---|
| `completed` | Canonical updated; TIER-2 ≥ 12; no conflicts. |
| `completed_with_warnings` | Canonical updated; ≥ 1 field conflict surfaced to review queue. |
| `fallback_required` | Canonical updated; TIER-2 < 12 — orchestrator should enqueue fallback dispatch jobs (Google Places / website / Wikidata). |
| `scheduled_retry` | Transient error; next attempt scheduled. |
| `routed_to_dlq` | Non-retryable error or max attempts reached. |
| `circuit_breaker_open` | Source temporarily halted; job rescheduled past breaker reset. |
| `dry_run_no_call` | Dry-run mode; fetch returned no data (expected). |
| `fixture_not_found` | Recorded-fixture mode; no fixture matched the job params. |

## Retry policy (sidecar §6.1)

Per-error-class table in `retry-policy.ts`. Exponential backoff with ±30% jitter. Hard limits:

| Error | Retries | Backoff base / cap |
|---|---|---|
| NETWORK | 6 | 2s / 60s |
| RATE_BURST | 6 | 30s / 5min |
| QUOTA_DAILY | 6 | 1h / 24h |
| AUTH / QUOTA_MONTHLY / PLAN_LIMIT | 0 (halt provider) | — |
| Most other terminals | 0 (DLQ) | — |

Circuit breaker per source: 5 consecutive 5xx → open 15min.

## What this module does NOT do

- It does not own the queue. The `EnrichmentJob` shape mirrors the `hotel_enrichment_job` table (migration 0024), but persistence is the writer's job.
- It does not enforce rate limits. The worker layer (Phase 3+) reads `rate_limit_state` and gates concurrency before calling the runner.
- It does not write `hotel_field_provenance` rows. Those land via the writer using the `JobExecutionResult.fieldOutcomes` trail.
- It does not handle scraping. Phase 4+ adds scraping providers behind the same client interface.

## Determinism

The runner is async only because `ctx.fetchSourceData` is async (real HTTP later). With injected fixtures and `ctx.now()` set to a fixed Date, results are fully reproducible to the field-outcome level. Useful for golden-file tests.
