/**
 * Supabase Database type — placeholder until the project is provisioned
 * and the auto-generated types ship from `supabase gen types typescript`.
 *
 * Once `NEXT_PUBLIC_SUPABASE_URL` is set and the schema in
 * `docs/database/schema.sql` is applied:
 *
 *   pnpm dlx supabase gen types typescript \
 *     --project-id <YOUR_PROJECT_REF>      \
 *     --schema public                       \
 *     > apps/web/src/lib/supabase/types.ts
 *
 * That single command overwrites this file with the full typed surface
 * for every table, view, function and enum. Until then, every query is
 * untyped (Database = `any`-equivalent).
 */
export type Database = Record<string, never>;
