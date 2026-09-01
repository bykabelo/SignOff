"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClientRecord } from "@/lib/client-actions";
import { getInitials, greeting, relativeTime } from "@/lib/format";
import { accentFor } from "@/lib/status";
import { buildReviewUrl } from "@/lib/review-url";
import { useAbsoluteUrl } from "@/components/ui/use-absolute-url";
import { StatusPill } from "@/components/ui/status-pill";
import type {
  ActivityItem,
  ClientSummary,
  DashboardData,
  NeedsAttentionItem,
} from "@/lib/data";
import type { ClientMode } from "@/types/database";

/* ── Icons ───────────────────────────────────────────────── */

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const UsersIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
  </svg>
);

const ClockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 15 14" />
  </svg>
);

const GridIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="17" rx="2.5" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="16" y1="2" x2="16" y2="6" />
  </svg>
);

const TrendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 16 9 10 13 14 21 6" />
    <polyline points="15 6 21 6 21 12" />
  </svg>
);

const AddUserIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C8522A" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" />
    <line x1="16" y1="11" x2="22" y2="11" />
  </svg>
);

/* ── Stat cards ──────────────────────────────────────────── */

function StatCard({
  label,
  value,
  sub,
  alert,
  icon,
}: {
  label: string;
  value: number;
  sub: string;
  alert: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-card border-hairline border-line bg-white p-4 shadow-card sm:p-5">
      <div className="mb-5 flex items-center justify-between gap-2">
        <span
          className="text-[12.5px] font-medium sm:text-[13px]"
          style={{ color: alert ? "#C8522A" : "#888780" }}
        >
          {label}
        </span>
        <span style={{ color: alert ? "#C8522A" : "rgba(44,44,42,0.3)" }}>{icon}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className="font-serif text-[32px] leading-none sm:text-[36px]"
          style={{ color: alert ? "#C8522A" : "#2c2c2a" }}
        >
          {value}
        </span>
        <span className="text-[12.5px] text-muted">{sub}</span>
      </div>
    </div>
  );
}

function TurnaroundCard({
  avgDays,
  trend,
}: {
  avgDays: number | null;
  trend: number[];
}) {
  const max = Math.max(...trend, 0.1);
  const heights = trend.map((v) => (v <= 0 ? 6 : Math.max(12, Math.round((v / max) * 100))));

  return (
    <div className="rounded-card border-hairline border-line bg-white p-4 shadow-card sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-medium text-muted sm:text-[13px]">
          Avg. turnaround
        </span>
        <span className="text-[rgba(44,44,42,0.3)]">
          <TrendIcon />
        </span>
      </div>
      <div className="mb-3.5 flex items-baseline gap-2">
        <span className="font-serif text-[32px] leading-none sm:text-[36px]">
          {avgDays !== null ? avgDays : "—"}
        </span>
        {avgDays !== null ? <span className="text-[13px] text-muted">days</span> : null}
      </div>
      {avgDays !== null ? (
        <div className="flex h-[22px] items-end gap-[3px]">
          {heights.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-[rgba(44,44,42,0.16)]"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-faint">No approvals yet</p>
      )}
    </div>
  );
}

/* ── Needs attention ─────────────────────────────────────── */

function NeedsAttentionRow({ item, last }: { item: NeedsAttentionItem; last: boolean }) {
  const overdue = item.kind === "overdue";
  const tint = overdue ? "rgba(200,82,42,0.1)" : "rgba(44,44,42,0.07)";
  const tintFg = overdue ? "#C8522A" : "#2c2c2a";
  const tagBg = overdue ? "rgba(200,82,42,0.12)" : "rgba(44,44,42,0.07)";
  const tagFg = overdue ? "#C8522A" : "rgba(44,44,42,0.7)";

  return (
    <div
      className={`flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6 ${
        last ? "" : "border-b-hairline border-[#f0eeea]"
      }`}
    >
      <span
        className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] text-[15px] font-bold"
        style={{ background: tint, color: tintFg }}
      >
        {overdue ? "!" : "↺"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 truncate text-[15px] font-medium text-ink">
          {item.clientName} — {item.postTitle}
        </div>
        <div className="truncate text-[13.5px] text-muted">{item.meta}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <span
          className="whitespace-nowrap rounded-full px-2.5 py-[5px] text-[12px] font-medium"
          style={{ background: tagBg, color: tagFg }}
        >
          {overdue ? "Overdue" : "Revisions"}
        </span>
        <Link
          href={`/dashboard/clients/${item.clientId}`}
          className="hover-emphasis whitespace-nowrap rounded-[9px] border-hairline border-[#d3d1c7] px-3.5 py-2 text-[13px] font-medium text-ink"
        >
          Review
        </Link>
      </div>
    </div>
  );
}

function NeedsAttention({ items }: { items: NeedsAttentionItem[] }) {
  return (
    <section className="mb-10 sm:mb-12" style={{ animation: "slideUp .35s ease .06s both" }}>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-[22px] sm:text-[26px]">Needs attention</h2>
        <span className="text-[13px] text-muted">
          {items.length} item{items.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="card overflow-hidden">
        {items.length === 0 ? (
          <div className="px-5 py-9 text-center text-sm text-faint">
            Nothing needs your attention right now.
          </div>
        ) : (
          items.map((item, i) => (
            <NeedsAttentionRow key={item.id} item={item} last={i === items.length - 1} />
          ))
        )}
      </div>
    </section>
  );
}

/* ── Client card ─────────────────────────────────────────── */

function ClientCard({
  client,
  onClick,
}: {
  client: ClientSummary;
  onClick: (client: ClientSummary) => void;
}) {
  const color = accentFor(client);
  const initials = getInitials(client.name);
  const pct = client.total === 0 ? 0 : Math.round((client.approved / client.total) * 100);
  const modeLabel = client.mode === "design" ? "Design project" : "Social content";

  const status =
    client.total === 0
      ? { label: "Drafting", bg: "rgba(44,44,42,0.07)", fg: "rgba(44,44,42,0.7)" }
      : client.hasOverdue
        ? { label: "Overdue", bg: "rgba(200,82,42,0.12)", fg: "#C8522A" }
        : client.awaiting === 0
          ? { label: "All approved", bg: "rgba(92,107,82,0.14)", fg: "#4a5a41" }
          : { label: "In review", bg: "rgba(44,44,42,0.07)", fg: "rgba(44,44,42,0.7)" };

  const footerLeft = client.lastActivityAt
    ? `Updated ${relativeTime(client.lastActivityAt)}`
    : "No posts yet";
  const footerRight =
    client.total === 0
      ? "Nothing yet"
      : client.awaiting === 0
        ? "Nothing pending"
        : `${client.awaiting} pending`;

  return (
    <button
      type="button"
      onClick={() => onClick(client)}
      className="hover-emphasis card w-full p-5 text-left"
      style={{ transition: "border-color .15s ease, transform .15s ease" }}
    >
      <div className="mb-5 flex items-center gap-3">
        {client.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={client.logo_url}
            alt=""
            className="h-[38px] w-[38px] shrink-0 rounded-[11px] object-cover"
          />
        ) : (
          <span
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] text-[15px] font-semibold text-white"
            style={{ background: color }}
          >
            {initials}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15.5px] font-semibold tracking-[-.01em] text-ink">
            {client.name}
          </div>
          <div className="mt-0.5 truncate text-[12.5px] text-muted">{modeLabel}</div>
        </div>
        <span
          className="shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-medium"
          style={{ background: status.bg, color: status.fg }}
        >
          {status.label}
        </span>
      </div>

      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[13px] text-muted">
          {client.total === 0 ? "Nothing added yet" : `${client.approved} of ${client.total} approved`}
        </span>
        <span className="font-serif text-base text-ink">{pct}%</span>
      </div>
      <div className="mb-4 h-[5px] overflow-hidden rounded-full bg-[#eeedea]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>

      <div className="flex items-center justify-between border-t-hairline border-[#f0eeea] pt-3.5">
        <span className="truncate text-[12.5px] text-faint">{footerLeft}</span>
        <span
          className="shrink-0 pl-2 text-[12.5px] font-medium"
          style={{ color: client.awaiting > 0 ? color : "rgba(44,44,42,0.45)" }}
        >
          {footerRight}
        </span>
      </div>
    </button>
  );
}

/* ── Quick-look sheet ────────────────────────────────────── */

function ClientSheet({
  client,
  appUrl,
  onClose,
}: {
  client: ClientSummary;
  appUrl: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const color = accentFor(client);
  const pct =
    client.total === 0 ? 0 : Math.round((client.approved / client.total) * 100);
  // Absolute always: this is copied and pasted into a message.
  const reviewUrl = useAbsoluteUrl(buildReviewUrl(client.review_token, appUrl));

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(reviewUrl);
    } catch {
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[rgba(26,25,23,0.5)]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={client.name}
    >
      <div
        className="max-h-[85vh] w-full max-w-[700px] overflow-y-auto rounded-t-[18px] bg-white px-5 pb-8 pt-6"
        style={{ animation: "slideUp .3s cubic-bezier(.32,.72,0,1)" }}
      >
        <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-line" />

        <div className="mb-5 flex items-center gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-[11px] font-semibold tracking-[.04em] text-white"
            style={{ background: color }}
          >
            {getInitials(client.name)}
          </span>
          <div className="min-w-0">
            <div className="truncate text-base font-medium text-ink">
              {client.name}
            </div>
            <div className="text-xs text-muted">
              {client.mode === "design" ? "Design project" : "Social content"} ·{" "}
              {client.approved} of {client.total} approved
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto p-1 text-faint"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="mb-[18px]">
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="text-muted">Approval progress</span>
            <span className="font-medium text-ink">{pct}%</span>
          </div>
          <div className="h-[5px] overflow-hidden rounded-full bg-[#eeedea]">
            <div
              className="h-full rounded-full"
              style={{ width: `${pct}%`, background: color }}
            />
          </div>
        </div>

        <div className="mb-[18px] flex items-center justify-between gap-2 rounded-[10px] bg-[#f4f2ec] px-3.5 py-3">
          <div className="min-w-0">
            <div className="mb-0.5 text-[11px] text-muted">Review link</div>
            <div className="truncate text-xs text-[#3d3d3a]">{reviewUrl}</div>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 whitespace-nowrap rounded-lg border-hairline border-[#d3d1c7] px-2.5 py-[5px] text-[11px] transition-all"
            style={{
              background: copied ? "#EAF3DE" : "transparent",
              color: copied ? "#27500A" : "#888780",
            }}
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>

        <div className="mb-2 text-xs font-medium text-muted">
          {client.mode === "design" ? "Deliverables" : "Posts"}
        </div>

        {client.posts.length === 0 ? (
          <p className="py-4 text-sm text-faint">
            Nothing added yet.
          </p>
        ) : (
          <div>
            {client.posts.map((post, i) => (
              <div
                key={post.id}
                className={`flex items-center gap-3 py-2.5 ${
                  i < client.posts.length - 1
                    ? "border-b-hairline border-[#f0eeea]"
                    : ""
                }`}
              >
                {post.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.image_url}
                    alt=""
                    loading="lazy"
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <span className="h-12 w-12 shrink-0 rounded-lg bg-[#f4f2ec]" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-ink">
                    {post.title || post.caption || "Untitled"}
                  </div>
                  {post.scheduled_for ? (
                    <div className="mt-0.5 text-[11px] text-faint">
                      {post.scheduled_for}
                    </div>
                  ) : null}
                </div>
                <StatusPill status={post.status} />
              </div>
            ))}
          </div>
        )}

        <div className="mt-[18px] grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="hover-emphasis rounded-[10px] border-hairline border-[#d3d1c7] py-2.5 text-[13px] text-[#5F5E5A]"
          >
            Close
          </button>
          <Link
            href={`/dashboard/clients/${client.id}`}
            className="flex items-center justify-center gap-1.5 rounded-[10px] py-2.5 text-[13px] font-medium text-white"
            style={{ background: color }}
          >
            <PlusIcon />
            {client.mode === "design" ? "Add deliverable" : "Add post"}
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── New client ──────────────────────────────────────────── */

function NewClientModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#C8522A");
  const [mode, setMode] = useState<ClientMode>("social");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [atLimit, setAtLimit] = useState(false);

  async function handleCreate() {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);

    const result = await createClientRecord({ name, mode, brandColor: color });
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      // Hitting the plan ceiling is not a failure to apologise for — it is
      // the moment to offer the upgrade.
      setAtLimit(Boolean(result.atLimit));
      return;
    }

    onClose();
    // Straight into the new workspace — a new client with nothing in it is
    // not somewhere to linger.
    router.push(`/dashboard/clients/${result.client.id}`);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(26,25,23,0.5)] p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="New client"
    >
      <div
        className="w-full max-w-[420px] rounded-[18px] bg-white px-[22px] py-6"
        style={{ animation: "slideUp .25s ease" }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-base text-ink">New client</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 text-muted"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="mb-3.5">
          <label className="mb-1.5 block text-xs text-muted">Client name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="e.g. Revhaus Studio"
            autoFocus
            className="w-full rounded-[10px] border-hairline border-[#d3d1c7] px-3 py-2.5 text-sm text-ink outline-none placeholder:text-faint focus:border-ink"
          />
        </div>

        <div className="mb-3.5">
          <span className="mb-1.5 block text-xs text-muted">
            What kind of work?
          </span>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: "social", label: "Social content" },
                { value: "design", label: "Design project" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMode(option.value)}
                aria-pressed={mode === option.value}
                className={`rounded-[10px] border-[1.5px] px-3 py-2.5 text-[13px] transition-all ${
                  mode === option.value
                    ? "border-ink font-medium text-ink"
                    : "border-line text-muted"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="mb-1.5 block text-xs text-muted">Brand color</label>
          <div className="flex items-center gap-2.5">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              aria-label="Brand colour"
              className="h-[38px] w-[38px] cursor-pointer rounded-lg border-hairline border-[#d3d1c7] p-[3px]"
            />
            <span className="text-[13px] text-muted">
              Pick a color to match their brand
            </span>
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            className={`mb-3 rounded-[10px] px-3.5 py-2.5 text-[13px] ${
              atLimit
                ? "bg-pending-bg text-pending-fg"
                : "bg-changes-bg text-changes-fg"
            }`}
          >
            {error}
          </div>
        ) : null}

        {atLimit ? (
          <Link
            href="/dashboard/billing"
            className="block w-full rounded-[10px] bg-[#1a1917] py-3 text-center text-sm font-medium text-white"
          >
            See plans
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleCreate}
            disabled={!name.trim() || busy}
            className="w-full rounded-[10px] py-3 text-sm font-medium text-white transition-colors"
            style={{ background: name.trim() && !busy ? "#1a1917" : "#d3d1c7" }}
          >
            {busy ? "Creating…" : "Create client workspace"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────── */

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      className="card mx-auto flex max-w-[560px] flex-col items-center px-6 py-14 text-center sm:px-10 sm:py-16"
      style={{ animation: "slideUp .35s ease .05s both" }}
    >
      <div
        className="mb-6 flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: "rgba(200,82,42,0.1)" }}
      >
        <AddUserIcon />
      </div>
      <h2 className="mb-3 text-[26px] leading-tight sm:text-[28px]">
        Let&rsquo;s add your first client
      </h2>
      <p className="mb-8 max-w-[38ch] text-[14px] leading-relaxed text-muted sm:text-[15px]">
        Create a client workspace, share one review link, and their approvals,
        comments and files start showing up right here.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="hover-emphasis flex items-center gap-2 rounded-soft bg-[#1a1917] px-5 py-3 text-sm font-medium text-white"
      >
        <PlusIcon /> Add your first client
      </button>
    </div>
  );
}

/* ── Activity ────────────────────────────────────────────── */

const ACTIVITY_DOT: Record<ActivityItem["kind"], string> = {
  approved: "#5c6b52",
  comment: "#C8522A",
  changes: "#C8522A",
  asset: "#534AB7",
};

function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="card px-[18px] py-8 text-center text-sm text-faint">
        Nothing yet. When a client approves or comments, it shows up here.
      </div>
    );
  }

  return (
    <div className="card px-[18px] py-1">
      {items.map((item, i) => (
        <div
          key={item.id}
          className={`flex items-start gap-2.5 py-3 ${
            i < items.length - 1 ? "border-b-hairline border-[#f0eeea]" : ""
          }`}
        >
          <span
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
            style={{ background: ACTIVITY_DOT[item.kind] }}
          />
          <div className="min-w-0">
            <div className="mb-0.5 text-[13.5px] leading-relaxed text-ink">
              <span className="font-medium">{item.clientName}</span>{" "}
              {item.kind === "approved" ? "approved " : null}
              {item.kind === "changes" ? "asked for changes on " : null}
              {item.kind === "comment" ? "left a comment on " : null}
              {item.kind === "asset" ? "sent a file for " : null}
              <Link
                href={`/dashboard/clients/${item.clientId}`}
                className="font-medium underline-offset-2 hover:underline"
              >
                {item.postTitle}
              </Link>
            </div>
            {item.body ? (
              <p className="mb-1 line-clamp-2 text-[13px] leading-relaxed text-muted">
                {item.body}
              </p>
            ) : null}
            <div className="text-[11.5px] text-faint">
              {relativeTime(item.at)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── This week ───────────────────────────────────────────── */

function WeekInReview({
  approved,
  revisions,
  posts,
  scheduled,
}: {
  approved: number;
  revisions: number;
  posts: number;
  scheduled: number;
}) {
  return (
    <div className="mt-4 rounded-card border-hairline border-[#e2dfd2] bg-[#f3efe7] p-5 sm:p-6">
      <div className="mb-2 font-serif text-[19px]">This week</div>
      <p className="mb-[18px] text-[13.5px] leading-relaxed text-muted">
        {posts === 0
          ? "No posts added yet this week."
          : `${posts} post${posts === 1 ? "" : "s"} added${
              scheduled > 0 ? `, ${scheduled} scheduled` : ""
            }.`}
      </p>
      <div className="flex gap-7">
        <div>
          <div className="font-serif text-[26px] leading-none">{approved}</div>
          <div className="mt-[5px] text-xs text-muted">Approved this week</div>
        </div>
        <div>
          <div className="font-serif text-[26px] leading-none">{revisions}</div>
          <div className="mt-[5px] text-xs text-muted">Revisions requested</div>
        </div>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────── */

export function DashboardPage({
  data,
  userName,
  appUrl,
  todayLabel,
}: {
  data: DashboardData;
  userName: string;
  appUrl: string;
  todayLabel: string;
}) {
  const [selected, setSelected] = useState<ClientSummary | null>(null);
  const [showNewClient, setShowNewClient] = useState(false);

  const firstName = userName.split(" ")[0] || "there";
  const { clients, activity, needsAttention, metrics } = data;

  const newClientsThisMonth = clients.filter(
    (c) => Date.now() - new Date(c.created_at).getTime() < 30 * 24 * 60 * 60 * 1000,
  ).length;

  const summaryParts: string[] = [
    `${clients.length} client${clients.length === 1 ? "" : "s"} active`,
  ];
  if (metrics.awaitingReview > 0) {
    summaryParts.push(
      `${metrics.awaitingReview} review${metrics.awaitingReview === 1 ? "" : "s"} pending`,
    );
  }
  if (metrics.overdueCount > 0) {
    summaryParts.push(
      `${metrics.overdueCount} overdue`,
    );
  }

  return (
    <>
      <div
        className="mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between"
        style={{ animation: "slideUp .35s ease" }}
      >
        <div className="min-w-0">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[.1em] text-faint">
            {todayLabel}
          </p>
          <h1 className="mb-2 text-[30px] leading-[1.08] tracking-[-.015em] sm:text-[40px]">
            {greeting()}, {firstName}.
          </h1>
          <p className="max-w-[46ch] text-[14px] leading-relaxed text-muted sm:text-[15.5px]">
            {summaryParts.join(" · ")}.
          </p>
        </div>
        {clients.length > 0 ? (
          <div className="flex shrink-0 gap-2.5">
            <a
              href="#activity"
              className="hover-emphasis whitespace-nowrap rounded-soft border-hairline border-line px-4 py-2.5 text-[13.5px] font-medium text-ink"
            >
              View activity
            </a>
            <button
              type="button"
              onClick={() => setShowNewClient(true)}
              className="hover-emphasis flex shrink-0 items-center gap-[7px] whitespace-nowrap rounded-soft bg-[#1a1917] px-4 py-2.5 text-[13.5px] font-medium text-white"
            >
              <PlusIcon /> New client
            </button>
          </div>
        ) : null}
      </div>

      {clients.length === 0 ? (
        <EmptyState onAdd={() => setShowNewClient(true)} />
      ) : (
        <>
          <div
            className="mb-10 grid grid-cols-2 gap-3 sm:mb-12 sm:gap-4 lg:grid-cols-4"
            style={{ animation: "slideUp .35s ease .03s both" }}
          >
            <StatCard
              label="Active clients"
              value={metrics.clients}
              sub={newClientsThisMonth > 0 ? `+${newClientsThisMonth} this month` : "No new clients yet"}
              alert={false}
              icon={<UsersIcon />}
            />
            <StatCard
              label="Pending approvals"
              value={metrics.awaitingReview}
              sub={
                metrics.overdueCount > 0
                  ? `${metrics.overdueCount} overdue`
                  : metrics.awaitingReview > 0
                    ? "All on track"
                    : "Nothing pending"
              }
              alert={metrics.awaitingReview > 0}
              icon={<ClockIcon />}
            />
            <StatCard
              label="Posts this week"
              value={metrics.postsThisWeek}
              sub={`${metrics.scheduledThisWeek} scheduled`}
              alert={false}
              icon={<GridIcon />}
            />
            <TurnaroundCard avgDays={metrics.avgTurnaroundDays} trend={metrics.turnaroundTrend} />
          </div>

          <NeedsAttention items={needsAttention} />

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.55fr_1fr] lg:items-start lg:gap-10">
            <section className="min-w-0" style={{ animation: "slideUp .35s ease .09s both" }}>
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-[22px] sm:text-[26px]">Clients</h2>
                <span className="text-[13px] text-muted">
                  {clients.length} total
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {clients.map((client) => (
                  <ClientCard key={client.id} client={client} onClick={setSelected} />
                ))}
              </div>
            </section>

            <section
              id="activity"
              className="min-w-0 scroll-mt-6"
              style={{ animation: "slideUp .35s ease .12s both" }}
            >
              <h2 className="mb-4 text-[22px] sm:text-[26px]">Recent activity</h2>
              <ActivityFeed items={activity} />
              <WeekInReview
                approved={metrics.approvedThisWeek}
                revisions={metrics.revisionsThisWeek}
                posts={metrics.postsThisWeek}
                scheduled={metrics.scheduledThisWeek}
              />
            </section>
          </div>
        </>
      )}

      {selected ? (
        <ClientSheet
          client={selected}
          appUrl={appUrl}
          onClose={() => setSelected(null)}
        />
      ) : null}

      {showNewClient ? (
        <NewClientModal onClose={() => setShowNewClient(false)} />
      ) : null}
    </>
  );
}
