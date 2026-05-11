#!/usr/bin/env node
/**
 * Apply a SQL migration to the Supabase Postgres directly via node-postgres.
 *
 * Use when the Supabase access token isn't provisioned and the
 * `supabase db push` CLI path isn't available. The script uses the
 * direct connection (port 5432) — NOT the pooler — because the
 * transaction pooler refuses multi-statement DDL.
 *
 * Usage:
 *   SUPABASE_DB_PASSWORD='...' \
 *   node infrastructure/scripts/apply-supabase-migration.mjs \
 *     docs/database/migrations/0001_initial_schema.sql
 *
 * Required env:
 *   SUPABASE_DB_PASSWORD   — from Settings → Database → Connection string
 *
 * Optional env:
 *   SUPABASE_PROJECT_REF   — defaults to "twebgqutuqgonabvhzjk"
 *   SUPABASE_DB_HOST       — defaults to db.<ref>.supabase.co
 *
 * After a successful apply, ROTATE the password — its value briefly
 * lived in your shell process environment.
 */

import { Client } from "pg";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import dns from "node:dns";

// Force IPv6 first — Supabase's direct connection
// (db.<ref>.supabase.co) resolves to an IPv6 address. Node's default
// lookup order is IPv4, which yields ENOTFOUND on networks where the
// AAAA record is the only one published.
dns.setDefaultResultOrder("ipv6first");

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node apply-supabase-migration.mjs <migration.sql>");
  process.exit(1);
}

// Connection priority order:
//   1. SUPABASE_DATABASE_URL — full URI (preferred — copied from
//      Settings → Database → Connection string in the dashboard)
//   2. SUPABASE_DB_PASSWORD + (optional host / user / port overrides)
//   3. Direct hostname fallback (IPv6-only; fails on networks without
//      IPv6 routing — most home ISPs)
const file = resolve(args[0]);
const sql = readFileSync(file, "utf8");

let client;
let connectionLabel;

const fullUrl = process.env.SUPABASE_DATABASE_URL;
if (fullUrl) {
  client = new Client({
    connectionString: fullUrl,
    ssl: { rejectUnauthorized: false },
  });
  // Mask the password in the log
  connectionLabel = fullUrl.replace(/:[^@/]+@/, ":***@");
} else {
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) {
    console.error(
      "Either SUPABASE_DATABASE_URL or SUPABASE_DB_PASSWORD must be set.",
    );
    process.exit(1);
  }
  const projectRef = process.env.SUPABASE_PROJECT_REF || "twebgqutuqgonabvhzjk";
  const host = process.env.SUPABASE_DB_HOST || `db.${projectRef}.supabase.co`;
  const port = Number(process.env.SUPABASE_DB_PORT || 5432);
  const user = process.env.SUPABASE_DB_USER || "postgres";
  client = new Client({
    host,
    port,
    database: "postgres",
    user,
    password,
    ssl: { rejectUnauthorized: false },
  });
  connectionLabel = `${host}:${port} (user: ${user})`;
}

console.log(`→ Connecting to ${connectionLabel} …`);
const t0 = Date.now();

try {
  await client.connect();
  console.log(`→ Applying ${file}  (${sql.length.toLocaleString()} chars)`);
  await client.query(sql);
  console.log(`✓ Migration applied successfully in ${Date.now() - t0} ms`);

  const tables = await client.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
    order by table_name
  `);
  console.log(`\n✓ ${tables.rows.length} public tables present:`);
  for (const row of tables.rows) console.log(`    • ${row.table_name}`);

  const enums = await client.query(`
    select typname
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typtype = 'e'
    order by typname
  `);
  console.log(`\n✓ ${enums.rows.length} public enums present:`);
  for (const row of enums.rows) console.log(`    • ${row.typname}`);

  const policies = await client.query(`
    select tablename, count(*)::int as policy_count
    from pg_policies
    where schemaname = 'public'
    group by tablename
    order by tablename
  `);
  console.log(`\n✓ ${policies.rows.length} tables with RLS policies:`);
  for (const row of policies.rows)
    console.log(`    • ${row.tablename}  (${row.policy_count} policies)`);
} catch (err) {
  console.error(`\n✗ Migration failed:`);
  console.error(`   ${err.message}`);
  if (err.position) console.error(`   At SQL position: ${err.position}`);
  if (err.detail) console.error(`   Detail: ${err.detail}`);
  if (err.hint) console.error(`   Hint: ${err.hint}`);
  process.exit(1);
} finally {
  await client.end();
}
