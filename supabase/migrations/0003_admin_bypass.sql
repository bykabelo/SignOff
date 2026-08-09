-- ═══════════════════════════════════════════════════════════════
-- Signoff — founder/admin plan bypass
-- Run this in the Supabase SQL Editor. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════

-- ── (a) The column ───────────────────────────────────────
alter table profiles
  add column if not exists is_admin boolean not null default false;

-- is_admin is deliberately absent from the column grants in migration
-- 0001, so `authenticated` cannot write it: that migration revoked
-- table-wide update and handed back only the settings fields. This revoke
-- is belt and braces — a no-op if the privilege was never granted, and
-- insurance against a future migration granting update too broadly.
revoke update (is_admin) on profiles from authenticated;

-- Only the service role can set this, which in practice means you, here,
-- in the SQL editor.


-- ── (b) Flag your own account ────────────────────────────
-- Replace the address below with the email you signed up to Signoff with,
-- then run it. Case-insensitive, so capitalisation does not matter.
update profiles
set is_admin = true,
    updated_at = now()
from auth.users
where auth.users.id = profiles.user_id
  and lower(auth.users.email) = lower('you@example.com');


-- ── Check it worked ──────────────────────────────────────
-- Expect one row, is_admin = true. If you get no rows, the email does not
-- match any account — check for a typo or a different signup address.
select u.email, p.plan, p.is_admin
from profiles p
join auth.users u on u.id = p.user_id
where p.is_admin;


-- ── To revoke it later ───────────────────────────────────
-- update profiles set is_admin = false
-- from auth.users
-- where auth.users.id = profiles.user_id
--   and lower(auth.users.email) = lower('you@example.com');
