"use client";

import { useState } from "react";
import { useAbsoluteUrl } from "@/components/ui/use-absolute-url";

/**
 * The review link is the whole product, so it is shown in full rather than
 * hidden behind a "copy" icon — the creator often wants to read it, paste it
 * into a message by hand, or check they're sending the right client's.
 */
export function CopyLink({ url: incoming }: { url: string }) {
  const [copied, setCopied] = useState(false);

  // Never copy a relative path — this link leaves the app the moment it is
  // pasted, so it has to carry the origin with it.
  const url = useAbsoluteUrl(incoming);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return; // Clipboard denied — the link is on screen to copy by hand.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <code className="min-w-0 flex-1 truncate rounded-soft bg-[#f4f2ec] px-3 py-2.5 font-sans text-[13px] text-muted">
        {url}
      </code>
      <button
        type="button"
        onClick={copy}
        className="hover-emphasis shrink-0 rounded-soft border-hairline border-line bg-white px-4 py-2.5 text-[13px] font-medium text-ink"
      >
        {copied ? "Copied" : "Copy link"}
      </button>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="hover-emphasis shrink-0 rounded-soft border-hairline border-line bg-white px-4 py-2.5 text-center text-[13px] font-medium text-ink"
      >
        Preview
      </a>
    </div>
  );
}
