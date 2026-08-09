"use client";

import { useState } from "react";

/** Card shell shared by every settings section. */
export function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-6">
      <h2 className="font-serif text-xl">{title}</h2>
      {description ? (
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          {description}
        </p>
      ) : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm text-muted">{label}</span>
      {children}
      {hint ? <span className="text-xs text-faint">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-soft border-hairline border-line bg-white px-4 py-3 text-[15px] text-ink outline-none placeholder:text-faint focus:border-ink";

export function Notice({
  tone,
  children,
}: {
  tone: "ok" | "bad";
  children: React.ReactNode;
}) {
  return (
    <p
      role={tone === "bad" ? "alert" : "status"}
      className={`rounded-soft px-4 py-3 text-sm leading-relaxed ${
        tone === "ok"
          ? "bg-approved-bg text-approved-fg"
          : "bg-changes-bg text-changes-fg"
      }`}
    >
      {children}
    </p>
  );
}

export function SaveButton({
  busy,
  disabled,
  children = "Save changes",
}: {
  busy: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={busy || disabled}
      className="rounded-soft bg-ink px-5 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-60"
    >
      {busy ? "Saving…" : children}
    </button>
  );
}

type State = {
  busy: boolean;
  error: string | null;
  saved: string | null;
};

/**
 * Shared save handling: one busy flag, one error slot, and a confirmation
 * that clears itself so it reads as a response to this save rather than
 * lingering as decoration.
 */
export function useSave() {
  const [state, setState] = useState<State>({
    busy: false,
    error: null,
    saved: null,
  });

  async function run(
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    message = "Saved.",
  ) {
    setState({ busy: true, error: null, saved: null });
    try {
      const result = await action();
      if (!result.ok) {
        setState({ busy: false, error: result.error, saved: null });
        return false;
      }
      setState({ busy: false, error: null, saved: message });
      setTimeout(
        () => setState((s) => (s.saved ? { ...s, saved: null } : s)),
        4000,
      );
      return true;
    } catch {
      setState({
        busy: false,
        error: "Couldn't reach the server. Check your connection?",
        saved: null,
      });
      return false;
    }
  }

  return { ...state, run };
}
