import "server-only";

import { NextResponse } from "next/server";

export const jsonOk = <T extends object>(data: T = {} as T) =>
  NextResponse.json({ ok: true, ...data });

export const jsonError = (message: string, status = 400) =>
  NextResponse.json({ ok: false, error: message }, { status });

/**
 * A public route was given a token that resolves to nothing, or a post id
 * outside that token's workspace. Both are 404 rather than 403 on purpose:
 * distinguishing them would confirm to a prober that a given post id exists.
 */
export const notFound = () => jsonError("That review link isn't valid.", 404);

export const unauthorised = () => jsonError("Please sign in first.", 401);

/** Log the real error, return a generic one. Internals stay internal. */
export function serverError(context: string, error: unknown) {
  console.error(`[signoff] ${context}`, error);
  return jsonError("Something went wrong on our end.", 500);
}

export function requiredString(
  value: FormDataEntryValue | string | null | undefined,
  max = 5000,
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}
