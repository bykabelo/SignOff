import { statusStyle } from "@/lib/status";
import type { Post } from "@/types/database";

/**
 * Project stages, derived from the deliverables rather than stored.
 *
 * The deliverables already are the stages: one per phase, ordered by when
 * they were created, with a status the normal review workflow keeps current.
 * A separate stages table would hold the same facts a second time with
 * nothing forcing the two into agreement, so the tracker reads the work
 * itself and cannot drift out of step with it.
 */

export type StageState = "completed" | "current" | "upcoming" | "locked";

export type Stage = {
  id: string;
  name: string;
  state: StageState;
  /** Status pill, omitted for stages not yet started. */
  pill: { label: string; bg: string; fg: string } | null;
  /** A date for finished stages, a short status line otherwise. */
  detail: string | null;
  /** For locked stages: the stage that has to be approved first. */
  waitsFor: string | null;
};

/**
 * Dates are formatted with a fixed locale and timezone on purpose. The
 * tracker renders inside a client component, so a value formatted with the
 * runtime's own locale would differ between the server pass and the browser
 * pass and trip a hydration mismatch.
 */
const dayMonth = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const dayMonthYear = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDay(value: string | null | undefined) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : dayMonth.format(time);
}

export function formatFullDay(value: string | null | undefined) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : dayMonthYear.format(time);
}

/** Stages, in order, from a client's posts. */
export function deriveStages(posts: Post[]): Stage[] {
  const ordered = posts
    .filter((p) => p.kind === "deliverable" || p.kind === "asset_request")
    .slice()
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));

  // The current stage is the first one still open and not blocked. Anything
  // after it that is neither approved nor locked is simply upcoming.
  const currentIndex = ordered.findIndex(
    (p) => p.status !== "approved" && !p.locked,
  );

  return ordered.map((post, i) => {
    const name = post.title || post.caption?.slice(0, 60) || "Untitled stage";
    const previous = i > 0 ? ordered[i - 1] : null;

    if (post.status === "approved") {
      const style = statusStyle("approved", "client");
      return {
        id: post.id,
        name,
        state: "completed",
        pill: { label: style.label, bg: style.bg, fg: style.fg },
        detail: formatDay(post.status_changed_at ?? post.created_at),
        waitsFor: null,
      };
    }

    if (post.locked) {
      return {
        id: post.id,
        name,
        state: "locked",
        pill: null,
        detail: null,
        waitsFor:
          previous?.title || previous?.caption?.slice(0, 40) || null,
      };
    }

    const style = statusStyle(post.status, "client");
    const pill = { label: style.label, bg: style.bg, fg: style.fg };

    if (i === currentIndex) {
      return {
        id: post.id,
        name,
        state: "current",
        pill,
        detail:
          post.status === "waiting_on_assets"
            ? "Waiting on files from you"
            : post.status === "changes"
              ? "Changes requested — being worked on"
              : "Ready for your review",
        waitsFor: null,
      };
    }

    return {
      id: post.id,
      name,
      state: "upcoming",
      pill,
      detail: null,
      waitsFor: null,
    };
  });
}

export function stageProgress(stages: Stage[]) {
  const total = stages.length;
  const complete = stages.filter((s) => s.state === "completed").length;
  return {
    total,
    complete,
    percent: total === 0 ? 0 : Math.round((complete / total) * 100),
  };
}

/** When the project began: the first stage that exists. */
export function projectStart(posts: Post[]) {
  const times = posts
    .filter((p) => p.kind === "deliverable" || p.kind === "asset_request")
    .map((p) => new Date(p.created_at).getTime())
    .filter((t) => !Number.isNaN(t));

  return times.length ? new Date(Math.min(...times)).toISOString() : null;
}
