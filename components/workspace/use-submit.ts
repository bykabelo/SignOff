"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Shared submit handling for the workspace forms: one busy flag, one error
 * slot, and a refresh on success so the server components re-render with the
 * new row rather than the page holding a stale copy in local state.
 */
export function useSubmit() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(request: () => Promise<Response>): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const response = await request();
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        setError(data?.error ?? "Something went wrong. Try again?");
        return false;
      }

      router.refresh();
      return true;
    } catch {
      setError("Couldn't reach the server. Check your connection?");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, setError, run };
}
