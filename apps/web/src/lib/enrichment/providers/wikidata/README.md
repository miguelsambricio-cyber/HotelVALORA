# Wikidata Provider (Phase 1 dry-run)

Tier-F source. Used as **fourth fallback** after Booking → Google Places → hotel website. Sparse but high-signal — Madrid hotel coverage estimated < 10% of properties, but for those it covers, `year_opened` and `ownership_structure` come from a curated knowledge graph.

## When this provider is invoked

The orchestrator's fallback dispatcher emits a Wikidata job when:

- `wikidata_qid` is missing (always attempt one batched discovery query per Madrid sweep)
- `year_opened` could not be obtained from hotel-website (next in the chain)
- `ownership_structure` is missing AND the hotel is institutional-tier (gold candidates only)

## Discipline

- 1 req/s hard cap (Wikidata policy).
- Batched SPARQL queries preferred — 50+ hotels per call when discovering QIDs.
- User-Agent identifies HotelVALORA + contact email.
- No paid tier — public endpoint only.

## Field authority

| Field | Confidence | Why |
|---|---|---|
| `wikidata_qid` | 1.00 | Self-authoritative ID |
| `year_opened` (P571) | 0.65 | Well-curated when present |
| `ownership_structure` (P127) | 0.50 | Tier-F base |
| `operator_hint` (P137) | 0.50 | Tier-F base; routed to review for human disambiguation |

## Phase 4 live mode

To enable:
1. Set `WIKIDATA_USER_AGENT` env var (institutional identifier).
2. Implement `WikidataClient.execute(sparql)` HTTP POST path.
3. Wire 1 req/s rate limit.
4. Batch discovery query in `worker` layer.

No subscription needed. No cost. Just respect the policy.
