"use client";

import { useRef, useState } from "react";
import { relativeTime } from "@/lib/format";
import { statusStyle } from "@/lib/status";
import { ActionError, ReviewProgress, ReviewShell } from "./shell";
import { addComment, setStatus, uploadAsset } from "./api";
import type {
  Client,
  ClientAsset,
  Comment,
  Deliverable,
  PostStatus,
} from "@/types/database";

/*
 * Design-mode review. Deliverables carry version history, comments are tied
 * to the version they were written against, and asset requests run the same
 * channel in reverse — the client uploads back through this page.
 *
 * Version tabs and the approve / request-changes buttons render at full
 * opacity always. Hover only shifts a background. On the phone where this is
 * usually opened there is no hover at all.
 */

/* ── Icons ───────────────────────────────────────────────── */

const CheckIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <path
      d="M3 8.5L6.5 12L13 5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SendIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path
      d="M14 2L7.5 8.5M14 2L9.5 14L7.5 8.5M14 2L2 6.5L7.5 8.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const UploadIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 15V4M12 4L7 9M12 4l5 5M4 17v2a1 1 0 001 1h14a1 1 0 001-1v-2"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function StatusPill({ status }: { status: PostStatus }) {
  const { label, bg, fg } = statusStyle(status, "client");
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[11px] font-medium"
      style={{ background: bg, color: fg }}
    >
      {label}
    </span>
  );
}

/* ── Deliverable ─────────────────────────────────────────── */

function DeliverableCard({
  deliverable,
  token,
  clientName,
  accent,
  onStatusChange,
}: {
  deliverable: Deliverable;
  token: string;
  clientName: string;
  accent: string;
  onStatusChange: (id: string, status: PostStatus) => void;
}) {
  const versions = deliverable.versions;
  const latestIndex = Math.max(
    versions.findIndex((v) => v.is_latest),
    0,
  );

  const [activeIndex, setActiveIndex] = useState(
    versions.length ? latestIndex : 0,
  );
  const [status, setLocalStatus] = useState<PostStatus>(deliverable.status);
  const [comments, setComments] = useState<Comment[]>(deliverable.comments);
  const [commentText, setCommentText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = versions[activeIndex];
  const viewingLatest = current ? current.is_latest : true;

  const versionNumber = new Map(
    versions.map((v) => [v.id, v.version_number]),
  );

  async function changeStatus(next: "approved" | "changes" | "pending") {
    const previous = status;
    setLocalStatus(next);
    onStatusChange(deliverable.id, next);
    setError(null);

    const result = await setStatus(token, deliverable.id, next);

    if (!result.ok) {
      setLocalStatus(previous);
      onStatusChange(deliverable.id, previous);
      setError(result.error);
    }
  }

  async function submitComment() {
    const body = commentText.trim();
    if (!body || busy) return;

    setBusy(true);
    setError(null);

    // Comments carry the version on screen, so feedback on v1 stays readable
    // next to v1 once v2 lands.
    const result = await addComment(token, deliverable.id, body, current?.id);
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setComments((prev) => [...prev, result.data.comment]);
    setCommentText("");

    if (status !== "approved") {
      setLocalStatus("changes");
      onStatusChange(deliverable.id, "changes");
    }
  }

  return (
    <div className="overflow-hidden rounded-card border-hairline border-line bg-white">
      <div className="px-[18px] pt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0 text-[15px] font-medium text-ink">
            {deliverable.title ?? "Untitled"}
          </div>
          <StatusPill status={status} />
        </div>

        {versions.length > 1 ? (
          <div className="mb-3.5 flex flex-wrap items-center gap-1.5">
            <span className="mr-0.5 text-[11px] text-faint">Version</span>
            {versions.map((version, i) => {
              const active = i === activeIndex;
              return (
                <button
                  key={version.id}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  aria-pressed={active}
                  className="rounded-lg px-3 py-[5px] text-xs font-medium transition-all"
                  style={{
                    border: `0.5px solid ${active ? accent : "#e8e6de"}`,
                    background: active ? accent : "#fff",
                    color: active
                      ? "#fff"
                      : version.is_latest
                        ? "#5F5E5A"
                        : "#b4b2a9",
                  }}
                >
                  v{version.version_number}
                  {version.is_latest ? " · latest" : ""}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {current?.image_url ? (
        <div
          className="aspect-[16/10] bg-[#f4f2ec] bg-cover bg-center"
          style={{ backgroundImage: `url('${current.image_url}')` }}
          role="img"
          aria-label={`${deliverable.title ?? "Deliverable"} version ${current.version_number}`}
        />
      ) : null}

      <div className="px-[18px] py-3.5">
        {current?.note ? (
          <p className="mb-3.5 text-[13px] leading-[1.55] text-[#5F5E5A]">
            {current.note}
          </p>
        ) : null}

        <ActionError message={error} onDismiss={() => setError(null)} />

        {versions.length === 0 ? (
          <p className="mb-3 rounded-lg bg-[#f6f4ee] px-3 py-2 text-xs text-muted">
            Nothing to look at here yet — this one is still being worked on.
          </p>
        ) : !viewingLatest ? (
          <div className="mb-3 rounded-lg bg-[#f6f4ee] px-3 py-2 text-xs text-muted">
            You&rsquo;re viewing an earlier version. Switch to the latest to
            approve or request changes.
          </div>
        ) : status === "approved" || status === "changes" ? (
          <div className="mb-3">
            <button
              type="button"
              onClick={() => changeStatus("pending")}
              className="hover-emphasis w-full rounded-[10px] border-hairline border-[#c8c6be] py-2.5 text-xs text-muted"
            >
              Undo
            </button>
          </div>
        ) : (
          <div className="mb-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => changeStatus("approved")}
              className="flex items-center justify-center gap-1.5 rounded-[10px] py-2.5 text-[13px] font-medium text-white transition-opacity hover:opacity-[.88] active:scale-[.97]"
              style={{ background: accent }}
            >
              <CheckIcon /> Approve v{current?.version_number}
            </button>
            <button
              type="button"
              onClick={() => changeStatus("changes")}
              className="hover-emphasis flex items-center justify-center gap-1.5 rounded-[10px] border-hairline border-[#c8c6be] py-2.5 text-[13px] font-medium text-[#5F5E5A] active:scale-[.97]"
            >
              Request changes
            </button>
          </div>
        )}

        <div className="border-t-hairline border-[#eeedea] pt-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="mb-2.5 rounded-[10px] bg-[#f6f4ee] px-3 py-2.5"
            >
              <div className="mb-1 flex justify-between gap-2">
                <span className="text-xs font-medium text-[#3d3d3a]">
                  {comment.author}
                </span>
                <span className="shrink-0 text-[11px] text-faint">
                  {comment.version_id
                    ? `on v${versionNumber.get(comment.version_id) ?? "?"}`
                    : relativeTime(comment.created_at)}
                </span>
              </div>
              <p className="text-[13px] leading-relaxed text-[#5F5E5A]">
                {comment.body}
              </p>
            </div>
          ))}

          <div className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitComment();
                }
              }}
              placeholder={`Leave feedback on v${current?.version_number ?? 1}…`}
              aria-label={`Comment on ${deliverable.title ?? "this deliverable"}`}
              className="min-w-0 flex-1 rounded-[10px] border-hairline border-[#d3d1c7] bg-white px-3 py-2.5 text-[13px] text-[#3d3d3a] outline-none placeholder:text-faint focus:border-ink"
            />
            <button
              type="button"
              onClick={submitComment}
              disabled={!commentText.trim() || busy}
              aria-label="Send comment"
              className="flex shrink-0 items-center justify-center rounded-[10px] px-3.5 text-white transition-colors disabled:bg-[#d3d1c7]"
              style={{
                background: commentText.trim() && !busy ? accent : undefined,
              }}
            >
              <SendIcon />
            </button>
          </div>

          <p className="mt-2 text-[11px] text-faint">Posting as {clientName}.</p>
        </div>
      </div>
    </div>
  );
}

/* ── Asset request ───────────────────────────────────────── */

function AssetRequestCard({
  request,
  token,
  accent,
}: {
  request: Deliverable;
  token: string;
  accent: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploaded, setUploaded] = useState<ClientAsset[]>(request.assets);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length || busy) return;

    setBusy(true);
    setError(null);

    // Sequential rather than parallel: these are phone uploads on whatever
    // connection the client happens to be on, and one at a time fails more
    // legibly than five at once.
    for (const file of Array.from(files)) {
      const result = await uploadAsset(token, request.id, file);
      if (!result.ok) {
        setError(result.error);
        break;
      }
      setUploaded((prev) => [result.data.asset, ...prev]);
    }

    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="overflow-hidden rounded-card border border-[#c8b6e0] bg-white">
      <div className="px-[18px] py-4">
        <div className="mb-1.5 flex items-center gap-2">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#EEEDFE]"
            style={{ color: accent }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 2v8M8 10L5 7M8 10l3-3M3 12h10"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="text-[15px] font-medium text-ink">
            {request.title ?? "We need something from you"}
          </div>
        </div>

        {request.caption ? (
          <p className="mb-3.5 text-[13px] leading-[1.55] text-[#5F5E5A]">
            {request.caption}
          </p>
        ) : null}

        {uploaded.length > 0 ? (
          <div className="mb-3">
            {uploaded.map((file) => (
              <a
                key={file.id}
                href={file.file_url}
                target="_blank"
                rel="noreferrer"
                className="mb-1.5 flex items-center gap-2 rounded-lg border-hairline border-[#c0dd97] bg-[#f0fdf4] px-3 py-2"
              >
                <span className="text-[#639922]">
                  <CheckIcon />
                </span>
                <span className="min-w-0 truncate text-xs text-approved-fg">
                  {file.file_name ?? "File"}
                </span>
              </a>
            ))}
          </div>
        ) : null}

        <ActionError message={error} onDismiss={() => setError(null)} />

        {/* A real label wrapping a real input: works with the keyboard, with
            screen readers, and with a tap on a phone. */}
        <label
          className="block cursor-pointer rounded-xl border-[1.5px] border-dashed border-[#c8b6e0] bg-[#faf8fd] p-5 text-center transition-colors hover:border-[color:var(--accent)]"
          style={{ ["--accent" as string]: accent }}
        >
          <span className="mb-1.5 flex justify-center" style={{ color: accent }}>
            <UploadIcon />
          </span>
          <span
            className="mb-0.5 block text-[13px] font-medium"
            style={{ color: accent }}
          >
            {busy ? "Uploading…" : "Tap to upload files"}
          </span>
          <span className="block text-[11px] text-faint">
            JPG, PNG, PDF, ZIP · up to 4 MB each
          </span>
          <input
            ref={inputRef}
            type="file"
            multiple
            disabled={busy}
            onChange={(e) => handleFiles(e.target.files)}
            className="sr-only"
          />
        </label>
      </div>
    </div>
  );
}

/* ── Locked ──────────────────────────────────────────────── */

function LockedCard({ deliverable }: { deliverable: Deliverable }) {
  return (
    <div className="overflow-hidden rounded-card border-hairline border-line bg-white opacity-70">
      <div className="px-[18px] py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 text-[15px] font-medium text-muted">
            {deliverable.title ?? "Untitled"}
          </div>
          <StatusPill status={deliverable.status} />
        </div>
        <p className="mt-2 text-xs text-faint">
          {deliverable.caption ||
            "This one starts once the pieces above are in place."}
        </p>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────── */

export function DesignReviewPage({
  client,
  deliverables,
  token,
}: {
  client: Client;
  deliverables: Deliverable[];
  token: string;
}) {
  const accent = client.brand_color || "#534AB7";

  const reviewable = deliverables.filter(
    (d) => d.kind === "deliverable" && !d.locked,
  );

  const [statuses, setStatuses] = useState<Record<string, PostStatus>>(() =>
    Object.fromEntries(reviewable.map((d) => [d.id, d.status])),
  );

  const approved = Object.values(statuses).filter(
    (s) => s === "approved",
  ).length;

  if (deliverables.length === 0) {
    return (
      <ReviewShell client={client}>
        <div className="rounded-card border-hairline border-line bg-white px-6 py-12 text-center">
          <h1 className="text-2xl">Nothing to review just yet.</h1>
          <p className="mx-auto mt-3 max-w-[320px] text-sm leading-relaxed text-muted">
            Work in progress. When the first deliverable is ready it will
            appear here — this link stays the same, so you can keep it.
          </p>
        </div>
      </ReviewShell>
    );
  }

  return (
    <ReviewShell client={client} badge="In progress">
      <div className="mb-6" style={{ animation: "slideUp .4s ease" }}>
        <h1 className="mb-1.5 text-2xl tracking-[-.02em]">
          Your project is taking shape.
        </h1>
        <p className="text-[13px] leading-[1.6] text-muted">
          Review each deliverable, leave feedback, and approve when it&rsquo;s
          right. We&rsquo;ll keep you posted as things progress.
        </p>
      </div>

      <ReviewProgress
        approved={approved}
        total={reviewable.length}
        accent={accent}
      />

      <div className="grid gap-[18px]">
        {deliverables.map((item, i) => (
          <div
            key={item.id}
            style={{ animation: `slideUp .4s ease ${i * 0.07}s both` }}
          >
            {item.kind === "asset_request" ? (
              <AssetRequestCard request={item} token={token} accent={accent} />
            ) : item.locked ? (
              <LockedCard deliverable={item} />
            ) : (
              <DeliverableCard
                deliverable={item}
                token={token}
                clientName={client.name}
                accent={accent}
                onStatusChange={(id, status) =>
                  setStatuses((prev) => ({ ...prev, [id]: status }))
                }
              />
            )}
          </div>
        ))}
      </div>
    </ReviewShell>
  );
}
