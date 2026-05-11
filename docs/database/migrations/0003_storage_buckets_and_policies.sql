-- ============================================================================
-- HOTELVALORA · Supabase · Migration 0003 — Storage buckets + RLS policies
-- ============================================================================
-- Creates the five canonical Storage buckets and a uniform RLS posture on
-- storage.objects. Path convention for every bucket is
--   {user_id}/{rest...}
-- so a single template policy per bucket is enough:
--   (storage.foldername(name))[1] = auth.uid()::text
--
-- avatars is public-read (CDN cacheable, ubiquitous in UI); every other
-- bucket is private and reads go through signed URLs minted server-side.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('reports',       'reports',        false,  52428800, null),
  ('pdfs',          'pdfs',           false, 104857600, array['application/pdf']),
  ('excel-uploads', 'excel-uploads',  false,  26214400, array[
                                                         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                                                         'application/vnd.ms-excel'
                                                       ]),
  ('renders',       'renders',        false,  10485760, array['image/png', 'image/jpeg', 'image/webp']),
  ('avatars',       'avatars',        true,    5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ────────────────────────────────────────────────────────────────────────────
-- storage.objects — RLS policies (drop-then-create for idempotency)
-- ────────────────────────────────────────────────────────────────────────────

-- reports
drop policy if exists "reports: own select"  on storage.objects;
drop policy if exists "reports: own insert"  on storage.objects;
drop policy if exists "reports: own update"  on storage.objects;
drop policy if exists "reports: own delete"  on storage.objects;
create policy "reports: own select" on storage.objects for select to authenticated
  using (bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "reports: own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "reports: own update" on storage.objects for update to authenticated
  using (bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "reports: own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text);

-- pdfs
drop policy if exists "pdfs: own select"  on storage.objects;
drop policy if exists "pdfs: own insert"  on storage.objects;
drop policy if exists "pdfs: own update"  on storage.objects;
drop policy if exists "pdfs: own delete"  on storage.objects;
create policy "pdfs: own select" on storage.objects for select to authenticated
  using (bucket_id = 'pdfs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "pdfs: own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'pdfs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "pdfs: own update" on storage.objects for update to authenticated
  using (bucket_id = 'pdfs' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'pdfs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "pdfs: own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'pdfs' and (storage.foldername(name))[1] = auth.uid()::text);

-- excel-uploads
drop policy if exists "excel-uploads: own select" on storage.objects;
drop policy if exists "excel-uploads: own insert" on storage.objects;
drop policy if exists "excel-uploads: own update" on storage.objects;
drop policy if exists "excel-uploads: own delete" on storage.objects;
create policy "excel-uploads: own select" on storage.objects for select to authenticated
  using (bucket_id = 'excel-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "excel-uploads: own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'excel-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "excel-uploads: own update" on storage.objects for update to authenticated
  using (bucket_id = 'excel-uploads' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'excel-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "excel-uploads: own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'excel-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

-- renders
drop policy if exists "renders: own select" on storage.objects;
drop policy if exists "renders: own insert" on storage.objects;
drop policy if exists "renders: own update" on storage.objects;
drop policy if exists "renders: own delete" on storage.objects;
create policy "renders: own select" on storage.objects for select to authenticated
  using (bucket_id = 'renders' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "renders: own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'renders' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "renders: own update" on storage.objects for update to authenticated
  using (bucket_id = 'renders' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'renders' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "renders: own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'renders' and (storage.foldername(name))[1] = auth.uid()::text);

-- avatars — public-read bucket, owner-only writes. NOTE: a broad SELECT
-- policy is intentionally NOT issued here (see 0004) — the CDN serves
-- object URLs directly when `public=true`, so a SELECT policy would only
-- grant the ability to LIST other users' avatars.
drop policy if exists "avatars: public read" on storage.objects;
drop policy if exists "avatars: own insert"  on storage.objects;
drop policy if exists "avatars: own update"  on storage.objects;
drop policy if exists "avatars: own delete"  on storage.objects;
create policy "avatars: own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: own update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- END migration 0003
-- ============================================================================
