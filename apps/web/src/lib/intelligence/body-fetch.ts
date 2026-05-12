import "server-only";

/**
 * Article-body fetcher. Pulls the full HTML for an article URL — with
 * optional cookies for paywalled sources — and extracts a clean text
 * body suitable for full-text categorisation + audit storage.
 *
 * Strategy
 *   1. Fetch with timeout + standard browser-ish headers.
 *   2. Try each recipe.bodySelectors entry · first non-empty match wins.
 *   3. Fall back to the raw <body>…</body> contents stripped of script /
 *      style / nav / footer when no selector matches.
 *   4. Truncate to MAX_BODY_BYTES (65 000) so a single oversized page
 *      can't blow up market_news rows.
 *
 * We deliberately do NOT use a third-party DOM parser — the corpus is
 * narrow (handful of news sites) and the regex extractor below covers
 * the canonical "main content lives inside <article>" pattern. When a
 * site needs more sophistication, add a per-source extractor here.
 */

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const ACCEPT_LANG = "es-ES,es;q=0.9,en;q=0.8";
const FETCH_TIMEOUT_MS = 25_000;
const MAX_BODY_BYTES = 65_000;

export interface BodyFetchResult {
  status: number;
  /** Raw HTML length in bytes (before extraction). */
  htmlLength: number;
  /** Extracted clean text body · empty when nothing reasonable was found. */
  body: string;
  /** Which selector matched, or "fallback" when raw <body> was used. */
  via: string;
}

export async function fetchArticleBody(
  url: string,
  cookieHeader: string,
  selectors: string[],
): Promise<BodyFetchResult> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": ACCEPT_LANG,
    };
    if (cookieHeader) headers.cookie = cookieHeader;
    const res = await fetch(url, {
      headers,
      signal: ctl.signal,
      cache: "no-store",
      redirect: "follow",
    });
    const html = await res.text();
    const extracted = extractBody(html, selectors);
    return {
      status: res.status,
      htmlLength: html.length,
      body: truncate(extracted.text, MAX_BODY_BYTES),
      via: extracted.via,
    };
  } catch (err) {
    return {
      status: 0,
      htmlLength: 0,
      body: "",
      via: err instanceof Error ? `error:${err.message.slice(0, 80)}` : "error",
    };
  } finally {
    clearTimeout(t);
  }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n\n[truncated to ${max} bytes]`;
}

// ── HTML extractors ─────────────────────────────────────────────────────────

const STRIP_BLOCKS = /<(?:script|style|noscript|template|svg|iframe|nav|footer|aside|form)[^>]*>[\s\S]*?<\/(?:script|style|noscript|template|svg|iframe|nav|footer|aside|form)>/gi;
const COMMENT = /<!--[\s\S]*?-->/g;
const TAGS = /<[^>]+>/g;
const ENTITIES_RE = /&(?:amp|lt|gt|quot|apos|nbsp|#(?:\d+|x[0-9a-f]+));/gi;

function decodeEntities(s: string): string {
  return s.replace(ENTITIES_RE, (m) => {
    if (m === "&amp;") return "&";
    if (m === "&lt;") return "<";
    if (m === "&gt;") return ">";
    if (m === "&quot;") return '"';
    if (m === "&apos;") return "'";
    if (m === "&nbsp;") return " ";
    const num = m.match(/^&#(\d+);$/);
    if (num) return String.fromCodePoint(Number(num[1]));
    const hex = m.match(/^&#x([0-9a-f]+);$/i);
    if (hex) return String.fromCodePoint(parseInt(hex[1], 16));
    return m;
  });
}

function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(STRIP_BLOCKS, " ")
      .replace(COMMENT, " ")
      .replace(TAGS, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

/**
 * Try each selector in order. Supports:
 *   - "article" · finds the first <article>…</article> block
 *   - "main"    · finds the first <main>…</main> block
 *   - "tag.class" or "[class*='foo']" · finds the first element with that
 *     class fragment. Pure regex · not a real CSS engine, intentionally.
 *
 * Returns the first non-empty match · falls back to <body> contents.
 */
function extractBody(html: string, selectors: string[]): { text: string; via: string } {
  for (const sel of selectors) {
    const block = matchSelector(html, sel);
    if (block) {
      const text = htmlToText(block);
      if (text.length >= 200) return { text, via: sel };
    }
  }
  // Fallback: strip head + sidebar/footer/nav, keep <body>
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;
  return { text: htmlToText(bodyHtml), via: "fallback" };
}

function matchSelector(html: string, selector: string): string | null {
  // Plain tag selector — "article" / "main" / "section"
  if (/^[a-z][a-z0-9]*$/i.test(selector)) {
    const re = new RegExp(`<${selector}[^>]*>([\\s\\S]*?)</${selector}>`, "i");
    const m = html.match(re);
    return m ? m[0] : null;
  }
  // [class*='foo'] attribute-contains selector
  const attrMatch = selector.match(/^\[class\*=['"]([^'"]+)['"]\]$/);
  if (attrMatch) {
    const fragment = attrMatch[1];
    const re = new RegExp(
      `<([a-z][a-z0-9]*)[^>]*\\sclass=['"][^'"]*${fragment.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}[^'"]*['"][^>]*>([\\s\\S]*?)</\\1>`,
      "i",
    );
    const m = html.match(re);
    return m ? m[0] : null;
  }
  // "tag.class" or "tag[attr*='...']" · also try a generic class selector
  const tagClassMatch = selector.match(/^([a-z][a-z0-9]*)?\.([\w-]+)$/);
  if (tagClassMatch) {
    const tag = tagClassMatch[1] || "[a-z][a-z0-9]*";
    const cls = tagClassMatch[2];
    const re = new RegExp(
      `<(${tag})[^>]*\\sclass=['"][^'"]*\\b${cls}\\b[^'"]*['"][^>]*>([\\s\\S]*?)</\\1>`,
      "i",
    );
    const m = html.match(re);
    return m ? m[0] : null;
  }
  // Descendant selector "main .foo" · find <main>…</main> first, then recurse
  const descMatch = selector.match(/^([a-z][a-z0-9]*)\s+(.+)$/i);
  if (descMatch) {
    const outerTag = descMatch[1];
    const inner = descMatch[2];
    const outer = matchSelector(html, outerTag);
    if (!outer) return null;
    return matchSelector(outer, inner);
  }
  return null;
}
