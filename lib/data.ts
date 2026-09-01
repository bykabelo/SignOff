import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientForToken } from "@/lib/review-token";
import { relativeTime } from "@/lib/format";
import type {
  Client,
  ClientAsset,
  Comment,
  Deliverable,
  Post,
  PostVersion,
  SocialPost,
} from "@/types/database";

/* ══ Shapes the pages render ═══════════════════════════════ */

export type ClientSummary = Client & {
  total: number;
  approved: number;
  awaiting: number;
  needsChanges: number;
  /** True when any of this client's posts has sat awaiting review for
   *  longer than the "needs attention" threshold. */
  hasOverdue: boolean;
  /** Most recent created_at/status_changed_at across this client's posts,
   *  or null when they have none yet. */
  lastActivityAt: string | null;
  /**
   * The client's reviewable items, for the dashboard's quick-look sheet.
   * These are already in memory from the counts query, so carrying them
   * costs nothing beyond payload — no extra round trip.
   */
  posts: Post[];
};

export type ActivityItem = {
  id: string;
  kind: "comment" | "approved" | "changes" | "asset";
  clientId: string;
  clientName: string;
  postTitle: string;
  body: string | null;
  at: string;
};

/** A row in the dashboard's "Needs attention" list — always grounded in a
 *  real post, never a synthesised scenario. */
export type NeedsAttentionItem = {
  id: string;
  kind: "overdue" | "changes";
  clientId: string;
  clientName: string;
  postTitle: string;
  meta: string;
};

export type DashboardData = {
  clients: ClientSummary[];
  activity: ActivityItem[];
  needsAttention: NeedsAttentionItem[];
  metrics: {
    clients: number;
    awaitingReview: number;
    approvedThisWeek: number;
    needsChanges: number;
    /** Reviewable posts created in the last 7 days. */
    postsThisWeek: number;
    /** Of those, how many carry a (free-text) schedule. */
    scheduledThisWeek: number;
    /** Revisions requested in the last 7 days. */
    revisionsThisWeek: number;
    /** Posts stuck awaiting review past the "needs attention" threshold,
     *  across all clients — not capped the way `needsAttention` is. */
    overdueCount: number;
    /**
     * Average days between a post's creation and its approval, across all
     * approved posts. Null when nothing has been approved yet — there is
     * nothing honest to average.
     */
    avgTurnaroundDays: number | null;
    /**
     * Rolling 9-day trend of daily avg turnaround, oldest first. A day with
     * no approvals is 0 — sparse is the honest shape for a new or quiet
     * account, not something to paper over.
     */
    turnaroundTrend: number[];
  };
};

/** Everything the review page needs, in either mode. */
export type ReviewWorkspace =
  | { client: Client; mode: "social"; posts: SocialPost[] }
  | { client: Client; mode: "design"; deliverables: Deliverable[] };

/* ══ Helpers ═══════════════════════════════════════════════ */

/** Group child rows by their post_id, preserving query order. */
function groupBy<T extends { post_id: string }>(rows: T[]) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const list = map.get(row.post_id);
    if (list) list.push(row);
    else map.set(row.post_id, [row]);
  }
  return map;
}

/** Posts a client is actually being asked to review. */
const isReviewable = (p: Post) => p.kind !== "asset_request";

/* ══ Dashboard ═════════════════════════════════════════════ */

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = createClient();

  // RLS scopes both queries to the signed-in creator, so no user_id filter
  // is needed here — and adding one would not make it any safer.
  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (!clients?.length) {
    return {
      clients: [],
      activity: [],
      needsAttention: [],
      metrics: {
        clients: 0,
        awaitingReview: 0,
        approvedThisWeek: 0,
        needsChanges: 0,
        postsThisWeek: 0,
        scheduledThisWeek: 0,
        revisionsThisWeek: 0,
        avgTurnaroundDays: null,
        turnaroundTrend: Array(9).fill(0),
        overdueCount: 0,
      },
    };
  }

  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  const allPosts = posts ?? [];
  const byClient = new Map<string, Post[]>();
  for (const post of allPosts) {
    const list = byClient.get(post.client_id);
    if (list) list.push(post);
    else byClient.set(post.client_id, [post]);
  }

  const DAY_MS = 24 * 60 * 60 * 1000;
  const OVERDUE_MS = 2 * DAY_MS;
  const now = Date.now();

  const summaries: ClientSummary[] = clients.map((client) => {
    const reviewable = (byClient.get(client.id) ?? []).filter(isReviewable);
    const timestamps = reviewable.map(
      (p) => new Date(p.status_changed_at ?? p.created_at).getTime(),
    );
    return {
      ...client,
      total: reviewable.length,
      approved: reviewable.filter((p) => p.status === "approved").length,
      awaiting: reviewable.filter(
        (p) => p.status === "pending" || p.status === "ready_for_review",
      ).length,
      needsChanges: reviewable.filter((p) => p.status === "changes").length,
      hasOverdue: reviewable.some(
        (p) =>
          (p.status === "pending" || p.status === "ready_for_review") &&
          now - new Date(p.status_changed_at ?? p.created_at).getTime() >=
            OVERDUE_MS,
      ),
      lastActivityAt: timestamps.length
        ? new Date(Math.max(...timestamps)).toISOString()
        : null,
      posts: reviewable,
    };
  });

  const clientName = new Map(clients.map((c) => [c.id, c.name]));
  const postLabel = (p: Post) =>
    p.title || p.caption?.slice(0, 60) || "Untitled";

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  /* Activity: recent comments, status changes and client uploads, merged. */
  const postIds = allPosts.map((p) => p.id);
  const postById = new Map(allPosts.map((p) => [p.id, p]));

  const [{ data: comments }, { data: assets }] = await Promise.all([
    supabase
      .from("comments")
      .select("*")
      .in("post_id", postIds.length ? postIds : ["00000000-0000-0000-0000-000000000000"])
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("client_assets")
      .select("*")
      .in("post_id", postIds.length ? postIds : ["00000000-0000-0000-0000-000000000000"])
      .order("uploaded_at", { ascending: false })
      .limit(25),
  ]);

  const activity: ActivityItem[] = [];

  for (const comment of comments ?? []) {
    const post = postById.get(comment.post_id);
    if (!post) continue;
    activity.push({
      id: `comment-${comment.id}`,
      kind: "comment",
      clientId: post.client_id,
      clientName: clientName.get(post.client_id) ?? "Client",
      postTitle: postLabel(post),
      body: comment.body,
      at: comment.created_at,
    });
  }

  for (const asset of assets ?? []) {
    const post = postById.get(asset.post_id);
    if (!post) continue;
    activity.push({
      id: `asset-${asset.id}`,
      kind: "asset",
      clientId: post.client_id,
      clientName: clientName.get(post.client_id) ?? "Client",
      postTitle: postLabel(post),
      body: asset.file_name,
      at: asset.uploaded_at,
    });
  }

  for (const post of allPosts) {
    if (post.status !== "approved" && post.status !== "changes") continue;
    activity.push({
      id: `status-${post.id}`,
      kind: post.status === "approved" ? "approved" : "changes",
      clientId: post.client_id,
      clientName: clientName.get(post.client_id) ?? "Client",
      postTitle: postLabel(post),
      body: null,
      at: post.status_changed_at ?? post.created_at,
    });
  }

  activity.sort((a, b) => (a.at < b.at ? 1 : -1));

  /* Reviewable posts (asset requests are the creator's own to-do, not a
   * client-facing review item) drive every stat and heuristic below. */
  const reviewablePosts = allPosts.filter(isReviewable);

  const postsThisWeek = reviewablePosts.filter(
    (p) => new Date(p.created_at).getTime() > weekAgo,
  );
  const scheduledThisWeek = postsThisWeek.filter((p) =>
    p.scheduled_for?.trim(),
  ).length;
  const revisionsThisWeek = reviewablePosts.filter(
    (p) =>
      p.status === "changes" &&
      new Date(p.status_changed_at ?? p.created_at).getTime() > weekAgo,
  ).length;

  /* Avg. turnaround: days between a post's creation and its approval. Only
   * approved posts have an answer — nothing else has actually finished. */
  const approvedPosts = reviewablePosts.filter((p) => p.status === "approved");
  const turnaroundDaysOf = (p: Post) =>
    (new Date(p.status_changed_at ?? p.created_at).getTime() -
      new Date(p.created_at).getTime()) /
    DAY_MS;

  const avgTurnaroundDays = approvedPosts.length
    ? Math.round(
        (approvedPosts.reduce((sum, p) => sum + Math.max(0, turnaroundDaysOf(p)), 0) /
          approvedPosts.length) *
          10,
      ) / 10
    : null;

  // Rolling 9-day trend: bucket each approval by how many days ago it landed
  // (0 = today), then average turnaround within each bucket. A bucket with
  // no approvals is 0 rather than interpolated or carried over — a quiet
  // day is real information, not a gap to smooth away.
  const bucketSums = Array(9).fill(0);
  const bucketCounts = Array(9).fill(0);
  for (const p of approvedPosts) {
    const approvedAt = new Date(p.status_changed_at ?? p.created_at).getTime();
    if (Number.isNaN(approvedAt)) continue;
    const bucket = Math.floor((now - approvedAt) / DAY_MS);
    if (bucket < 0 || bucket > 8) continue;
    bucketSums[bucket] += Math.max(0, turnaroundDaysOf(p));
    bucketCounts[bucket] += 1;
  }
  const turnaroundTrend = bucketSums
    .map((sum, i) => (bucketCounts[i] ? sum / bucketCounts[i] : 0))
    .reverse(); // oldest (8 days ago) → today

  /* Needs attention: posts stuck awaiting review past a "no response yet"
   * threshold, and posts a client has actively asked to be changed. Both
   * come straight from posts/comments already on screen — nothing here is
   * a guess at intent (e.g. there is no read-receipt to say a client has
   * "seen but not actioned" something, so that phrasing is avoided). */
  const overdue = reviewablePosts
    .filter(
      (p) =>
        (p.status === "pending" || p.status === "ready_for_review") &&
        now - new Date(p.status_changed_at ?? p.created_at).getTime() >=
          OVERDUE_MS,
    )
    .sort(
      (a, b) =>
        new Date(a.status_changed_at ?? a.created_at).getTime() -
        new Date(b.status_changed_at ?? b.created_at).getTime(),
    );

  const changesRequested = reviewablePosts.filter((p) => p.status === "changes");
  const changesPostIds = changesRequested.map((p) => p.id);

  const { data: changeComments } = changesPostIds.length
    ? await supabase
        .from("comments")
        .select("*")
        .in("post_id", changesPostIds)
        .order("created_at", { ascending: false })
    : { data: [] as Comment[] };

  const latestCommentByPost = new Map<string, Comment>();
  for (const c of changeComments ?? []) {
    if (!latestCommentByPost.has(c.post_id)) latestCommentByPost.set(c.post_id, c);
  }

  const needsAttention: NeedsAttentionItem[] = [
    ...overdue.map((p) => ({
      id: `overdue-${p.id}`,
      kind: "overdue" as const,
      clientId: p.client_id,
      clientName: clientName.get(p.client_id) ?? "Client",
      postTitle: postLabel(p),
      meta: `Submitted ${relativeTime(p.created_at)} · still awaiting review`,
    })),
    ...changesRequested
      .sort(
        (a, b) =>
          new Date(b.status_changed_at ?? b.created_at).getTime() -
          new Date(a.status_changed_at ?? a.created_at).getTime(),
      )
      .map((p) => {
        const comment = latestCommentByPost.get(p.id);
        return {
          id: `changes-${p.id}`,
          kind: "changes" as const,
          clientId: p.client_id,
          clientName: clientName.get(p.client_id) ?? "Client",
          postTitle: postLabel(p),
          meta: comment
            ? `“${comment.body.slice(0, 90)}${comment.body.length > 90 ? "…" : ""}”`
            : `Changes requested ${relativeTime(p.status_changed_at ?? p.created_at)}`,
        };
      }),
  ].slice(0, 6);

  return {
    clients: summaries,
    activity: activity.slice(0, 20),
    needsAttention,
    metrics: {
      clients: clients.length,
      awaitingReview: summaries.reduce((n, c) => n + c.awaiting, 0),
      approvedThisWeek: allPosts.filter(
        (p) =>
          p.status === "approved" &&
          new Date(p.status_changed_at ?? p.created_at).getTime() > weekAgo,
      ).length,
      needsChanges: summaries.reduce((n, c) => n + c.needsChanges, 0),
      postsThisWeek: postsThisWeek.length,
      scheduledThisWeek,
      revisionsThisWeek,
      avgTurnaroundDays,
      turnaroundTrend,
      overdueCount: overdue.length,
    },
  };
}

/* ══ Creator's client workspace ════════════════════════════ */

export type ClientWorkspace = {
  client: Client;
  posts: Post[];
  versions: Map<string, PostVersion[]>;
  comments: Map<string, Comment[]>;
  assets: Map<string, ClientAsset[]>;
};

export async function getClientWorkspace(
  clientId: string,
): Promise<ClientWorkspace | null> {
  const supabase = createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .maybeSingle();

  if (!client) return null; // Not theirs, or not there — RLS makes these the same.

  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  const list = posts ?? [];
  const ids = list.map((p) => p.id);

  if (!ids.length) {
    return {
      client,
      posts: [],
      versions: new Map(),
      comments: new Map(),
      assets: new Map(),
    };
  }

  const [{ data: versions }, { data: comments }, { data: assets }] =
    await Promise.all([
      supabase
        .from("post_versions")
        .select("*")
        .in("post_id", ids)
        .order("version_number", { ascending: true }),
      supabase
        .from("comments")
        .select("*")
        .in("post_id", ids)
        .order("created_at", { ascending: true }),
      supabase
        .from("client_assets")
        .select("*")
        .in("post_id", ids)
        .order("uploaded_at", { ascending: false }),
    ]);

  return {
    client,
    posts: list,
    versions: groupBy(versions ?? []),
    comments: groupBy(comments ?? []),
    assets: groupBy(assets ?? []),
  };
}

/* ══ Public review page ════════════════════════════════════ */

/**
 * Load a review workspace by token.
 *
 * Runs with the service-role key because the visitor has no session — the
 * token is the credential, and it is validated before anything is read.
 * Every query below is scoped to the client that token resolved to.
 */
export async function getReviewWorkspace(
  token: string,
): Promise<ReviewWorkspace | null> {
  const client = await clientForToken(token);
  if (!client) return null;

  const supabase = createAdminClient();

  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .eq("client_id", client.id)
    .order("created_at", { ascending: true });

  const list = posts ?? [];
  const ids = list.map((p) => p.id);

  if (!ids.length) {
    return client.mode === "design"
      ? { client, mode: "design", deliverables: [] }
      : { client, mode: "social", posts: [] };
  }

  const [{ data: versions }, { data: comments }, { data: assets }] =
    await Promise.all([
      supabase
        .from("post_versions")
        .select("*")
        .in("post_id", ids)
        .order("version_number", { ascending: true }),
      supabase
        .from("comments")
        .select("*")
        .in("post_id", ids)
        .order("created_at", { ascending: true }),
      supabase
        .from("client_assets")
        .select("*")
        .in("post_id", ids)
        .order("uploaded_at", { ascending: false }),
    ]);

  const commentsByPost = groupBy(comments ?? []);

  if (client.mode === "design") {
    const versionsByPost = groupBy(versions ?? []);
    const assetsByPost = groupBy(assets ?? []);

    const deliverables: Deliverable[] = list.map((post) => ({
      ...post,
      versions: versionsByPost.get(post.id) ?? [],
      comments: commentsByPost.get(post.id) ?? [],
      assets: assetsByPost.get(post.id) ?? [],
    }));

    return { client, mode: "design", deliverables };
  }

  const socialPosts: SocialPost[] = list
    .filter((p) => p.kind !== "asset_request")
    .map((post) => ({
      ...post,
      comments: commentsByPost.get(post.id) ?? [],
    }));

  return { client, mode: "social", posts: socialPosts };
}
