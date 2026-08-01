"use client";

import { getInitials } from "@/lib/format";
import type { Client } from "@/types/database";

/**
 * Header and page frame shared by both review modes.
 *
 * The client's own branding sits at the top and Signoff's is a single line
 * in the footer — this page belongs to the creator's relationship with their
 * client, not to us.
 */
export function ReviewShell({
  client,
  badge,
  children,
}: {
  client: Client;
  badge?: string | null;
  children: React.ReactNode;
}) {
  const accent = client.brand_color || "#C8522A";

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 border-b-hairline border-line bg-white px-5">
        <div className="mx-auto flex h-[58px] max-w-[680px] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {client.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={client.logo_url}
                alt={client.name}
                className="h-[34px] w-[34px] shrink-0 rounded-lg object-cover"
              />
            ) : (
              <span
                className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold tracking-[.04em] text-white"
                style={{ background: accent }}
              >
                {getInitials(client.name)}
              </span>
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-medium leading-tight text-ink">
                {client.name}
              </div>
              <div className="text-[11px] text-faint">
                {client.mode === "design" ? "Design project" : "Content review"}
              </div>
            </div>
          </div>

          {badge ? (
            <div className="shrink-0 rounded-full border-hairline border-line bg-canvas px-3 py-[5px] text-[11px] text-muted">
              {badge}
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-[680px] px-4 pb-12 pt-7">{children}</main>

      <footer className="pb-8 pt-3 text-center text-[11px] text-[#c8c6be]">
        Powered by Signoff
      </footer>
    </div>
  );
}

/** Shared progress bar. Guards against the empty case rather than dividing by zero. */
export function ReviewProgress({
  approved,
  total,
  accent,
  label = "approved",
}: {
  approved: number;
  total: number;
  accent: string;
  label?: string;
}) {
  if (total === 0) return null;

  const pct = Math.round((approved / total) * 100);

  return (
    <div className="mb-7">
      <div className="mb-1.5 flex justify-between text-[13px]">
        <span className="text-muted">
          {approved} of {total} {label}
        </span>
        <span className="font-medium text-[#3d3d3a]">{pct}%</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-[#eeedea]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: accent }}
        />
      </div>
    </div>
  );
}

/** Inline, dismissable failure notice used by both review pages. */
export function ActionError({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="mb-3 flex items-start justify-between gap-3 rounded-[10px] bg-changes-bg px-3 py-2.5 text-[13px] text-changes-fg"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 font-medium"
      >
        ✕
      </button>
    </div>
  );
}
