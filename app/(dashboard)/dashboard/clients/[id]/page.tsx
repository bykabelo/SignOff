import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientWorkspace } from "@/lib/data";
import { accentFor, progressOf } from "@/lib/status";
import { buildReviewUrl } from "@/lib/review-url";
import { StatusPill } from "@/components/ui/status-pill";
import { CopyLink } from "@/components/workspace/copy-link";
import { LockToggle, DeleteButton } from "@/components/workspace/post-actions";
import {
  AssetRequestComposer,
  DeliverableComposer,
  SocialComposer,
  VersionPusher,
} from "@/components/workspace/composers";
import { ProgressTracker } from "@/components/tracker/progress-tracker";
import { TargetDateControl } from "@/components/tracker/target-date";
import type { ClientAsset, Comment, Post, PostVersion } from "@/types/database";

export default async function ClientWorkspacePage({
  params,
}: {
  params: { id: string };
}) {
  const workspace = await getClientWorkspace(params.id);
  if (!workspace) notFound();

  const { client, posts, versions, comments, assets } = workspace;
  const accent = accentFor(client);
  const reviewUrl = buildReviewUrl(client.review_token);

  const reviewable = posts.filter((p) => p.kind !== "asset_request");
  const requests = posts.filter((p) => p.kind === "asset_request");
  const progress = progressOf(reviewable);

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-muted">
        ← All clients
      </Link>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: accent }}
              aria-hidden
            />
            <h1 className="text-3xl">{client.name}</h1>
          </div>
          <p className="mt-2 text-sm text-muted">
            {client.mode === "design" ? "Design project" : "Social content"}
            {progress.total > 0 ? (
              <> · {progress.approved} of {progress.total} approved</>
            ) : null}
          </p>
        </div>
      </div>

      {progress.total > 0 ? (
        <div
          className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-[#eeece5]"
          role="progressbar"
          aria-valuenow={progress.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Approval progress"
        >
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress.percent}%`, backgroundColor: accent }}
          />
        </div>
      ) : null}

      {/* ── Review link ────────────────────────────────────── */}
      <section className="card mt-7 p-5">
        <h2 className="font-serif text-lg">The review link</h2>
        <p className="mt-1 text-sm text-muted">
          Send this to {client.name}. No account needed — they just open it.
        </p>
        <div className="mt-4">
          <CopyLink url={reviewUrl} />
        </div>
      </section>

      {/* ── Progress (design mode) ─────────────────────────── */}
      {client.mode === "design" ? (
        <div className="mt-7">
          <ProgressTracker
            title={client.name}
            stages={posts}
            targetDate={client.target_date}
            accent={accent}
            heading="Project progress"
            intro="Stages come from your deliverables and asset requests, in the order you added them."
          />
          <TargetDateControl clientId={client.id} value={client.target_date} />
        </div>
      ) : null}

      {/* ── Compose ────────────────────────────────────────── */}
      <div className="mt-7 flex flex-col gap-3">
        {client.mode === "design" ? (
          <>
            <DeliverableComposer clientId={client.id} accent={accent} />
            <AssetRequestComposer clientId={client.id} accent={accent} />
          </>
        ) : (
          <SocialComposer clientId={client.id} accent={accent} />
        )}
      </div>

      {/* ── Asset requests (design mode) ───────────────────── */}
      {requests.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-serif text-xl">Asset requests</h2>
          <div className="mt-4 flex flex-col gap-3">
            {requests.map((request) => (
              <AssetRequestCard
                key={request.id}
                request={request}
                assets={assets.get(request.id) ?? []}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* ── The work ───────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="font-serif text-xl">
          {client.mode === "design" ? "Deliverables" : "Posts"}
        </h2>

        {reviewable.length === 0 ? (
          <p className="card mt-4 p-6 text-sm text-muted">
            Nothing here yet. Add{" "}
            {client.mode === "design" ? "a deliverable" : "a post"} above and it
            appears on {client.name}&rsquo;s review link straight away.
          </p>
        ) : (
          <div
            className={
              client.mode === "design"
                ? "mt-4 flex flex-col gap-4"
                : "mt-4 grid gap-4 sm:grid-cols-2"
            }
          >
            {reviewable.map((post) =>
              client.mode === "design" ? (
                <DeliverableCard
                  key={post.id}
                  post={post}
                  versions={versions.get(post.id) ?? []}
                  comments={comments.get(post.id) ?? []}
                  accent={accent}
                />
              ) : (
                <SocialPostCard
                  key={post.id}
                  post={post}
                  comments={comments.get(post.id) ?? []}
                />
              ),
            )}
          </div>
        )}
      </section>
    </div>
  );
}

/* ══ Cards ═════════════════════════════════════════════════ */

function CommentList({ comments }: { comments: Comment[] }) {
  if (comments.length === 0) return null;

  return (
    <div className="mt-4 flex flex-col gap-3 border-t-hairline border-line pt-4">
      {comments.map((comment) => (
        <div key={comment.id}>
          <p className="text-xs text-faint">{comment.author}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink">
            {comment.body}
          </p>
        </div>
      ))}
    </div>
  );
}

function SocialPostCard({
  post,
  comments,
}: {
  post: Post;
  comments: Comment[];
}) {
  return (
    <article className="card overflow-hidden">
      {post.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.image_url}
          alt={post.caption ?? "Post image"}
          className="aspect-square w-full object-cover"
        />
      ) : null}

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <StatusPill status={post.status} />
          {post.scheduled_for ? (
            <span className="text-xs text-faint">{post.scheduled_for}</span>
          ) : null}
        </div>

        {post.caption ? (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink">
            {post.caption}
          </p>
        ) : null}

        <CommentList comments={comments} />

        <div className="mt-4 flex justify-end">
          <DeleteButton postId={post.id} />
        </div>
      </div>
    </article>
  );
}

function DeliverableCard({
  post,
  versions,
  comments,
  accent,
}: {
  post: Post;
  versions: PostVersion[];
  comments: Comment[];
  accent: string;
}) {
  const latest = versions.find((v) => v.is_latest) ?? versions.at(-1);
  const nextVersion = (versions.at(-1)?.version_number ?? 0) + 1;

  // Comments carry the version they were written against, so feedback on v1
  // stays legible next to v1 after v2 lands.
  const numberById = new Map(versions.map((v) => [v.id, v.version_number]));

  return (
    <article className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-serif text-lg">{post.title ?? "Untitled"}</h3>
          <p className="mt-1 text-xs text-faint">
            {versions.length} version{versions.length === 1 ? "" : "s"}
            {post.locked ? " · locked" : ""}
          </p>
        </div>
        <StatusPill status={post.status} />
      </div>

      {latest?.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={latest.image_url}
          alt={`${post.title ?? "Deliverable"} v${latest.version_number}`}
          className="mt-4 max-h-80 w-full rounded-soft border-hairline border-line object-contain"
        />
      ) : null}

      {versions.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2">
          {versions.map((version) => (
            <li
              key={version.id}
              className="flex gap-3 rounded-soft bg-[#faf9f6] px-3 py-2"
            >
              <span
                className="shrink-0 text-sm font-medium"
                style={{ color: version.is_latest ? accent : "#b4b2a9" }}
              >
                v{version.version_number}
              </span>
              <span className="min-w-0 flex-1 text-sm text-muted">
                {version.note || (version.is_latest ? "Latest" : "—")}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <CommentList
        comments={comments.map((comment) => ({
          ...comment,
          author: comment.version_id
            ? `${comment.author} · on v${numberById.get(comment.version_id) ?? "?"}`
            : comment.author,
        }))}
      />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <VersionPusher
          postId={post.id}
          nextVersion={nextVersion}
          accent={accent}
        />
        <LockToggle postId={post.id} locked={post.locked} />
        <DeleteButton postId={post.id} />
      </div>
    </article>
  );
}

function AssetRequestCard({
  request,
  assets,
}: {
  request: Post;
  assets: ClientAsset[];
}) {
  return (
    <article className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-serif text-lg">{request.title}</h3>
          {request.caption ? (
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {request.caption}
            </p>
          ) : null}
        </div>
        <StatusPill status={request.status} />
      </div>

      {assets.length === 0 ? (
        <p className="mt-4 text-sm text-faint">
          Nothing sent back yet.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {assets.map((asset) => (
            <li key={asset.id}>
              <a
                href={asset.file_url}
                target="_blank"
                rel="noreferrer"
                className="hover-emphasis flex items-center justify-between gap-3 rounded-soft border-hairline border-line px-3 py-2.5"
              >
                <span className="min-w-0 truncate text-sm text-ink">
                  {asset.file_name ?? "File"}
                </span>
                <span className="shrink-0 text-xs text-faint">Download</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex justify-end">
        <DeleteButton postId={request.id} />
      </div>
    </article>
  );
}
