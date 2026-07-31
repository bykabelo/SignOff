import { createClient, getUser } from "@/lib/supabase/server";
import {
  jsonOk,
  jsonError,
  unauthorised,
  serverError,
  requiredString,
} from "@/lib/api";
import { checkFile, IMAGE_TYPES, storageKey } from "@/lib/uploads";

/**
 * CREATOR ONLY. Add a social post, or a deliverable with its first version.
 *
 * Both live in `posts`; `kind` decides which. A deliverable also gets a v1
 * row in post_versions, because design-mode review always renders versions
 * rather than the post's own image_url.
 */
export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) return unauthorised();

    const form = await request.formData();
    const clientId = requiredString(form.get("clientId"), 40);
    if (!clientId) return jsonError("Which client is this for?");

    const kind = form.get("kind") === "deliverable" ? "deliverable" : "post";
    const supabase = createClient();

    // RLS means a client that isn't theirs simply isn't found.
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .maybeSingle();
    if (!client) return jsonError("That client doesn't exist.", 404);

    const title = requiredString(form.get("title"), 160);
    if (kind === "deliverable" && !title) {
      return jsonError("Give this deliverable a name.");
    }

    const checked = checkFile(form.get("file"), IMAGE_TYPES);
    if (!checked.ok) return jsonError(checked.error);

    const key = storageKey([user.id, clientId], checked.file.name);
    const { error: uploadError } = await supabase.storage
      .from("posts")
      .upload(key, checked.file, {
        contentType: checked.file.type,
        upsert: false,
      });

    if (uploadError) return serverError("storage upload failed", uploadError);

    const {
      data: { publicUrl },
    } = supabase.storage.from("posts").getPublicUrl(key);

    const { data: post, error } = await supabase
      .from("posts")
      .insert({
        client_id: clientId,
        kind,
        title,
        caption: requiredString(form.get("caption"), 2200),
        scheduled_for: requiredString(form.get("scheduledFor"), 60),
        // A deliverable renders from its versions, so image_url stays null
        // and there is only one place to look for the current artwork.
        image_url: kind === "deliverable" ? null : publicUrl,
        status: kind === "deliverable" ? "ready_for_review" : "pending",
        status_changed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return serverError("post insert failed", error);

    if (kind === "deliverable") {
      const { error: versionError } = await supabase
        .from("post_versions")
        .insert({
          post_id: post.id,
          version_number: 1,
          image_url: publicUrl,
          note: requiredString(form.get("note"), 1000),
          is_latest: true,
        });

      if (versionError) {
        // Leaving a deliverable with no versions would render as an empty
        // card the client can neither see nor act on.
        await supabase.from("posts").delete().eq("id", post.id);
        return serverError("first version insert failed", versionError);
      }
    }

    return jsonOk({ post });
  } catch (error) {
    return serverError("upload threw", error);
  }
}
