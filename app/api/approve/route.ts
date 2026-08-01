import { createAdminClient } from "@/lib/supabase/admin";
import { authorisePostAccess } from "@/lib/review-token";
import { jsonOk, jsonError, notFound, serverError } from "@/lib/api";
import { notifyApproval } from "@/lib/resend";
import type { PostStatus } from "@/types/database";

/**
 * PUBLIC. The client approves an item or asks for changes.
 *
 * Authorised by the review token alone — that is the product promise. The
 * token proves which workspace the caller is in; authorisePostAccess also
 * confirms the post belongs to it, so a valid token cannot be used to
 * approve someone else's work.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) return jsonError("Malformed request.");

    // "pending" is the Undo on the review page: a client who taps approve by
    // mistake needs a way back, and without it the undo button would only
    // reset local state while the server kept the wrong answer.
    const allowed: PostStatus[] = ["approved", "changes", "pending"];
    const status: PostStatus = allowed.includes(body.status)
      ? body.status
      : "approved";

    const access = await authorisePostAccess(body.token, body.postId);
    if (!access) return notFound();

    const supabase = createAdminClient();
    const { data: post, error } = await supabase
      .from("posts")
      .update({ status, status_changed_at: new Date().toISOString() })
      .eq("id", access.postId)
      .select()
      .single();

    if (error) return serverError("approve failed", error);

    // An undo is a correction, not news — mailing the creator about it would
    // be noise on top of the notification they already received.
    if (status !== "pending") {
      const label = post.title || post.caption?.slice(0, 60) || "an item";
      // Not awaited: a slow mail provider must not hold up the client's tap.
      void notifyApproval(access.client, label, status === "approved");
    }

    return jsonOk({ status });
  } catch (error) {
    return serverError("approve threw", error);
  }
}
