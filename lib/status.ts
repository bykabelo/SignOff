import type { PostStatus } from "@/types/database";

/**
 * Status presentation, shared by the workspace and both review pages so the
 * creator and the client never see the same state described two ways.
 *
 * Wording differs by audience where the same state means different things:
 * an asset request is "waiting on assets" to the creator who asked, and
 * "waiting on you" to the client who owes them.
 */
export type Audience = "creator" | "client";

export type StatusStyle = {
  label: string;
  bg: string;
  fg: string;
};

const STYLES: Record<PostStatus, { bg: string; fg: string }> = {
  approved: { bg: "#EAF3DE", fg: "#27500A" },
  pending: { bg: "#FAEEDA", fg: "#633806" },
  ready_for_review: { bg: "#FAEEDA", fg: "#633806" },
  changes: { bg: "#FAECE7", fg: "#712B13" },
  in_progress: { bg: "#F1EFE8", fg: "#5F5E5A" },
  waiting_on_assets: { bg: "#F1EFE8", fg: "#5F5E5A" },
};

const LABELS: Record<PostStatus, Record<Audience, string>> = {
  approved: { creator: "Approved", client: "Approved" },
  pending: { creator: "Awaiting review", client: "Needs your review" },
  ready_for_review: { creator: "Awaiting review", client: "Ready for you" },
  changes: { creator: "Changes requested", client: "Changes requested" },
  in_progress: { creator: "In progress", client: "In progress" },
  waiting_on_assets: {
    creator: "Waiting on assets",
    client: "Waiting on you",
  },
};

export function statusStyle(
  status: PostStatus,
  audience: Audience = "creator",
): StatusStyle {
  const style = STYLES[status] ?? STYLES.pending;
  const label = LABELS[status]?.[audience] ?? "Pending";
  return { label, ...style };
}

/** The accent for a client workspace: their brand colour, else the mode's. */
export function accentFor(client: {
  brand_color: string | null;
  mode: string;
}) {
  return client.brand_color || (client.mode === "design" ? "#534AB7" : "#C8522A");
}

/** "3 of 8 approved" — the progress line shared by every surface. */
export function progressOf(items: { status: PostStatus }[]) {
  const total = items.length;
  const approved = items.filter((i) => i.status === "approved").length;
  return {
    total,
    approved,
    percent: total === 0 ? 0 : Math.round((approved / total) * 100),
  };
}
