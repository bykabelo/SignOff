-- ═══════════════════════════════════════════════════════════════
-- Signoff — estimated completion date for design projects
-- Run this in the Supabase SQL Editor. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════

-- The progress tracker derives everything it shows from the deliverables
-- themselves — stage names from posts.title, order from created_at,
-- completion from posts.status and posts.status_changed_at — so no stages
-- table is needed and the tracker cannot drift out of step with the work.
--
-- The one thing that is not derivable is when the project is meant to land.
-- This is it.
alter table clients
  add column if not exists target_date date;
