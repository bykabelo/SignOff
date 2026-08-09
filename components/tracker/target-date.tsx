"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setTargetDate } from "@/lib/tracker-actions";

/**
 * Creator-only control for the project's estimated completion date.
 *
 * Kept out of ProgressTracker so that component stays presentational and
 * can be rendered unchanged on the public review page, where nothing is
 * editable.
 */
export function TargetDateControl({
  clientId,
  value,
}: {
  clientId: string;
  value: string | null;
}) {
  const router = useRouter();
  const [date, setDate] = useState(value ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(next: string) {
    setBusy(true);
    setError(null);
    setSaved(false);

    const result = await setTargetDate(clientId, next || null);
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    router.refresh();
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-sm text-muted">
        Estimated completion
        <input
          type="date"
          value={date}
          disabled={busy}
          onChange={(e) => {
            setDate(e.target.value);
            save(e.target.value);
          }}
          className="rounded-soft border-hairline border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-ink disabled:opacity-60"
        />
      </label>

      {date ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setDate("");
            save("");
          }}
          className="text-sm text-muted underline underline-offset-4 disabled:opacity-60"
        >
          Clear
        </button>
      ) : null}

      {saved ? (
        <span role="status" className="text-sm text-approved-fg">
          Saved
        </span>
      ) : null}
      {error ? (
        <span role="alert" className="text-sm text-changes-fg">
          {error}
        </span>
      ) : null}
    </div>
  );
}
