/**
 * Presentation helpers shared by the client components.
 *
 * Pure and dependency-free so they can run on either side of the boundary.
 */

/** "Central City Market" → "CCM". Used wherever a client has no logo. */
export function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "?"
  );
}

/** "2 hours ago". Coarse on purpose — exact minutes aren't the point. */
export function relativeTime(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 45) return "just now";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;

  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;

  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * "Week of 26 May – 1 Jun" from a set of timestamps.
 *
 * The review page header showed a hardcoded week label. There is no week
 * column to read, so it is derived from the span of the work on the page,
 * and omitted entirely when there is nothing to span.
 */
export function spanLabel(dates: string[]): string | null {
  const times = dates
    .map((d) => new Date(d).getTime())
    .filter((t) => !Number.isNaN(t));

  if (times.length === 0) return null;

  const fmt = (t: number) =>
    new Date(t).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    });

  const first = fmt(Math.min(...times));
  const last = fmt(Math.max(...times));

  return first === last ? first : `${first} – ${last}`;
}

/** "Good morning" / "Good afternoon" / "Good evening" in the viewer's clock. */
export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * "251 characters · 4 hashtags" — both counted straight off the caption
 * string a client is actually looking at, never a separate stored value
 * that could drift from it.
 */
export function captionStats(caption: string) {
  const hashtags = caption.match(/#\w+/g)?.length ?? 0;
  return `${caption.length} character${caption.length === 1 ? "" : "s"}${
    hashtags > 0 ? ` · ${hashtags} hashtag${hashtags === 1 ? "" : "s"}` : ""
  }`;
}

/** A small warm palette to pick a comment avatar color from, deterministically. */
const AVATAR_COLORS = [
  "#C8522A",
  "#534AB7",
  "#5c6b52",
  "#9c5b3f",
  "#4a6b78",
  "#6b5b7a",
];

/** Same name always gets the same color, so a commenter is recognisable
 *  across a thread without storing a color anywhere. */
export function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
