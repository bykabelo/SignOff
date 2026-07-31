import "server-only";

/**
 * Upload validation shared by the creator and client upload routes.
 *
 * /api/client-upload is reachable by anyone holding a review link, so size
 * and type limits are load-bearing there rather than cosmetic.
 */

/**
 * 4 MB, sized to Vercel's 4.5 MB serverless request body cap rather than to
 * Supabase Storage, which would happily take far more. A larger limit here
 * would pass validation and then fail as a 413 at the platform edge in
 * production, which is the worst place to discover it.
 *
 * To lift this: have the browser upload straight to Supabase Storage with a
 * signed upload URL and POST only the resulting key to these routes, so the
 * file never travels through a serverless function.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** Creator uploads are images — social posts and design deliverables. */
export const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];

/**
 * Clients send back headshots, copy and brand files, so this is wider:
 * images plus the document and archive formats a brand handover arrives in.
 */
export const CLIENT_ASSET_TYPES = [
  ...IMAGE_TYPES,
  "image/svg+xml",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "font/otf",
  "font/ttf",
];

export type FileCheck =
  | { ok: true; file: File }
  | { ok: false; error: string };

export function checkFile(
  value: FormDataEntryValue | null,
  allowed: string[],
): FileCheck {
  if (!value || typeof value === "string") {
    return { ok: false, error: "No file was attached." };
  }

  const file = value as File;

  if (file.size === 0) {
    return { ok: false, error: "That file is empty." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `Files need to be under ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`,
    };
  }
  if (!allowed.includes(file.type)) {
    return { ok: false, error: `${file.type || "That file type"} isn't supported.` };
  }

  return { ok: true, file };
}

/**
 * Build a storage key. The original filename is never used as the path:
 * it is attacker-controlled on the client-upload route, and slashes or
 * traversal segments in it would place the object somewhere unintended.
 */
export function storageKey(prefix: string[], filename: string) {
  const ext = filename.includes(".")
    ? filename.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "")
    : "";
  const name = `${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
  return [...prefix.map(sanitiseSegment), name].join("/");
}

function sanitiseSegment(segment: string) {
  return segment.replace(/[^a-zA-Z0-9_-]/g, "") || "x";
}

/** Keep the human-readable name for display, without trusting it as a path. */
export function displayName(filename: string) {
  return filename.split(/[\\/]/).pop()?.slice(0, 200) || "file";
}
