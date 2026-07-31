"use client";

import { useEffect, useState } from "react";

/**
 * File picker with an inline preview.
 *
 * The whole control is a visible, labelled drop target rather than a bare
 * `<input type=file>` — and it stays visible in every state, including after
 * a file is chosen, so the creator can swap it without hunting.
 */
export function FileInput({
  name = "file",
  accept = "image/*",
  label = "Choose an image",
  required,
}: {
  name?: string;
  accept?: string;
  label?: string;
  required?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    // Object URLs are held until revoked; without this every re-pick leaks.
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <label className="hover-emphasis flex cursor-pointer items-center gap-4 rounded-soft border-hairline border-dashed border-line bg-white p-4">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt=""
          className="h-14 w-14 shrink-0 rounded-[10px] object-cover"
        />
      ) : (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] bg-[#f4f2ec] text-lg text-faint">
          +
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-ink">
          {file ? file.name : label}
        </span>
        <span className="mt-0.5 block text-xs text-faint">
          {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "Up to 4 MB"}
        </span>
      </span>

      <input
        type="file"
        name={name}
        accept={accept}
        required={required}
        className="sr-only"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}
