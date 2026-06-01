import { NextResponse } from "next/server";
import { loadSearchCorpus } from "@/lib/hotels/corpus-reader";

/**
 * A1 · serves the full slim hotel corpus (226) ONCE to the client.
 *
 * D1 architecture: the client fetches this once on first search, caches it,
 * and filters LOCALLY (instant · no per-keystroke round-trip). When the corpus
 * outgrows local filtering, this same route flips to accept `?q=` + debounce
 * and return only matches — the client contract (`searchHotels`) stays the same.
 *
 * `force-dynamic` so the Supabase read never runs at build time (local/CI env
 * has blank anon keys → build-time eval would throw). The reader caches at
 * module scope, so this is one query per server process regardless of hits.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const corpus = await loadSearchCorpus();
    return NextResponse.json(corpus);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "corpus read failed" },
      { status: 500 },
    );
  }
}
