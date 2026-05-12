import "server-only";

/**
 * Server-only redaction utility for log payloads, error objects, and
 * audit-row detail. Every path that could surface a credential — Vercel
 * function logs, structured audit rows, Sentry breadcrumbs — must run
 * its payload through redact() before persisting.
 *
 * Contract
 *   - Replaces values of known-credential keys with the literal
 *     '[REDACTED]'.
 *   - Operates recursively over objects and arrays.
 *   - Does NOT mutate the input — returns a deep clone.
 *   - Truncates raw strings longer than 2 KB to avoid accidentally
 *     persisting blobs that might contain credentials.
 */

const CREDENTIAL_KEY_PATTERNS: RegExp[] = [
  /password/i,
  /passwd/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /authorization/i,
  /cookie/i,
  /set-cookie/i,
  /session/i,
  /credential/i,
  /private[_-]?key/i,
  /\bbearer\b/i,
  /enc[_-]?key/i,
  /^iv$/i,
  /auth[_-]?tag/i,
  /ciphertext/i,
  /storage[_-]?state/i,
];

const MAX_STRING_LENGTH = 2048;
const REDACTED = "[REDACTED]";

function isCredentialKey(key: string): boolean {
  return CREDENTIAL_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function redactString(value: string): string {
  if (value.length > MAX_STRING_LENGTH) {
    return `${value.slice(0, MAX_STRING_LENGTH)}…[truncated]`;
  }
  return value;
}

export function redact<T>(input: T): T {
  if (input === null || input === undefined) return input;
  if (typeof input === "string") return redactString(input) as unknown as T;
  if (typeof input === "number" || typeof input === "boolean") return input;
  if (input instanceof Date) return new Date(input.getTime()) as unknown as T;
  if (Buffer.isBuffer(input)) return REDACTED as unknown as T;
  if (Array.isArray(input)) {
    return input.map((item) => redact(item)) as unknown as T;
  }
  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (isCredentialKey(key)) {
        out[key] = REDACTED;
        continue;
      }
      out[key] = redact(value);
    }
    return out as unknown as T;
  }
  // function / symbol / bigint — drop.
  return REDACTED as unknown as T;
}

/**
 * Sanitise an Error for safe persistence. Returns the message + name +
 * stack with credential-shaped substrings removed. Use this BEFORE
 * writing to last_refresh_error / last_login_error / audit.error.
 */
export function redactError(err: unknown): string {
  if (!err) return "unknown error";
  let raw: string;
  if (err instanceof Error) {
    raw = `${err.name}: ${err.message}`;
  } else if (typeof err === "string") {
    raw = err;
  } else {
    try {
      raw = JSON.stringify(redact(err));
    } catch {
      raw = "unserialisable error";
    }
  }
  // Strip anything that looks like a Bearer / Basic auth header value.
  raw = raw.replace(/(Authorization:\s*Bearer\s+)\S+/gi, `$1${REDACTED}`);
  raw = raw.replace(/(Authorization:\s*Basic\s+)\S+/gi, `$1${REDACTED}`);
  // Strip cookie-like long token tails.
  raw = raw.replace(/(cookie[^=]*=)([^\s;,]{6,})/gi, `$1${REDACTED}`);
  // Length cap.
  return redactString(raw);
}
