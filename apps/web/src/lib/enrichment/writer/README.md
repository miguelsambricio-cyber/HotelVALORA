# Writer Module

Persistence layer for the canonical hotel enrichment pipeline.

**Strategic role:** the writer makes the institutional graph durable. Everything upstream (registries, providers, dedup, confidence, orchestrator) operates in memory; this layer translates orchestrator output into the row-set that lands in Supabase tables defined by migration 0024.

## Two implementations, one plan

Both writers consume the same `IntendedWrite[]` plan (`intended-writes.ts`):

| Writer | When | What it does |
|---|---|---|
| `DryRunWriter` | Phase 1 (now) | Captures the intended writes for inspection. No DB calls. Used in operator review, demos, automated golden-file tests. |
| `SupabaseWriter` | Phase A+ | Executes the writes against the real Supabase project. Ordered inserts with per-write error reporting. |

Same plan, two destinations. Adding a new destination (e.g., dual-write to an analytics warehouse) is one new implementation of the same `EnrichmentWriter` interface.

## Clean interface-swap invariant (operator priority #1 for M5)

The orchestrator (`runEnrichmentJob`) never imports from this module. It consumes an `InMemoryCanonicalStore` exclusively. The Supabase integration lives in the **worker layer** (Phase 3+), which does:

```ts
const bk = blockKey(candidate);
const seededStore = await seedFromBlockKey(supabaseClient, bk);
const ctx = { ...baseCtx, canonicalStore: seededStore };
const result = await runEnrichmentJob(job, ctx);
const report = await writer.persist(result, runId);
```

That seeding-then-running pattern preserves the orchestrator's synchronous canonical-store interface AND the async nature of Supabase queries.

## File layout

```
writer/
  types.ts                       IntendedWrite taxonomy · WriterReport · EnrichmentWriter
  intended-writes.ts             planIntendedWrites(jobResult, ctx) → IntendedWrite[]
                                 6-step ordered plan:
                                   1. source_record.insert
                                   2. canonical.upsert
                                   3. duplicate_candidate.insert
                                   4. field_provenance.insert × N
                                   5. audit_event × M
                                   6. enrichment_run.update
  dry-run-writer.ts              DryRunWriter — captures for review
  supabase-canonical-store.ts    Read-side: seedFromBlockKey ·
                                 seedFromCandidate · loadByExternalId
  supabase-writer.ts             Write-side: SupabaseWriter — ordered
                                 inserts against the live client
  index.ts                       barrel
  README.md                      this file
```

## Transaction model

Per-job writes are ordered: source_record → canonical → duplicate_candidate → provenance → audit → run-update. Failures in later steps don't roll back earlier ones (Supabase REST limitation); the report captures errors per-write so the caller can decide replay strategy.

**Phase 3+ enhancement:** migrate the hot path to a `pg-rpc` function that does the full row-set in a single transaction. The plan stays the same; only the executor changes.

## What the writer does NOT do

- It does not fetch source data (provider layer).
- It does not run dedup or confidence math (those produce the `JobExecutionResult` consumed here).
- It does not enforce rate limits or retries (worker layer).
- It does not own `audit_log` schema — that lives in `apps/api` (migration 0005). The Supabase writer's `audit_event` insertion shape is best-effort; adapt at integration time.

## Audit completeness

Every canonical mutation produces an `audit_event` write per arch doc §11.4. Conflicts that route to the review queue also produce an `audit_event` of type `hotel.canonical.field_conflict_routed_to_review` — so the curator can trace every decision, automated or human.
