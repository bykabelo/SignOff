import { createAdminClient } from "@/lib/supabase/admin";
import { authorisePostAccess, UUID_RE } from "@/lib/review-token";
import { jsonOk, jsonError, notFound, serverError, requiredString } from "@/lib/api";
import { notifyComment } from "@/lib/resend";

/**
 * PUBLIC. The client leaves a comment.
 *
 * In design mode a comment is tied to the version it was written against,
 * so that feedback on v1 stays readable next to v1 after v2 lands.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) return jsonError("Malformed request.");

    const text = requiredString(body.body, 4000);
    if (!text) return jsonError("Write something first.");

    const access = await authorisePostAccess(body.token, body.postId);
    if (!access) return notFound();

    const supabase = createAdminClient();

    // A version id is only accepted if it belongs to this post — otherwise a
    // comment could be filed against another client's version row.
    let versionId: string | null = null;
    if (typeof body.versionId === "string" && UUID_RE.test(body.versionId)) {
      const { data: version } = await supabase
        .from("post_versions")
        .select("id")
        .eq("id", body.versionId)
        .eq("post_id", access.postId)
        .maybeSingle();
      if (!version) return jsonError("That version no longer exists.");
      versionId = version.id;
    }

    const author = requiredString(body.author, 80) || access.client.name;

    const { data: comment, error } = await supabase
      .from("comments")
      .insert({
        post_id: access.postId,
        version_id: versionId,
        author,
        body: text,
      })
      .select()
      .single();

    if (error) return serverError("comment insert failed", error);

    // A comment is feedback, so the item moves to "changes" unless the
    // client has already approved it — an approval shouldn't silently
    // reopen because they added a thank-you note afterwards.
    const { data: post } = await supabase
      .from("posts")
      .select("status, title, caption")
      .eq("id", access.postId)
      .single();

    if (post && post.status !== "approved") {
      await supabase
        .from("posts")
        .update({
          status: "changes",
          status_changed_at: new Date().toISOString(),
        })
        .eq("id", access.postId);
    }

    const label = post?.title || post?.caption?.slice(0, 60) || "an item";
    void notifyComment(access.client, label, text, author);

    return jsonOk({ comment });
  } catch (error) {
    return serverError("comment threw", error);
  }
}
