-- ═══════════════════════════════════════════════════════════════
-- Signoff — full schema
-- Run this in the Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════

-- ── Clients ──────────────────────────────────────────────
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  brand_color text default '#C8522A',
  logo_url text,
  mode text default 'social',            -- 'social' | 'design'
  review_token uuid default gen_random_uuid() unique,
  created_at timestamptz default now()
);

-- ── Posts / Deliverables (same table, kind distinguishes) ─
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients not null,
  kind text default 'post',              -- 'post' (social) | 'deliverable' | 'asset_request' (design)
  title text,                            -- deliverable name (design mode)
  image_url text,                        -- social post image (design uses post_versions)
  caption text,                          -- social caption OR asset_request message
  status text default 'pending',         -- pending | approved | changes | in_progress | ready_for_review | waiting_on_assets
  scheduled_for text,
  locked boolean default false,          -- deliverable waiting on a dependency
  created_at timestamptz default now()
);

-- ── Versions (design mode) ───────────────────────────────
create table if not exists post_versions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts not null,
  version_number int not null,
  image_url text,
  note text,
  is_latest boolean default true,
  created_at timestamptz default now()
);

-- ── Comments (version_id nullable; social comments have none) ─
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts not null,
  version_id uuid references post_versions,
  author text default 'Client',
  body text not null,
  created_at timestamptz default now()
);

-- ── Client-uploaded assets (design mode, two-way) ────────
create table if not exists client_assets (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts not null,   -- the asset_request this fulfills
  file_url text not null,
  file_name text,
  uploaded_at timestamptz default now()
);

-- ── Indexes ──────────────────────────────────────────────
-- The review page loads a whole client workspace in one shot; these keep
-- that a handful of index scans rather than sequential scans.
create index if not exists clients_user_id_idx        on clients (user_id);
create index if not exists posts_client_id_idx        on posts (client_id, created_at);
create index if not exists post_versions_post_id_idx  on post_versions (post_id, version_number);
create index if not exists comments_post_id_idx       on comments (post_id, created_at);
create index if not exists client_assets_post_id_idx  on client_assets (post_id);

-- Exactly one latest version per deliverable. This is the invariant the
-- version-push flow depends on, so the database enforces it rather than
-- trusting every future caller to flip the old row first.
create unique index if not exists post_versions_one_latest_idx
  on post_versions (post_id) where is_latest;

-- A deliverable's version numbers are unique, so a double-submitted push
-- fails loudly instead of silently creating two "v2"s.
create unique index if not exists post_versions_number_idx
  on post_versions (post_id, version_number);


-- ═══════════════════════════════════════════════════════════════
-- Row Level Security
--
-- Access model: the creator reads and writes their own rows with their
-- own session. The CLIENT never talks to Postgres directly — the public
-- review page reads and writes through server-side API routes that
-- validate the review token first and then act with the service-role key
-- (which bypasses RLS). So no anon-key access to these tables is needed.
--
-- This matters because the anon key is public by design: it ships in the
-- browser bundle. A `using (true)` select policy would let anyone holding
-- it read every post, caption and comment belonging to every client of
-- every user, which is exactly what the unguessable review token is meant
-- to prevent. Same for `with check (true)` on comment inserts, which
-- would let anyone write a comment onto any post.
--
-- The original permissive policies are kept below, commented, in case you
-- want to move review reads into the browser later.
-- ═══════════════════════════════════════════════════════════════

alter table clients enable row level security;
drop policy if exists "own clients" on clients;
create policy "own clients" on clients for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table posts enable row level security;
drop policy if exists "agency manages posts" on posts;
create policy "agency manages posts" on posts for all
  using (exists (
    select 1 from clients
    where clients.id = posts.client_id and clients.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from clients
    where clients.id = posts.client_id and clients.user_id = auth.uid()
  ));

alter table post_versions enable row level security;
drop policy if exists "agency manages versions" on post_versions;
create policy "agency manages versions" on post_versions for all
  using (exists (
    select 1 from posts join clients on clients.id = posts.client_id
    where posts.id = post_versions.post_id and clients.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from posts join clients on clients.id = posts.client_id
    where posts.id = post_versions.post_id and clients.user_id = auth.uid()
  ));

alter table comments enable row level security;
drop policy if exists "agency reads comments" on comments;
create policy "agency reads comments" on comments for select
  using (exists (
    select 1 from posts join clients on clients.id = posts.client_id
    where posts.id = comments.post_id and clients.user_id = auth.uid()
  ));

alter table client_assets enable row level security;
drop policy if exists "agency reads assets" on client_assets;
create policy "agency reads assets" on client_assets for select
  using (exists (
    select 1 from posts join clients on clients.id = posts.client_id
    where posts.id = client_assets.post_id and clients.user_id = auth.uid()
  ));

-- ── Original permissive policies (not applied) ───────────
-- create policy "public read posts"    on posts         for select using (true);
-- create policy "public read versions" on post_versions for select using (true);
-- create policy "public read comments" on comments      for select using (true);
-- create policy "public insert comments" on comments    for insert with check (true);
-- create policy "public read assets"   on client_assets for select using (true);
-- create policy "public insert assets" on client_assets for insert with check (true);


-- ═══════════════════════════════════════════════════════════════
-- Storage
-- `posts`         — creator uploads (social images, deliverable versions)
-- `client-uploads`— files clients send back to fulfil an asset request
--
-- Both are public-read so an <img src> works on the review page with no
-- signed-URL round trip. Writes are restricted: creators upload to
-- `posts` with their session, and client uploads land in `client-uploads`
-- via the service-role key after the API route validates the token.
-- ═══════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('posts', 'posts', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('client-uploads', 'client-uploads', true)
on conflict (id) do update set public = true;

drop policy if exists "public read posts bucket" on storage.objects;
create policy "public read posts bucket" on storage.objects for select
  using (bucket_id = 'posts');

drop policy if exists "creators upload to posts bucket" on storage.objects;
create policy "creators upload to posts bucket" on storage.objects for insert
  to authenticated
  with check (bucket_id = 'posts');

drop policy if exists "creators manage own uploads" on storage.objects;
create policy "creators manage own uploads" on storage.objects for update
  to authenticated
  using (bucket_id = 'posts' and owner = auth.uid());

drop policy if exists "public read client uploads" on storage.objects;
create policy "public read client uploads" on storage.objects for select
  using (bucket_id = 'client-uploads');
