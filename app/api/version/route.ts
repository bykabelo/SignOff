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
 * CREATOR ONLY. Push a new version of a deliverable.
 *
 * The old latest is demoted before the new one is inserted — the database
 * has a unique partial index allowing one is_latest row per deliverable, so
 * the reverse order would be rejected rather than quietly leaving two.
 */
export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) return unauthorised();

    const form = await request.formData();
    const postId = requiredString(form.get("postId"), 40);
    if (!postId) return jsonError("Which deliverable is this for?");

    const supabase = createClient();

    const { data: post } = await supabase
      .from("posts")
      .select("id, kind, client_id")
      .eq("id", postId)
      .maybeSingle();

    if (!post) return jsonError("That deliverable doesn't exist.", 404);
    if (post.kind !== "deliverable") {
      return jsonError("Only deliverables have versions.");
    }

    const checked = checkFile(form.get("file"), IMAGE_TYPES);
    if (!checked.ok) return jsonError(checked.error);

    const key = storageKey([user.id, post.client_id], checked.file.name);
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

    const { data: previous } = await supabase
      .from("post_versions")
      .select("version_number")
      .eq("post_id", postId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextNumber = (previous?.version_number ?? 0) + 1;

    await supabase
      .from("post_versions")
      .update({ is_latest: false })
      .eq("post_id", postId)
      .eq("is_latest", true);

    const { data: version, error } = await supabase
      .from("post_versions")
      .insert({
        post_id: postId,
        version_number: nextNumber,
        image_url: publicUrl,
        note: requiredString(form.get("note"), 1000),
        is_latest: true,
      })
      .select()
      .single();

    if (error) return serverError("version insert failed", error);

    // A fresh version resets the review: whatever the client said about the
    // last one, this one has not been looked at yet.
    await supabase
      .from("posts")
      .update({
        status: "ready_for_review",
        status_changed_at: new Date().toISOString(),
      })
      .eq("id", postId);

    return jsonOk({ version });
  } catch (error) {
    return serverError("version threw", error);
  }
}
