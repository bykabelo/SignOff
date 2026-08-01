"use client";

import { useState } from "react";
import { relativeTime, spanLabel } from "@/lib/format";
import { statusStyle } from "@/lib/status";
import { ActionError, ReviewProgress, ReviewShell } from "./shell";
import { addComment, setStatus } from "./api";
import type { Client, Comment, PostStatus, SocialPost } from "@/types/database";

/*
 * Social-mode review. A grid of posts; the client approves each or asks for
 * a change, and can leave a note on any of them.
 *
 * Every control is rendered at full opacity from the start. This page is
 * opened on a phone more often than not, where there is no hover state at
 * all, so a control revealed by hover is a control that does not exist.
 */

/* ── Icons ───────────────────────────────────────────────── */

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M3 8.5L6.5 12L13 5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M11 2.5L13.5 5L6 12.5H3.5V10L11 2.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <path
      d="M14 2L7.5 8.5M14 2L9.5 14L7.5 8.5M14 2L2 6.5L7.5 8.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}
  >
    <path
      d="M4 6L8 10L12 6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.2" />
    <path d="M5 2V4M11 2V4M2 7H14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

/* ── Post card ───────────────────────────────────────────── */

function PostCard({
  post,
  token,
  clientName,
  accent,
  onStatusChange,
}: {
  post: SocialPost;
  token: string;
  clientName: string;
  accent: string;
  onStatusChange: (postId: string, status: PostStatus) => void;
}) {
  const [status, setLocalStatus] = useState<PostStatus>(post.status);
  const [comments, setComments] = useState<Comment[]>(post.comments);
  const [commentOpen, setCommentOpen] = useState(post.comments.length > 0);
  const [commentText, setCommentText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const style = statusStyle(status, "client");

  /**
   * Status changes apply locally first so the tap feels immediate, then
   * revert if the server disagrees — silently keeping a status the server
   * rejected would tell the client their work is approved when it isn't.
   */
  async function changeStatus(next: "approved" | "changes" | "pending") {
    const previous = status;
    setLocalStatus(next);
    onStatusChange(post.id, next);
    setError(null);

    const result = await setStatus(token, post.id, next);

    if (!result.ok) {
      setLocalStatus(previous);
      onStatusChange(post.id, previous);
      setError(result.error);
      return;
    }

    if (next === "changes") setCommentOpen(true);
  }

  async function submitComment() {
    const body = commentText.trim();
    if (!body || busy) return;

    setBusy(true);
    setError(null);

    const result = await addComment(token, post.id, body);
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setComments((prev) => [...prev, result.data.comment]);
    setCommentText("");

    // The server moves an un-approved item to "changes" when a comment
    // lands; mirror that here so the pill doesn't disagree with the truth.
    if (status !== "approved") {
      setLocalStatus("changes");
      onStatusChange(post.id, "changes");
    }
  }

  return (
    <div className="overflow-hidden rounded-card border-hairline border-line bg-white">
      {post.image_url ? (
        <div className="relative aspect-square overflow-hidden bg-[#f4f2ec]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.image_url}
            alt=""
            className="block h-full w-full object-cover"
          />
          {status === "approved" ? (
            <div
              className="absolute inset-0 flex items-center justify-center bg-[rgba(99,153,34,0.15)]"
              style={{ animation: "fadeIn .3s ease" }}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#639922] text-[26px] text-white">
                ✓
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="px-[18px] pt-4">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          {post.scheduled_for ? (
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <CalendarIcon />
              <span>{post.scheduled_for}</span>
            </div>
          ) : (
            <span />
          )}
          <div
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[11px] font-medium"
            style={{ background: style.bg, color: style.fg }}
          >
            {style.label}
          </div>
        </div>

        {post.caption ? (
          <p className="mb-4 whitespace-pre-wrap text-sm leading-[1.65] text-[#3d3d3a]">
            {post.caption}
          </p>
        ) : null}
      </div>

      <div className="px-[18px]">
        <ActionError message={error} onDismiss={() => setError(null)} />
      </div>

      {/* Always visible, never hover-gated. */}
      {status === "approved" || status === "changes" ? (
        <div className="px-[18px] pb-3.5">
          <button
            type="button"
            onClick={() => changeStatus("pending")}
            className="hover-emphasis w-full rounded-[10px] border-hairline border-[#c8c6be] py-2.5 text-xs text-muted"
          >
            Undo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 px-[18px] pb-3.5">
          <button
            type="button"
            onClick={() => changeStatus("approved")}
            className="flex items-center justify-center gap-1.5 rounded-[10px] py-2.5 text-[13px] font-medium text-white transition-opacity hover:opacity-[.88] active:scale-[.97]"
            style={{ background: accent }}
          >
            <CheckIcon /> Approve
          </button>
          <button
            type="button"
            onClick={() => changeStatus("changes")}
            className="hover-emphasis flex items-center justify-center gap-1.5 rounded-[10px] border-hairline border-[#c8c6be] py-2.5 text-[13px] font-medium text-[#5F5E5A] active:scale-[.97]"
          >
            <EditIcon /> Request changes
          </button>
        </div>
      )}

      <div className="border-t-hairline border-[#eeedea]">
        <button
          type="button"
          onClick={() => setCommentOpen((open) => !open)}
          aria-expanded={commentOpen}
          className="flex w-full items-center justify-between px-[18px] py-2.5 text-xs text-muted"
        >
          <span>Comments{comments.length > 0 ? ` (${comments.length})` : ""}</span>
          <ChevronIcon open={commentOpen} />
        </button>

        {commentOpen ? (
          <div className="px-[18px] pb-4">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="mb-2 rounded-[10px] bg-[#f6f4ee] px-3 py-2.5"
              >
                <div className="mb-1 flex justify-between gap-2">
                  <span className="text-xs font-medium text-[#3d3d3a]">
                    {comment.author}
                  </span>
                  <span className="shrink-0 text-[11px] text-faint">
                    {relativeTime(comment.created_at)}
                  </span>
                </div>
                <p className="text-[13px] leading-relaxed text-[#5F5E5A]">
                  {comment.body}
                </p>
              </div>
            ))}

            <div className={`flex gap-2 ${comments.length > 0 ? "mt-2" : ""}`}>
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitComment();
                  }
                }}
                placeholder="Leave a note…"
                aria-label={`Comment on ${post.caption?.slice(0, 40) ?? "this post"}`}
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

            <p className="mt-2 text-[11px] text-faint">
              Posting as {clientName}. {"We'll"} let the team know straight away.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────── */

export function ReviewPage({
  client,
  posts,
  token,
}: {
  client: Client;
  posts: SocialPost[];
  token: string;
}) {
  const accent = client.brand_color || "#C8522A";

  const [statuses, setStatuses] = useState<Record<string, PostStatus>>(() =>
    Object.fromEntries(posts.map((p) => [p.id, p.status])),
  );
  const [submitted, setSubmitted] = useState(false);

  const values = Object.values(statuses);
  const approved = values.filter((s) => s === "approved").length;
  const allDone =
    values.length > 0 &&
    values.every((s) => s !== "pending" && s !== "ready_for_review");
  const allApproved = values.length > 0 && values.every((s) => s === "approved");

  const badge = spanLabel(
    posts.map((p) => p.scheduled_for || p.created_at).filter(Boolean),
  );

  if (posts.length === 0) {
    return (
      <ReviewShell client={client}>
        <div className="rounded-card border-hairline border-line bg-white px-6 py-12 text-center">
          <h1 className="text-2xl">Nothing to review just yet.</h1>
          <p className="mx-auto mt-3 max-w-[320px] text-sm leading-relaxed text-muted">
            When {client.name}&rsquo;s team adds content, it will appear right
            here. This link stays the same, so you can keep it.
          </p>
        </div>
      </ReviewShell>
    );
  }

  return (
    <ReviewShell client={client} badge={badge}>
      <div className="mb-6" style={{ animation: "slideUp .4s ease" }}>
        <h1 className="mb-1.5 text-[26px] tracking-[-.02em]">
          Your content is ready.
        </h1>
        <p className="text-sm leading-[1.6] text-muted">
          Review each post below. Approve what&rsquo;s good, flag anything that
          needs a tweak. Your team will be notified instantly.
        </p>
      </div>

      <ReviewProgress approved={approved} total={posts.length} accent={accent} />

      <div className="grid gap-5">
        {posts.map((post, i) => (
          <div
            key={post.id}
            style={{ animation: `slideUp .4s ease ${i * 0.07}s both` }}
          >
            <PostCard
              post={post}
              token={token}
              clientName={client.name}
              accent={accent}
              onStatusChange={(id, status) =>
                setStatuses((prev) => ({ ...prev, [id]: status }))
              }
            />
          </div>
        ))}
      </div>

      {allDone && !submitted ? (
        <div
          className="mt-7 rounded-card border-hairline border-line bg-white px-[22px] py-5"
          style={{ animation: "slideUp .35s ease" }}
        >
          <p className="mb-3.5 text-sm leading-relaxed text-[#3d3d3a]">
            {allApproved
              ? "All posts approved. Hit submit to let your team know you're good to go."
              : "You've reviewed everything. Submit your feedback and your team will get to work on the changes."}
          </p>
          <button
            type="button"
            onClick={() => setSubmitted(true)}
            className="w-full rounded-xl py-3.5 text-sm font-medium text-white transition-opacity hover:opacity-[.88]"
            style={{ background: accent }}
          >
            Submit feedback
          </button>
        </div>
      ) : null}

      {submitted ? (
        <div
          className="mt-7 rounded-card border-hairline border-[#C0DD97] bg-approved-bg px-[22px] py-6 text-center"
          style={{ animation: "slideUp .35s ease" }}
        >
          <div className="mb-2.5 text-[32px]">✓</div>
          <p className="mb-1 text-[15px] font-medium text-approved-fg">
            Feedback submitted
          </p>
          <p className="text-[13px] text-[#3B6D11]">
            Your team has been notified and will take it from here.
          </p>
        </div>
      ) : null}
    </ReviewShell>
  );
}
