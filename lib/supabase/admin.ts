import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-role Supabase client. Bypasses RLS entirely.
 *
 * This exists for one job: serving the public review page, where the visitor
 * has no account and therefore no session to authorise them. Every caller
 * MUST validate the review token first (see lib/review-token.ts) and scope
 * its queries to that client's rows.
 *
 * The `server-only` import above turns any accidental client-component
 * import of this file into a build error, so the key cannot leak into a
 * browser bundle.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
