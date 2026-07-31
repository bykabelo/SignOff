"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePost, setPostLocked } from "@/lib/client-actions";

/** Toggle whether a deliverable is locked — shown to the client as not ready. */
export function LockToggle({
  postId,
  locked,
}: {
  postId: string;
  locked: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setPostLocked(postId, !locked);
          router.refresh();
        })
      }
      className="hover-emphasis rounded-soft border-hairline border-line bg-white px-3 py-2 text-sm text-muted disabled:opacity-60"
    >
      {locked ? "Unlock" : "Lock"}
    </button>
  );
}

/**
 * Delete, with an inline confirm step rather than a modal or a bare button.
 * This removes versions, comments and uploaded assets with it, so it should
 * take two deliberate taps.
 */
export function DeleteButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="hover-emphasis rounded-soft border-hairline border-line bg-white px-3 py-2 text-sm text-muted"
      >
        Delete
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await deletePost(postId);
            router.refresh();
          })
        }
        className="rounded-soft bg-changes-bg px-3 py-2 text-sm font-medium text-changes-fg disabled:opacity-60"
      >
        {pending ? "Deleting…" : "Really delete"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded-soft px-3 py-2 text-sm text-muted"
      >
        Keep
      </button>
    </span>
  );
}
