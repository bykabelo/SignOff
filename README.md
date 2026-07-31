# Signoff

Client review and approval for freelancers and small creative agencies.

A creator shares work through a single link. The client reviews and approves
or comments — no login, no account — and the creator hears about it instantly.

Two modes, chosen per client:

- **Social** — weekly social content. A post is an image plus a caption; the
  client approves or comments on each. Fast, high cadence.
- **Design** — creative project work. A project has deliverables, each with
  versions (v1 → v2 → v3). Comments are tied to the version they were written
  against, and the creator can request assets back from the client, which the
  client uploads through the same review page.

Both modes share one workspace, one public review link and the same
approve/comment mechanics.

## Stack

Next.js 14 (App Router, TypeScript) · Tailwind · Supabase (Postgres, Auth,
Storage) · Resend · Stripe · Vercel · npm.

## Setup

### 1. Install

```bash
npm install
cp .env.local.example .env.local
```

### 2. Supabase

Create a project, then run `supabase/schema.sql` in the SQL Editor. It is
idempotent — safe to re-run after schema changes. It creates the tables,
indexes, RLS policies and both storage buckets (`posts`, `client-uploads`).

Copy the URL, anon key and service-role key from **Project Settings → API**
into `.env.local`.

**Turn off email confirmation** for the onboarding flow to work end to end:
**Authentication → Providers → Email → uncheck "Confirm email"**. Onboarding
creates the account at step one and needs a session immediately to create the
first client. If you leave confirmation on, signup still works — the flow
stops and tells the user to check their inbox instead of failing at the next
step with an opaque auth error.

### 3. Resend

Add `RESEND_API_KEY`. `onboarding@resend.dev` works for testing without a
verified domain, but only delivers to the address that owns the Resend
account — verify your own domain before real use.

Email is optional in development: with no key set, notifications log a
warning and skip. Nothing else breaks.

### 4. Run

```bash
npm run dev
```

## How access works

There are two kinds of caller and they are kept strictly apart.

**The creator** signs in and is scoped by RLS to rows they own. Middleware
refreshes the session on every request and gates `/dashboard/*` and the
creator API routes.

**The reviewing client** has no account. Their only credential is the UUID
review token in the URL. They never talk to Postgres directly — the review
page and its three public routes run server-side, validate the token, confirm
the target row belongs to that token's workspace, and only then act using the
service-role key.

This is why the RLS in `supabase/schema.sql` departs from a `using (true)`
public-read setup. The anon key ships in the browser bundle by design, so a
permissive read policy would let anyone holding it read every post, caption
and comment belonging to every client of every account — which is exactly
what an unguessable review link is meant to prevent. The original permissive
policies are kept in the file, commented, if you want to move review reads
into the browser later.

`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS entirely. It is only ever read by
`lib/supabase/admin.ts`, which imports `server-only` — an accidental import
from a client component is a build error, not a leaked key.

## Upload limits

Uploads are capped at 4 MB to stay under Vercel's 4.5 MB serverless request
body limit. A higher cap would pass validation and then fail as a 413 at the
platform edge in production.

To lift it, have the browser upload straight to Supabase Storage with a
signed upload URL and send only the resulting key to the API routes, so the
file never passes through a serverless function.

## Layout

```
app/
  page.tsx                            marketing landing page
  (auth)/login, signup, onboarding
  (dashboard)/dashboard               client list, metrics, activity
  (dashboard)/dashboard/clients/[id]  workspace: upload, versions, requests
  review/[token]                      PUBLIC — social or design by client.mode
  api/
    approve, comment, client-upload   public, token-validated
    upload, version, request-asset    creator only
lib/
  supabase/{client,server,admin}.ts
  review-token.ts                     the security boundary for public routes
  data.ts                             read layer for all three surfaces
  auth-actions.ts, client-actions.ts
  uploads.ts, resend.ts, api.ts
types/database.ts
middleware.ts
supabase/schema.sql
```

## Interface rule

Every interactive control renders at full opacity by default. Version tabs,
approve buttons and request-changes buttons are never revealed by hover —
hover may only deepen what is already visible. A client opening a review link
on a phone has no hover state, so anything hover-gated is invisible to them,
and the review page is mostly opened on phones.
