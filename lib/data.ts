import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientForToken } from "@/lib/review-token";
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

export type DashboardData = {
  clients: ClientSummary[];
  activity: ActivityItem[];
  metrics: {
    clients: number;
    awaitingReview: number;
    approvedThisWeek: number;
    needsChanges: number;
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
      metrics: {
        clients: 0,
        awaitingReview: 0,
        approvedThisWeek: 0,
        needsChanges: 0,
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

  const summaries: ClientSummary[] = clients.map((client) => {
    const reviewable = (byClient.get(client.id) ?? []).filter(isReviewable);
    return {
      ...client,
      total: reviewable.length,
      approved: reviewable.filter((p) => p.status === "approved").length,
      awaiting: reviewable.filter(
        (p) => p.status === "pending" || p.status === "ready_for_review",
      ).length,
      needsChanges: reviewable.filter((p) => p.status === "changes").length,
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

  return {
    clients: summaries,
    activity: activity.slice(0, 20),
    metrics: {
      clients: clients.length,
      awaitingReview: summaries.reduce((n, c) => n + c.awaiting, 0),
      approvedThisWeek: allPosts.filter(
        (p) =>
          p.status === "approved" &&
          new Date(p.status_changed_at ?? p.created_at).getTime() > weekAgo,
      ).length,
      needsChanges: summaries.reduce((n, c) => n + c.needsChanges, 0),
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
