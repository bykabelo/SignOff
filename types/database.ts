/**
 * Database types for Signoff.
 *
 * Hand-maintained to match supabase/schema.sql. If you change the schema,
 * change this too — or regenerate with:
 *   npx supabase gen types typescript --project-id <id> > types/database.ts
 *
 * Row shapes are `type` aliases rather than `interface`s on purpose:
 * postgrest-js constrains table types to `Record<string, unknown>`, and only
 * type aliases get an implicit index signature. As interfaces they silently
 * fail the constraint and every query result infers as `never`.
 */

export type ClientMode = "social" | "design";

export type PostKind = "post" | "deliverable" | "asset_request";

export type PostStatus =
  | "pending"
  | "approved"
  | "changes"
  | "in_progress"
  | "ready_for_review"
  | "waiting_on_assets";

export type Client = {
  id: string;
  user_id: string;
  name: string;
  brand_color: string | null;
  logo_url: string | null;
  mode: ClientMode;
  review_token: string;
  created_at: string;
};

export type Post = {
  id: string;
  client_id: string;
  kind: PostKind;
  title: string | null;
  image_url: string | null;
  caption: string | null;
  status: PostStatus;
  scheduled_for: string | null;
  locked: boolean;
  created_at: string;
  status_changed_at: string;
};

export type PostVersion = {
  id: string;
  post_id: string;
  version_number: number;
  image_url: string | null;
  note: string | null;
  is_latest: boolean;
  created_at: string;
};

export type Comment = {
  id: string;
  post_id: string;
  version_id: string | null;
  author: string;
  body: string;
  created_at: string;
};

export type Plan = "free" | "solo" | "studio";

export type Profile = {
  user_id: string;
  plan: Plan;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  updated_at: string;
};

export type ClientAsset = {
  id: string;
  post_id: string;
  file_url: string;
  file_name: string | null;
  uploaded_at: string;
};

/* ── Composed shapes the UI actually renders ─────────────── */

/** A design-mode deliverable with its version history and comments. */
export type Deliverable = Post & {
  versions: PostVersion[];
  comments: Comment[];
  assets: ClientAsset[];
};

/** A social post with its comment thread. */
export type SocialPost = Post & {
  comments: Comment[];
};

/* ── Supabase client generic ─────────────────────────────── */

type Table<T> = {
  Row: T;
  Insert: Partial<T>;
  Update: Partial<T>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      clients: Table<Client>;
      posts: Table<Post>;
      post_versions: Table<PostVersion>;
      comments: Table<Comment>;
      client_assets: Table<ClientAsset>;
      profiles: Table<Profile>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
