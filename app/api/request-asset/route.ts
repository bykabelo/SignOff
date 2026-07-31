import { createClient, getUser } from "@/lib/supabase/server";
import {
  jsonOk,
  jsonError,
  unauthorised,
  serverError,
  requiredString,
} from "@/lib/api";

/**
 * CREATOR ONLY. Ask the client for something — headshots, copy, brand files.
 *
 * An asset request is a post with kind 'asset_request', so it sits in the
 * same list as the deliverables and the client answers it in the same place
 * they review work. `caption` carries the message.
 */
export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) return unauthorised();

    const body = await request.json().catch(() => null);
    if (!body) return jsonError("Malformed request.");

    const clientId = requiredString(body.clientId, 40);
    if (!clientId) return jsonError("Which client is this for?");

    const title = requiredString(body.title, 160);
    if (!title) return jsonError("Say what you need.");

    const supabase = createClient();

    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .maybeSingle();
    if (!client) return jsonError("That client doesn't exist.", 404);

    const { data: post, error } = await supabase
      .from("posts")
      .insert({
        client_id: clientId,
        kind: "asset_request",
        title,
        caption: requiredString(body.message, 2000),
        status: "waiting_on_assets",
        status_changed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return serverError("asset request insert failed", error);

    return jsonOk({ post });
  } catch (error) {
    return serverError("request-asset threw", error);
  }
}
