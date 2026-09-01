"use client";

import { useEffect, useState } from "react";
import { isAbsoluteUrl } from "@/lib/review-url";

/**
 * Guarantees an absolute URL in the browser.
 *
 * The completion happens in an effect rather than during render on purpose:
 * the server has no window to fall back to, so resolving inline would make
 * the first client render disagree with the server's HTML and trip a
 * hydration mismatch. Rendering the server's value first and upgrading it
 * on mount keeps the two passes identical.
 *
 * When NEXT_PUBLIC_APP_URL is set — as it should be — the value arrives
 * absolute and this does nothing.
 */
export function useAbsoluteUrl(value: string): string {
  const [url, setUrl] = useState(value);

  useEffect(() => {
    if (isAbsoluteUrl(value)) {
      setUrl(value);
      return;
    }
    try {
      setUrl(new URL(value, window.location.origin).toString());
    } catch {
      setUrl(value);
    }
  }, [value]);

  return url;
}
