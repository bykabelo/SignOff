"use client";

import type { Comment, ClientAsset, PostStatus } from "@/types/database";

/**
 * Client-side calls to the public review routes.
 *
 * The review token travels in the body of every request rather than being
 * read from the URL inside these helpers, so a caller cannot accidentally
 * act on one workspace while displaying another.
 */

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function post<T>(url: string, body: BodyInit, json: boolean): Promise<Result<T>> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: json ? { "Content-Type": "application/json" } : undefined,
      body,
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.ok) {
      return {
        ok: false,
        error: payload?.error ?? "Something went wrong. Try again?",
      };
    }

    return { ok: true, data: payload as T };
  } catch {
    return { ok: false, error: "Couldn't reach the server. Check your connection?" };
  }
}

export function setStatus(
  token: string,
  postId: string,
  status: Extract<PostStatus, "approved" | "changes" | "pending">,
) {
  return post<{ status: PostStatus }>(
    "/api/approve",
    JSON.stringify({ token, postId, status }),
    true,
  );
}

export function addComment(
  token: string,
  postId: string,
  body: string,
  versionId?: string | null,
) {
  return post<{ comment: Comment }>(
    "/api/comment",
    JSON.stringify({ token, postId, body, versionId: versionId ?? null }),
    true,
  );
}

export function uploadAsset(token: string, postId: string, file: File) {
  const form = new FormData();
  form.set("token", token);
  form.set("postId", postId);
  form.set("file", file);
  return post<{ asset: ClientAsset }>("/api/client-upload", form, false);
}

/**
 * "Approve remaining" — there is no bulk endpoint, so this is the existing
 * single-item /api/approve called once per id, in sequence. Sequential
 * rather than parallel for the same reason the asset-request uploads are:
 * a client on a flaky connection gets one clear failure instead of five
 * simultaneous ones, and `onSettled` lets the caller update its optimistic
 * state item-by-item as each call actually resolves.
 */
export async function approveMany(
  token: string,
  postIds: string[],
  onSettled?: (postId: string, ok: boolean) => void,
): Promise<{ succeeded: string[]; failed: string[] }> {
  const succeeded: string[] = [];
  const failed: string[] = [];

  for (const postId of postIds) {
    const result = await setStatus(token, postId, "approved");
    if (result.ok) succeeded.push(postId);
    else failed.push(postId);
    onSettled?.(postId, result.ok);
  }

  return { succeeded, failed };
}
