-- ============================================================================
-- HOTELVALORA · Supabase · Migration 0004 — restrict avatar listing
-- ============================================================================
-- Migration 0003 issued a broad `avatars: public read` policy. The
-- Supabase advisor lint (0025_public_bucket_allows_listing) flagged it:
-- a public bucket already serves object URLs through the CDN without a
-- SELECT policy on storage.objects, so the policy was only granting the
-- ability to LIST every avatar — leaking metadata across users.
--
-- Scope listing to the caller's own namespace. Anon clients can still
-- hit a known avatar URL through the public CDN; they just can't
-- enumerate the bucket.
-- ============================================================================

drop policy if exists "avatars: public read" on storage.objects;
drop policy if exists "avatars: own select"  on storage.objects;
create policy "avatars: own select" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- END migration 0004
-- ============================================================================
