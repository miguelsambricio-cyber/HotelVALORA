-- ============================================================================
-- HOTELVALORA · Supabase · Migration 0002 — harden security definer functions
-- ============================================================================
-- Closes the WARN-level lints raised by Supabase's database linter after
-- 0001_initial_schema.sql:
--
--   1. function_search_path_mutable on public.set_updated_at
--   2. anon/authenticated_security_definer_function_executable on
--      public.handle_new_user — exposed via /rest/v1/rpc/handle_new_user
--      simply by being in the `public` schema. The function is trigger-only;
--      no caller should be able to invoke it as an RPC.
-- ============================================================================

-- Pin the search_path so a malicious role cannot redirect symbol lookups
-- (e.g. shadow `now()` or `public.users`).
alter function public.set_updated_at()  set search_path = public, pg_temp;
alter function public.handle_new_user() set search_path = public, pg_temp;

-- Trigger-only function — strip EXECUTE from every external role. The
-- auth.users trigger still fires it under the table owner's authority.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

-- ============================================================================
-- END migration 0002
-- ============================================================================
