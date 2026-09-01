"use client";

import { useState } from "react";
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

/**
 * Progress bar + status breakdown + the "Approve remaining" bulk action.
 *
 * `remainingIds` is every reviewable item not yet approved. There is no
 * bulk-approve route — the button just calls the existing single-item
 * approve action once per id (see `approveMany` in ./api) — so this stays
 * disabled/hidden whenever there is nothing left to approve.
 */
export function ReviewSummary({
  total,
  approved,
  awaiting,
  changes,
  accent,
  remainingIds,
  onApproveRemaining,
}: {
  total: number;
  approved: number;
  awaiting: number;
  changes: number;
  accent: string;
  remainingIds?: string[];
  onApproveRemaining?: (ids: string[]) => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  if (total === 0) return null;

  const pct = Math.round((approved / total) * 100);
  const canBulkApprove = Boolean(onApproveRemaining && remainingIds?.length);

  async function handleApproveRemaining() {
    if (!onApproveRemaining || !remainingIds?.length || busy) return;
    setBusy(true);
    await onApproveRemaining(remainingIds);
    setBusy(false);
  }

  return (
    <div className="mb-6 rounded-card border-hairline border-line bg-white p-4 sm:p-5">
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
        <span className="text-muted">
          {approved} of {total} approved
        </span>
        <span className="font-medium text-[#3d3d3a]">{pct}%</span>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-[#eeedea]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: accent }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {awaiting > 0 ? (
          <span
            className="rounded-full px-2.5 py-1 text-[12px] font-medium"
            style={{ background: "rgba(200,82,42,0.1)", color: accent }}
          >
            {awaiting} awaiting you
          </span>
        ) : null}
        {changes > 0 ? (
          <span className="rounded-full bg-changes-bg px-2.5 py-1 text-[12px] font-medium text-changes-fg">
            {changes} changes requested
          </span>
        ) : null}
        {awaiting === 0 && changes === 0 ? (
          <span className="rounded-full bg-approved-bg px-2.5 py-1 text-[12px] font-medium text-approved-fg">
            All caught up
          </span>
        ) : null}

        {canBulkApprove ? (
          <button
            type="button"
            onClick={handleApproveRemaining}
            disabled={busy}
            className="ml-auto whitespace-nowrap rounded-[10px] px-3.5 py-2 text-[13px] font-medium text-white transition-opacity disabled:opacity-60"
            style={{ background: accent }}
          >
            {busy ? "Approving…" : `Approve remaining (${remainingIds!.length})`}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ── Status filter tabs ──────────────────────────────────── */

export type ReviewFilter = "all" | "awaiting" | "changes" | "approved";

const FILTER_LABEL: Record<ReviewFilter, string> = {
  all: "All",
  awaiting: "Awaiting you",
  changes: "Changes requested",
  approved: "Approved",
};

/** Real counts drive every tab — no bucket is ever guessed at. */
export function FilterTabs({
  counts,
  value,
  onChange,
}: {
  counts: Record<ReviewFilter, number>;
  value: ReviewFilter;
  onChange: (filter: ReviewFilter) => void;
}) {
  return (
    <div
      className="mb-5 flex flex-wrap gap-2"
      role="tablist"
      aria-label="Filter by status"
    >
      {(Object.keys(FILTER_LABEL) as ReviewFilter[]).map((key) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(key)}
            className="whitespace-nowrap rounded-full px-3 py-[7px] text-[13px] font-medium transition-colors"
            style={{
              background: active ? "#2c2c2a" : "#fff",
              color: active ? "#fff" : "#5F5E5A",
              border: `0.5px solid ${active ? "#2c2c2a" : "#d3d1c7"}`,
            }}
          >
            {FILTER_LABEL[key]} {counts[key]}
          </button>
        );
      })}
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
