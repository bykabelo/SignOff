import { createAdminClient } from "@/lib/supabase/admin";
import { authorisePostAccess } from "@/lib/review-token";
import {
  jsonOk,
  jsonError,
  notFound,
  serverError,
  requiredString,
} from "@/lib/api";
import {
  checkFile,
  CLIENT_ASSET_TYPES,
  displayName,
  storageKey,
} from "@/lib/uploads";
import { notifyClientUpload } from "@/lib/resend";

/**
 * PUBLIC. The client uploads a file to fulfil an asset request.
 *
 * This is the only route where an unauthenticated caller writes to storage,
 * so the size and type limits in lib/uploads.ts are doing real work. The
 * upload also has to land against an asset_request in the token's own
 * workspace — not just any post id.
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData();

    const token = requiredString(form.get("token"), 40);
    const postId = requiredString(form.get("postId"), 40);

    const access = await authorisePostAccess(token, postId);
    if (!access) return notFound();

    const supabase = createAdminClient();

    const { data: post } = await supabase
      .from("posts")
      .select("id, kind, title")
      .eq("id", access.postId)
      .single();

    if (!post || post.kind !== "asset_request") {
      return jsonError("There's nothing to upload against here.");
    }

    const checked = checkFile(form.get("file"), CLIENT_ASSET_TYPES);
    if (!checked.ok) return jsonError(checked.error);

    const name = displayName(checked.file.name);
    const key = storageKey([access.client.id, post.id], name);

    const { error: uploadError } = await supabase.storage
      .from("client-uploads")
      .upload(key, checked.file, {
        contentType: checked.file.type,
        upsert: false,
      });

    if (uploadError) return serverError("client upload failed", uploadError);

    const {
      data: { publicUrl },
    } = supabase.storage.from("client-uploads").getPublicUrl(key);

    const { data: asset, error } = await supabase
      .from("client_assets")
      .insert({ post_id: post.id, file_url: publicUrl, file_name: name })
      .select()
      .single();

    if (error) return serverError("client asset insert failed", error);

    // The request is no longer waiting on the client — there is now
    // something here for the creator to look at.
    await supabase
      .from("posts")
      .update({
        status: "ready_for_review",
        status_changed_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    void notifyClientUpload(access.client, post.title || "your request", name);

    return jsonOk({ asset });
  } catch (error) {
    return serverError("client-upload threw", error);
  }
}
