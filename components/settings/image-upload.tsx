"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clearImage } from "@/lib/settings-actions";
import { Notice } from "./section";

/**
 * Picks and uploads an avatar or agency logo.
 *
 * The picker is a labelled drop target that stays on screen in every state,
 * including once an image is set, so replacing one is the same gesture as
 * adding the first.
 */
export function ImageUpload({
  kind,
  currentUrl,
  shape,
  label,
  alt,
}: {
  kind: "avatar" | "logo";
  currentUrl: string | null;
  shape: "circle" | "rounded";
  label: string;
  alt: string;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(currentUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File | undefined) {
    if (!file || busy) return;

    setBusy(true);
    setError(null);

    const form = new FormData();
    form.set("kind", kind);
    form.set("file", file);

    try {
      const response = await fetch("/api/profile-image", {
        method: "POST",
        body: form,
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        setError(data?.error ?? "That upload didn't work. Try again?");
        return;
      }

      setUrl(data.url);
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection?");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    const result = await clearImage(
      kind === "avatar" ? "avatar_url" : "agency_logo_url",
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setUrl(null);
    router.refresh();
  }

  const frame =
    shape === "circle"
      ? "h-16 w-16 rounded-full"
      : "h-16 w-24 rounded-[10px]";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={alt}
            className={`${frame} shrink-0 border-hairline border-line object-cover`}
          />
        ) : (
          <span
            className={`${frame} flex shrink-0 items-center justify-center border-hairline border-dashed border-line bg-[#f4f2ec] text-lg text-faint`}
            aria-hidden
          >
            +
          </span>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <label className="hover-emphasis cursor-pointer rounded-soft border-hairline border-line bg-white px-4 py-2.5 text-sm font-medium text-ink">
            {busy ? "Uploading…" : url ? "Replace" : label}
            <input
              type="file"
              accept="image/*"
              disabled={busy}
              className="sr-only"
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </label>

          {url ? (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="rounded-soft px-3 py-2.5 text-sm text-muted disabled:opacity-60"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>

      <p className="text-xs text-faint">PNG, JPG or SVG, up to 4 MB.</p>

      {error ? <Notice tone="bad">{error}</Notice> : null}
    </div>
  );
}
