"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClientRecord } from "@/lib/client-actions";
import { getInitials, greeting, relativeTime } from "@/lib/format";
import { accentFor, statusStyle } from "@/lib/status";
import type { ActivityItem, ClientSummary, DashboardData } from "@/lib/data";
import type { ClientMode, Post } from "@/types/database";

/* ── Icons ───────────────────────────────────────────────── */

const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path
      d="M6 4l4 4-4 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

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

/* ── Pieces ──────────────────────────────────────────────── */

function StatusPill({ status }: { status: Post["status"] }) {
  const { label, bg, fg } = statusStyle(status, "creator");
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-[3px] text-[11px] font-medium"
      style={{ background: bg, color: fg }}
    >
      {label}
    </span>
  );
}

function MiniProgress({
  approved,
  total,
  color,
}: {
  approved: number;
  total: number;
  color: string;
}) {
  const pct = total === 0 ? 0 : Math.round((approved / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-[#eeedea]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="whitespace-nowrap text-[11px] text-faint">
        {approved} / {total}
      </span>
    </div>
  );
}

function ClientRow({
  client,
  onClick,
  last,
}: {
  client: ClientSummary;
  onClick: (client: ClientSummary) => void;
  last: boolean;
}) {
  const color = accentFor(client);
  const initials = getInitials(client.name);

  return (
    <button
      type="button"
      onClick={() => onClick(client)}
      className={`hover-emphasis flex w-full items-center gap-3.5 px-[18px] py-3.5 text-left ${
        last ? "" : "border-b-hairline border-[#f0eeea]"
      }`}
    >
      {client.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={client.logo_url}
          alt=""
          className="h-[38px] w-[38px] shrink-0 rounded-[9px] object-cover"
        />
      ) : (
        <span
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[9px] text-[10px] font-semibold tracking-[.04em] text-white"
          style={{ background: color }}
        >
          {initials}
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="mb-1.5 flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-ink">
            {client.name}
          </span>
          {client.total === 0 ? (
            <span className="shrink-0 rounded-full bg-waiting-bg px-2.5 py-[3px] text-[11px] font-medium text-waiting-fg">
              Nothing yet
            </span>
          ) : client.awaiting === 0 ? (
            <span className="shrink-0 rounded-full bg-approved-bg px-2.5 py-[3px] text-[11px] font-medium text-approved-fg">
              All approved
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-pending-bg px-2.5 py-[3px] text-[11px] font-medium text-pending-fg">
              {client.awaiting} pending
            </span>
          )}
        </span>
        <MiniProgress
          approved={client.approved}
          total={client.total}
          color={color}
        />
      </span>

      <span className="shrink-0 text-[#c8c6be]">
        <ChevronRight />
      </span>
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
  const reviewUrl = `${appUrl}/review/${client.review_token}`;

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

/* ── Activity ────────────────────────────────────────────── */

const ACTIVITY_DOT: Record<ActivityItem["kind"], string> = {
  approved: "#639922",
  comment: "#D85A30",
  changes: "#D85A30",
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
            className="mt-1 h-2 w-2 shrink-0 rounded-full"
            style={{ background: ACTIVITY_DOT[item.kind] }}
          />
          <div className="min-w-0">
            <div className="mb-0.5 text-[13px] leading-relaxed text-ink">
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
            <div className="text-[11px] text-faint">
              {relativeTime(item.at)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────── */

export function DashboardPage({
  data,
  userName,
  appUrl,
}: {
  data: DashboardData;
  userName: string;
  appUrl: string;
}) {
  const [tab, setTab] = useState<"clients" | "activity">("clients");
  const [selected, setSelected] = useState<ClientSummary | null>(null);
  const [showNewClient, setShowNewClient] = useState(false);

  const firstName = userName.split(" ")[0] || "there";
  const { clients, activity, metrics } = data;

  return (
    <>
      <div
        className="mb-[22px] flex items-end justify-between gap-4"
        style={{ animation: "slideUp .35s ease" }}
      >
        <div className="min-w-0">
          <h1 className="mb-1 text-[22px] tracking-[-.02em]">
            {greeting()}, {firstName}.
          </h1>
          <p className="text-[13px] text-muted">
            {clients.length} client{clients.length === 1 ? "" : "s"} active ·{" "}
            {metrics.awaitingReview} review
            {metrics.awaitingReview === 1 ? "" : "s"} pending
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewClient(true)}
          className="flex shrink-0 items-center gap-[7px] rounded-[10px] bg-[#1a1917] px-4 py-2.5 text-[13px] font-medium text-white transition-opacity hover:opacity-[.85]"
        >
          <PlusIcon /> New client
        </button>
      </div>

      <div
        className="mb-[22px] grid grid-cols-3 gap-2.5"
        style={{ animation: "slideUp .35s ease .05s both" }}
      >
        {[
          { label: "Active clients", value: metrics.clients, alert: false },
          {
            label: "Awaiting review",
            value: metrics.awaitingReview,
            alert: metrics.awaitingReview > 0,
          },
          {
            label: "Approved this week",
            value: metrics.approvedThisWeek,
            alert: false,
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className="rounded-[10px] bg-white px-4 py-3.5 shadow-card"
          >
            <div className="mb-1.5 text-[11px] text-muted">{metric.label}</div>
            <div
              className="text-2xl font-medium"
              style={{ color: metric.alert ? "#D85A30" : "#2c2c2a" }}
            >
              {metric.value}
            </div>
          </div>
        ))}
      </div>

      <div
        className="mb-[18px] flex border-b-hairline border-line"
        style={{ animation: "slideUp .35s ease .08s both" }}
      >
        {(["clients", "activity"] as const).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            aria-current={tab === name}
            className="px-3.5 py-2 text-[13px] capitalize transition-colors"
            style={{
              borderBottom:
                tab === name ? "2px solid #2c2c2a" : "2px solid transparent",
              color: tab === name ? "#2c2c2a" : "#888780",
              fontWeight: tab === name ? 500 : 400,
            }}
          >
            {name}
          </button>
        ))}
      </div>

      {tab === "clients" ? (
        <div className="card overflow-hidden" style={{ animation: "slideUp .3s ease" }}>
          {clients.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-faint">
              No clients yet. Add your first one above.
            </div>
          ) : (
            clients.map((client, i) => (
              <ClientRow
                key={client.id}
                client={client}
                onClick={setSelected}
                last={i === clients.length - 1}
              />
            ))
          )}
        </div>
      ) : (
        <div style={{ animation: "slideUp .3s ease" }}>
          <ActivityFeed items={activity} />
        </div>
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
