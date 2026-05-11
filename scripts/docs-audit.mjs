#!/usr/bin/env node
// HOTELVALORA documentation health audit.
//
// Detects synchronisation drift between the codebase and the documentation
// system. Designed to run as a fast standalone Node script (no deps); also
// usable as a pre-push git hook, a CI gate, or an ad-hoc operator check.
//
// Usage:
//   node scripts/docs-audit.mjs            full audit · table report · exit 1 on critical
//   node scripts/docs-audit.mjs --json     machine-readable JSON output
//   node scripts/docs-audit.mjs --strict   exit 1 even on warnings (CI mode)
//   node scripts/docs-audit.mjs --help     usage
//
// Checks (in order):
//   1. Changelog drift           Every commit on main since the last changelog
//                                entry must appear in `docs/changelog.md` body.
//   2. ENTRYPOINTS.md size cap   ENTRYPOINTS.md ≤ 200 lines (per CLAUDE.md).
//                                AI_CONTEXT.md ≤ 300 lines.
//                                RULES.md ≤ 300 lines.
//   3. Master docs freshness     Every master file's `Last refreshed: YYYY-MM-DD`
//                                must be no older than (latest main commit date - 1d).
//   4. Sprint freshness          docs/roadmap/current-sprint.md `Updated YYYY-MM-DD`
//                                must be no older than (latest main commit date - 1d).
//
// Severity:
//   ❌ critical → exit 1
//   ⚠️  warning → exit 0 (or 1 with --strict)
//   ✅ ok      → no exit signal

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const FLAGS = {
  json: args.includes("--json"),
  strict: args.includes("--strict"),
  help: args.includes("--help") || args.includes("-h"),
};

if (FLAGS.help) {
  console.log(`HOTELVALORA documentation health audit

Usage:
  node scripts/docs-audit.mjs            human report · exit 1 on critical
  node scripts/docs-audit.mjs --json     JSON output
  node scripts/docs-audit.mjs --strict   exit 1 even on warnings (CI mode)
  node scripts/docs-audit.mjs --help

Detects:
  • Commits on main not yet recorded in docs/changelog.md
  • ENTRYPOINTS.md > 200 lines · AI_CONTEXT.md / RULES.md > 300 lines
  • Master docs with Last refreshed > 1 day older than the latest commit
  • current-sprint.md older than the latest commit by > 1 day
`);
  process.exit(0);
}

// ── Configuration ───────────────────────────────────────────────────────────

const MASTER_DOCS = [
  "docs/HOTELVALORA_MASTER_SYSTEM.md",
  "docs/ai-agents/AI_OPERATIONS_LAYER_MASTER_SYSTEM.md",
  "docs/intelligence/HOTELVALORA_HOSPITALITY_INTELLIGENCE_MASTER_SYSTEM.md",
  "docs/infrastructure/HOTELVALORA_TECH_STACK_MASTER.md",
  "docs/infrastructure/INFRASTRUCTURE_MASTER_TRACKER.md",
];

const SIZE_CAPS = [
  { path: "ENTRYPOINTS.md", cap: 200 },
  { path: "AI_CONTEXT.md", cap: 300 },
  { path: "RULES.md", cap: 300 },
];

const CHANGELOG_LOOKBACK = 20; // how many recent commits to check against the changelog

// ── Helpers ─────────────────────────────────────────────────────────────────

function git(...args) {
  // Use execFileSync with args array to bypass shell interpretation
  // (Windows cmd.exe otherwise parses %ad / %h as env vars in --pretty formats).
  return execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" }).trim();
}

function readDocLines(relativePath) {
  const full = join(REPO_ROOT, relativePath);
  if (!existsSync(full)) return null;
  return readFileSync(full, "utf8").split(/\r?\n/);
}

function readDocText(relativePath) {
  const lines = readDocLines(relativePath);
  return lines ? lines.join("\n") : null;
}

/** Parse "Last refreshed: 2026-05-12" or "Updated 2026-05-12 — …" from the first 10 lines */
function parseDocDate(relativePath) {
  const lines = readDocLines(relativePath);
  if (!lines) return null;
  const head = lines.slice(0, 15).join("\n");
  const match = head.match(/(?:Last refreshed|Updated)[^0-9]*?(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function daysBetween(isoA, isoB) {
  const a = new Date(isoA);
  const b = new Date(isoB);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

// ── Checks ──────────────────────────────────────────────────────────────────

function checkChangelogDrift() {
  const changelog = readDocText("docs/changelog.md") ?? "";
  const log = git(
    "log",
    `-n${CHANGELOG_LOOKBACK}`,
    "--pretty=format:%h|%ad|%s",
    "--date=short",
    "main",
  );
  const commits = log
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [sha, date, ...subjectParts] = line.split("|");
      return { sha, date, subject: subjectParts.join("|") };
    });

  const missing = [];
  for (const c of commits) {
    // Skip merge commits + version bumps + the audit script's own commits
    if (/^merge|^chore\(version\)|^docs\(audit\)/i.test(c.subject)) continue;
    // Skip docs-only commits that explicitly catch up the changelog — the
    // changelog itself is the artefact, no need to be self-referential
    if (/docs\(changelog\)/i.test(c.subject)) continue;
    if (!changelog.includes(c.sha)) {
      missing.push(c);
    }
  }

  if (missing.length === 0) {
    return { id: "changelog", level: "ok", message: `All recent commits referenced in changelog.` };
  }
  return {
    id: "changelog",
    level: "critical",
    message: `${missing.length} commit${missing.length === 1 ? "" : "s"} on main not referenced in docs/changelog.md`,
    detail: missing.map((c) => `  ${c.sha}  ${c.date}  ${c.subject}`).join("\n"),
  };
}

function checkSizeCaps() {
  const violations = [];
  for (const { path, cap } of SIZE_CAPS) {
    const lines = readDocLines(path);
    if (!lines) {
      violations.push({ path, cap, actual: null, missing: true });
      continue;
    }
    if (lines.length > cap) {
      violations.push({ path, cap, actual: lines.length });
    }
  }
  if (violations.length === 0) {
    return { id: "size-caps", level: "ok", message: `All root AI docs within size caps.` };
  }
  return {
    id: "size-caps",
    level: "warning",
    message: `${violations.length} root AI doc${violations.length === 1 ? "" : "s"} over size cap`,
    detail: violations
      .map((v) => v.missing
        ? `  ${v.path}  MISSING (cap ${v.cap})`
        : `  ${v.path}  ${v.actual} lines (cap ${v.cap}, ${v.actual - v.cap} over)`)
      .join("\n"),
  };
}

function checkMasterFreshness() {
  const latestCommitDate = git("log", "-1", "--pretty=format:%ad", "--date=short", "main");
  const stale = [];
  for (const path of MASTER_DOCS) {
    const docDate = parseDocDate(path);
    if (!docDate) {
      stale.push({ path, docDate: null, missing: true });
      continue;
    }
    const delta = daysBetween(docDate, latestCommitDate);
    if (delta > 1) {
      stale.push({ path, docDate, latestCommitDate, deltaDays: delta });
    }
  }
  if (stale.length === 0) {
    return { id: "master-freshness", level: "ok", message: `All master docs ≤ 1 day behind main.` };
  }
  return {
    id: "master-freshness",
    level: "warning",
    message: `${stale.length} master doc${stale.length === 1 ? "" : "s"} stale (> 1 day behind main)`,
    detail: stale
      .map((s) => s.missing
        ? `  ${s.path}  no "Last refreshed" date found`
        : `  ${s.path}  Last refreshed ${s.docDate}  (main at ${s.latestCommitDate} · ${s.deltaDays}d behind)`)
      .join("\n"),
  };
}

function checkSprintFreshness() {
  const path = "docs/roadmap/current-sprint.md";
  const sprintDate = parseDocDate(path);
  if (!sprintDate) {
    return { id: "sprint-freshness", level: "warning", message: `${path}: no "Updated" date found in head.` };
  }
  const latestCommitDate = git("log", "-1", "--pretty=format:%ad", "--date=short", "main");
  const delta = daysBetween(sprintDate, latestCommitDate);
  if (delta > 1) {
    return {
      id: "sprint-freshness",
      level: "warning",
      message: `${path} stale: Updated ${sprintDate} · main at ${latestCommitDate} · ${delta}d behind.`,
    };
  }
  return { id: "sprint-freshness", level: "ok", message: `Sprint file fresh (Updated ${sprintDate}).` };
}

// ── Run ─────────────────────────────────────────────────────────────────────

const checks = [
  checkChangelogDrift(),
  checkSizeCaps(),
  checkMasterFreshness(),
  checkSprintFreshness(),
];

const counts = checks.reduce((acc, c) => {
  acc[c.level] = (acc[c.level] ?? 0) + 1;
  return acc;
}, {});

if (FLAGS.json) {
  console.log(JSON.stringify({ counts, checks }, null, 2));
} else {
  console.log("");
  console.log("HOTELVALORA · documentation health audit");
  console.log("=========================================");
  for (const c of checks) {
    const icon = c.level === "ok" ? "✅" : c.level === "warning" ? "⚠️ " : "❌";
    console.log(`${icon}  ${c.id.padEnd(20)}  ${c.message}`);
    if (c.detail) console.log(c.detail);
  }
  console.log("");
  console.log(
    `Summary  ✅ ${counts.ok ?? 0}   ⚠️  ${counts.warning ?? 0}   ❌ ${counts.critical ?? 0}`,
  );
  console.log("");
}

const exitOnWarning = FLAGS.strict;
const hasCritical = (counts.critical ?? 0) > 0;
const hasWarning = (counts.warning ?? 0) > 0;
if (hasCritical || (exitOnWarning && hasWarning)) {
  process.exit(1);
}
process.exit(0);
