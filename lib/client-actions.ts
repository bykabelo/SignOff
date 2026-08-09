"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/server";
import { getProfile } from "@/lib/stripe";
import { clientLimitFor, limitMessage } from "@/lib/plans";
import type { Client, ClientMode } from "@/types/database";

const HEX_RE = /^#[0-9a-f]{6}$/i;

export type CreateClientResult =
  | { ok: true; client: Client }
  /** `atLimit` lets the caller offer an upgrade rather than just an error. */
  | { ok: false; error: string; atLimit?: boolean };

/**
 * Create a client workspace.
 *
 * Called from onboarding's "add first client" step and from the dashboard's
 * new-client modal, so it returns the created row — onboarding needs the
 * review_token to show the live link on its done screen.
 */
export async function createClientRecord(input: {
  name: string;
  mode: ClientMode;
  brandColor?: string;
  logoUrl?: string | null;
}): Promise<CreateClientResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const name = input.name?.trim();
  if (!name) return { ok: false, error: "Give this client a name." };

  // Plan ceiling. Checked on the server because the button that respects it
  // lives in the browser, where it can simply be ignored. An admin profile
  // returns Infinity here, so the count below is skipped entirely.
  const profile = await getProfile(user.id);
  const limit = clientLimitFor(profile.plan, profile.is_admin);

  if (Number.isFinite(limit)) {
    const supabase = createClient();
    const { count } = await supabase
      .from("clients")
      .select("id", { count: "exact", head: true });

    if ((count ?? 0) >= limit) {
      return { ok: false, error: limitMessage(profile.plan), atLimit: true };
    }
  }

  const mode: ClientMode = input.mode === "design" ? "design" : "social";

  // Fall back to the mode's own accent when no brand colour is given, so a
  // client workspace is never unbranded.
  const fallback = mode === "design" ? "#534AB7" : "#C8522A";
  const brandColor =
    input.brandColor && HEX_RE.test(input.brandColor)
      ? input.brandColor
      : fallback;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      user_id: user.id,
      name,
      mode,
      brand_color: brandColor,
      logo_url: input.logoUrl ?? null,
    })
    .select()
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  return { ok: true, client: data };
}

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Update a client's presentation settings. RLS scopes this to the owner. */
export async function updateClientRecord(
  clientId: string,
  input: { name?: string; brandColor?: string; mode?: ClientMode },
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const patch: Partial<Client> = {};
  if (input.name?.trim()) patch.name = input.name.trim();
  if (input.brandColor && HEX_RE.test(input.brandColor)) {
    patch.brand_color = input.brandColor;
  }
  if (input.mode === "social" || input.mode === "design") {
    patch.mode = input.mode;
  }
  if (Object.keys(patch).length === 0) return { ok: true };

  const supabase = createClient();
  const { error } = await supabase
    .from("clients")
    .update(patch)
    .eq("id", clientId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/clients/${clientId}`);
  return { ok: true };
}

/**
 * Lock or unlock a deliverable — a locked one is waiting on something else
 * and is shown to the client as not yet ready to review.
 */
export async function setPostLocked(
  postId: string,
  locked: boolean,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("posts")
    .update({ locked })
    .eq("id", postId)
    .select("client_id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/clients/${data.client_id}`);
  return { ok: true };
}

/** Remove a post, deliverable or asset request. RLS scopes this to the owner. */
export async function deletePost(postId: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const supabase = createClient();

  // Read it first for the client_id to revalidate. RLS means a post that
  // isn't the caller's simply isn't found. Versions, comments and assets go
  // with it via the foreign key cascades.
  const { data: owned } = await supabase
    .from("posts")
    .select("id, client_id")
    .eq("id", postId)
    .maybeSingle();

  if (!owned) return { ok: false, error: "That item no longer exists." };

  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/clients/${owned.client_id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}
