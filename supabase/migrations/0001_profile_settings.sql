-- ═══════════════════════════════════════════════════════════════
-- Signoff — profile & account settings
-- Run this in the Supabase SQL Editor. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════

-- ── Columns ──────────────────────────────────────────────
alter table profiles
  add column if not exists display_name     text,
  add column if not exists avatar_url       text,
  add column if not exists agency_name      text,
  add column if not exists agency_logo_url  text,
  add column if not exists notify_approvals boolean not null default true,
  add column if not exists notify_comments  boolean not null default true,
  add column if not exists notify_assets    boolean not null default true;


-- ── Letting users edit their own profile, but not their plan ──
--
-- profiles previously had no update policy at all, because `plan` and the
-- Stripe ids must only ever be written by the webhook — a user who could
-- write their own row could give themselves Studio for free.
--
-- Row-level security cannot express "these columns but not those", so the
-- row policy grants the row and column privileges narrow it to the fields
-- that are genuinely the user's to change. Postgres rejects an update
-- touching any other column, so this holds no matter what the application
-- code asks for.
create policy "own profile update" on profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Supabase grants table-wide update to `authenticated` by default; take it
-- back before handing out the specific columns.
revoke update on profiles from authenticated;

grant update (
  display_name,
  avatar_url,
  agency_name,
  agency_logo_url,
  notify_approvals,
  notify_comments,
  notify_assets,
  updated_at
) on profiles to authenticated;


-- ── Storage for avatars and agency logos ─────────────────
-- Separate from `posts`, which holds client work. Public-read so an <img>
-- resolves without a signed-URL round trip; writes are restricted to the
-- signed-in creator's own folder.
insert into storage.buckets (id, name, public)
values ('brand', 'brand', true)
on conflict (id) do update set public = true;

drop policy if exists "public read brand" on storage.objects;
create policy "public read brand" on storage.objects for select
  using (bucket_id = 'brand');

drop policy if exists "creators upload brand" on storage.objects;
create policy "creators upload brand" on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'brand'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "creators replace own brand" on storage.objects;
create policy "creators replace own brand" on storage.objects for update
  to authenticated
  using (
    bucket_id = 'brand'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "creators delete own brand" on storage.objects;
create policy "creators delete own brand" on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'brand'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
