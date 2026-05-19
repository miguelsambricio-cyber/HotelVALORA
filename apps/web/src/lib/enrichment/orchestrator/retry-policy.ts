/**
 * Retry / DLQ policy (v1).
 *
 * Translates errors into either a scheduled retry (with exp backoff +
 * jitter) or a terminal DLQ routing decision. Aligned with sidecar §6.
 *
 * Knobs:
 *   - Max attempts per error class
 *   - Base / cap for exponential backoff
 *   - Jitter ±30%
 *   - Circuit-breaker state (per source) — open after 5 consecutive 5xx
 *     for 15 minutes
 */

import type { ClassifiedError, ErrorClass, EnrichmentJob } from "./types";

// ───────────────────────────────────────────────────────────────────────────
// Per-error-class policy
// ───────────────────────────────────────────────────────────────────────────

interface ErrorPolicy {
  retryable: boolean;
  maxAttempts: number;
  /** Base delay in seconds; doubled per attempt up to `capSec`. */
  baseDelaySec: number;
  capDelaySec: number;
}

const ERROR_POLICIES: Readonly<Record<ErrorClass, ErrorPolicy>> = Object.freeze({
  NETWORK:           { retryable: true,  maxAttempts: 6, baseDelaySec: 2,    capDelaySec: 60 },
  RATE_BURST:        { retryable: true,  maxAttempts: 6, baseDelaySec: 30,   capDelaySec: 300 },
  QUOTA_DAILY:       { retryable: true,  maxAttempts: 6, baseDelaySec: 3600, capDelaySec: 86400 },
  QUOTA_MONTHLY:     { retryable: false, maxAttempts: 1, baseDelaySec: 0,    capDelaySec: 0 },
  AUTH:              { retryable: false, maxAttempts: 1, baseDelaySec: 0,    capDelaySec: 0 },
  PLAN_LIMIT:        { retryable: false, maxAttempts: 1, baseDelaySec: 0,    capDelaySec: 0 },
  BUDGET_EXCEEDED:   { retryable: true,  maxAttempts: 6, baseDelaySec: 600,  capDelaySec: 3600 },
  PAYLOAD_PARTIAL:   { retryable: false, maxAttempts: 1, baseDelaySec: 0,    capDelaySec: 0 },
  GEO_MISMATCH:      { retryable: false, maxAttempts: 1, baseDelaySec: 0,    capDelaySec: 0 },
  DUPLICATE:         { retryable: false, maxAttempts: 1, baseDelaySec: 0,    capDelaySec: 0 },
  STALE_LISTING:     { retryable: false, maxAttempts: 1, baseDelaySec: 0,    capDelaySec: 0 },
  ALIAS_DRIFT:       { retryable: false, maxAttempts: 1, baseDelaySec: 0,    capDelaySec: 0 },
  EMPTY_PAGE:        { retryable: false, maxAttempts: 1, baseDelaySec: 0,    capDelaySec: 0 },
  SCHEMA_DRIFT:      { retryable: false, maxAttempts: 1, baseDelaySec: 0,    capDelaySec: 0 },
  VALIDATION:        { retryable: false, maxAttempts: 1, baseDelaySec: 0,    capDelaySec: 0 },
  PARSE:             { retryable: false, maxAttempts: 1, baseDelaySec: 0,    capDelaySec: 0 },
  UNKNOWN:           { retryable: true,  maxAttempts: 3, baseDelaySec: 5,    capDelaySec: 60 },
});

// ───────────────────────────────────────────────────────────────────────────
// Backoff
// ───────────────────────────────────────────────────────────────────────────

/**
 * Exponential backoff with ±30% jitter, capped per policy.
 * Pure-deterministic when `rng` is provided (useful in tests).
 */
export function backoffSeconds(
  policy: ErrorPolicy,
  attempt: number,
  rng: () => number = Math.random,
): number {
  if (!policy.retryable) return 0;
  const exp = Math.min(policy.capDelaySec, policy.baseDelaySec * Math.pow(2, attempt - 1));
  const jitter = exp * (0.7 + rng() * 0.6); // ±30%
  return Math.floor(jitter);
}

// ───────────────────────────────────────────────────────────────────────────
// Classification helpers
// ───────────────────────────────────────────────────────────────────────────

/**
 * Best-effort error classifier. Real HTTP errors will arrive as
 * Response objects; for dry-run testing the caller can pass a raw
 * `ErrorClass` directly.
 */
export function classifyError(input: {
  errorClass?: ErrorClass;
  httpStatus?: number;
  retryAfterSec?: number;
  message?: string;
}): ClassifiedError {
  let cls: ErrorClass;
  if (input.errorClass) {
    cls = input.errorClass;
  } else if (input.httpStatus === 401 || input.httpStatus === 403) {
    cls = "AUTH";
  } else if (input.httpStatus === 429) {
    cls = input.retryAfterSec && input.retryAfterSec > 3600 ? "QUOTA_DAILY" : "RATE_BURST";
  } else if (input.httpStatus && input.httpStatus >= 500) {
    cls = "NETWORK";
  } else if (input.httpStatus === 404) {
    cls = "STALE_LISTING";
  } else {
    cls = "UNKNOWN";
  }
  const policy = ERROR_POLICIES[cls];
  return {
    class: cls,
    retryable: policy.retryable,
    message: input.message ?? `error_class=${cls}`,
    retryAfter: null,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Decision
// ───────────────────────────────────────────────────────────────────────────

export type RetryDecision =
  | { action: "retry"; nextAttemptAt: Date; delaySec: number; }
  | { action: "dlq";   reason: string }
  | { action: "halt";  reason: string };

export function decideRetryOrDlq(
  job: EnrichmentJob,
  err: ClassifiedError,
  now: Date = new Date(),
  rng: () => number = Math.random,
): RetryDecision {
  const policy = ERROR_POLICIES[err.class];
  // Non-retryable terminal errors go to DLQ immediately (except AUTH which
  // halts the whole provider — caller should escalate).
  if (!policy.retryable) {
    if (err.class === "AUTH" || err.class === "QUOTA_MONTHLY" || err.class === "PLAN_LIMIT") {
      return { action: "halt", reason: `provider_halt:${err.class}` };
    }
    return { action: "dlq", reason: `non_retryable:${err.class}` };
  }
  if (job.attemptCount + 1 >= policy.maxAttempts) {
    return { action: "dlq", reason: `max_attempts_reached:${err.class}:${policy.maxAttempts}` };
  }
  const delaySec = backoffSeconds(policy, job.attemptCount + 1, rng);
  const nextAttemptAt = new Date(now.getTime() + delaySec * 1000);
  return { action: "retry", nextAttemptAt, delaySec };
}

// ───────────────────────────────────────────────────────────────────────────
// Circuit breaker (per source)
// ───────────────────────────────────────────────────────────────────────────

export interface CircuitBreakerState {
  source: string;
  consecutive5xxCount: number;
  openedAt: Date | null;
  openUntil: Date | null;
}

export function newBreaker(source: string): CircuitBreakerState {
  return { source, consecutive5xxCount: 0, openedAt: null, openUntil: null };
}

const BREAKER_THRESHOLD = 5;
const BREAKER_OPEN_MS = 15 * 60 * 1000; // 15 min

export function recordResult(
  state: CircuitBreakerState,
  ok: boolean,
  now: Date = new Date(),
): CircuitBreakerState {
  // If currently open and now past openUntil, half-open: reset on first ok
  if (state.openUntil && now < state.openUntil) {
    return state; // still open
  }
  if (ok) {
    return { ...state, consecutive5xxCount: 0, openedAt: null, openUntil: null };
  }
  const next = state.consecutive5xxCount + 1;
  if (next >= BREAKER_THRESHOLD) {
    return {
      ...state,
      consecutive5xxCount: next,
      openedAt: now,
      openUntil: new Date(now.getTime() + BREAKER_OPEN_MS),
    };
  }
  return { ...state, consecutive5xxCount: next };
}

export function isBreakerOpen(state: CircuitBreakerState, now: Date = new Date()): boolean {
  if (!state.openUntil) return false;
  return now < state.openUntil;
}
