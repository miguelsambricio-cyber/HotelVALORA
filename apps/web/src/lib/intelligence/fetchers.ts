import "server-only";
import type { RawNewsItem, SourceRow } from "./types";

/**
 * Lean RSS reader. We deliberately avoid taking on a third-party RSS
 * library — the corpus is six feeds, all UTF-8, all standard RSS 2.0
 * / Atom. A regex-based extractor here is ~80 LOC and gives us full
 * control over what we accept.
 *
 * Scrape + API sources (alimarket, costar-news, hotelnewsnow, thp-news)
 * are stubbed in Phase 2 — they return empty arrays + log a `skipped`
 * outcome. They land in a future migration / fetcher when their per-
 * source contracts are confirmed.
 */

const USER_AGENT =
  "HotelVALORA-Intelligence/0.1 (+https://hotelvalora.com/intelligence)";
const FETCH_TIMEOUT_MS = 20_000;

async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: ctl.signal,
      headers: {
        "user-agent": USER_AGENT,
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } finally {
    clearTimeout(t);
  }
}

// ── XML helpers — small, defensive, no dependencies ─────────────────────

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function stripCdata(s: string): string {
  const m = s.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return m ? m[1] : s;
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
}

function extractTag(scope: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i");
  const m = scope.match(re);
  if (!m) return undefined;
  return decodeEntities(stripCdata(m[1].trim()));
}

function extractAttr(scope: string, tag: string, attr: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*\\b${attr}=["']([^"']+)["'][^>]*/?>`, "i");
  const m = scope.match(re);
  return m ? decodeEntities(m[1]) : undefined;
}

function* splitItems(xml: string, itemTag: "item" | "entry"): Generator<string> {
  const open = new RegExp(`<${itemTag}(?:\\s[^>]*)?>`, "gi");
  let m: RegExpExecArray | null;
  while ((m = open.exec(xml))) {
    const close = `</${itemTag}>`;
    const end = xml.indexOf(close, m.index);
    if (end === -1) break;
    yield xml.slice(m.index, end + close.length);
  }
}

// ── Parsers ─────────────────────────────────────────────────────────────

function parseRss(xml: string, source: SourceRow): RawNewsItem[] {
  const out: RawNewsItem[] = [];
  for (const block of splitItems(xml, "item")) {
    const title = extractTag(block, "title");
    const link = extractTag(block, "link") || extractAttr(block, "link", "href");
    if (!title || !link) continue;
    const summary =
      extractTag(block, "description") ||
      extractTag(block, "summary") ||
      extractTag(block, "content:encoded");
    const pubDate = extractTag(block, "pubDate") || extractTag(block, "dc:date");
    out.push({
      source_id: source.id,
      source_slug: source.slug,
      title: stripTags(title).slice(0, 500),
      url: link.trim(),
      summary: summary ? stripTags(summary).slice(0, 2000) : undefined,
      published_at: pubDate ? toIsoOrUndefined(pubDate) : undefined,
      language: source.language,
      region: source.region,
      raw: { source_slug: source.slug, format: "rss" },
    });
  }
  return out;
}

function parseAtom(xml: string, source: SourceRow): RawNewsItem[] {
  const out: RawNewsItem[] = [];
  for (const block of splitItems(xml, "entry")) {
    const title = extractTag(block, "title");
    const link = extractAttr(block, "link", "href") || extractTag(block, "link");
    if (!title || !link) continue;
    const summary = extractTag(block, "summary") || extractTag(block, "content");
    const pubDate = extractTag(block, "updated") || extractTag(block, "published");
    out.push({
      source_id: source.id,
      source_slug: source.slug,
      title: stripTags(title).slice(0, 500),
      url: link.trim(),
      summary: summary ? stripTags(summary).slice(0, 2000) : undefined,
      published_at: pubDate ? toIsoOrUndefined(pubDate) : undefined,
      language: source.language,
      region: source.region,
      raw: { source_slug: source.slug, format: "atom" },
    });
  }
  return out;
}

function toIsoOrUndefined(s: string): string | undefined {
  const t = Date.parse(s);
  if (!Number.isFinite(t)) return undefined;
  return new Date(t).toISOString();
}

// ── Public surface ──────────────────────────────────────────────────────

export async function fetchRss(source: SourceRow): Promise<RawNewsItem[]> {
  if (!source.rss_url) {
    throw new Error(`source ${source.slug} has no rss_url`);
  }
  const res = await safeFetch(source.rss_url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${source.rss_url}`);
  }
  const xml = await res.text();
  const isAtom = /<feed[\s>]/i.test(xml.slice(0, 500));
  return isAtom ? parseAtom(xml, source) : parseRss(xml, source);
}

/**
 * Dispatcher. Phase 2 implements RSS only. Scrape + API sources return
 * empty arrays with a "skipped" reason so the run row reflects intent
 * — they'll get their own fetchers in a future migration.
 */
export async function fetchForSource(
  source: SourceRow,
): Promise<{ items: RawNewsItem[]; note?: string }> {
  if (!source.enabled) return { items: [], note: "source_disabled" };
  switch (source.ingestion_kind) {
    case "rss":
      if (!source.rss_url) {
        return { items: [], note: "rss_url_missing" };
      }
      return { items: await fetchRss(source) };
    case "scrape":
      return { items: [], note: "scrape_not_implemented_phase2" };
    case "api":
      return { items: [], note: "api_not_implemented_phase2" };
    case "manual":
      return { items: [], note: "manual_only" };
    default:
      return { items: [], note: `unknown_kind:${source.ingestion_kind}` };
  }
}
