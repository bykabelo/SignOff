import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Client } from "@/types/database";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve a review token to its client, or null.
 *
 * The token is the only credential a reviewing client ever presents, so this
 * is the security boundary for every public route. The shape check runs first
 * so malformed input never reaches Postgres.
 */
export async function clientForToken(
  token: string | undefined | null,
): Promise<Client | null> {
  if (!token || !UUID_RE.test(token)) return null;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("clients")
    .select("*")
    .eq("review_token", token)
    .maybeSingle();

  return data ?? null;
}

/**
 * Resolve a token AND confirm the given post belongs to that client.
 *
 * Without this second check, a valid token for one client would authorise
 * writes against any post id in the database — the token proves which
 * workspace you are in, not which rows you may touch.
 */
export async function authorisePostAccess(
  token: string | undefined | null,
  postId: string | undefined | null,
): Promise<{ client: Client; postId: string } | null> {
  const client = await clientForToken(token);
  if (!client || !postId || !UUID_RE.test(postId)) return null;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("posts")
    .select("id")
    .eq("id", postId)
    .eq("client_id", client.id)
    .maybeSingle();

  return data ? { client, postId: data.id } : null;
}

export { UUID_RE };
