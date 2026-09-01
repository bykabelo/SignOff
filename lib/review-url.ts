/**
 * Review link construction.
 *
 * A review link is the product: it gets pasted into a text or an email and
 * opened by someone with no account, so it has to be absolute every time.
 * The failure this guards against is quiet — NEXT_PUBLIC_APP_URL is inlined
 * at build time, so a deployment built before the variable was set carries
 * `undefined`, and `${appUrl}/review/x` degrades to a relative path that
 * looks fine in the dashboard and is broken everywhere else.
 *
 * Safe to import from server and client alike.
 */

export const REVIEW_PATH = "/review";

/**
 * Trim a base URL to something safe to concatenate: no trailing slash, and
 * a protocol, since "trysignoff.vercel.app/review/x" is not a link a mail
 * client will make clickable.
 */
export function normaliseBaseUrl(base: string | null | undefined): string {
  const raw = (base ?? "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

/** The app's own origin from the environment, or "" when it isn't set. */
export function appBaseUrl(): string {
  return normaliseBaseUrl(process.env.NEXT_PUBLIC_APP_URL);
}

/**
 * Build a review link. Returns a relative path only when no base is
 * available at all — `useAbsoluteUrl` completes it in the browser.
 */
export function buildReviewUrl(
  token: string,
  base?: string | null,
): string {
  const root = normaliseBaseUrl(base ?? process.env.NEXT_PUBLIC_APP_URL);
  return `${root}${REVIEW_PATH}/${token}`;
}

export const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);
