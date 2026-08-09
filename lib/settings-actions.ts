"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import type { NotificationKind, Profile } from "@/types/database";

export type Result = { ok: true } | { ok: false; error: string };

/**
 * Every write here goes through the caller's own session, so row-level
 * security decides which row is touched and the column grants added in
 * migration 0001 decide which fields. `plan` is not among them — a request
 * that tried to include it would be rejected by Postgres, not by this file.
 */

/** Fields the profile form owns. */
export async function saveProfile(input: {
  displayName?: string;
  agencyName?: string;
}): Promise<Result> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const patch: Partial<Profile> = {
    display_name: input.displayName?.trim() || null,
    agency_name: input.agencyName?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  // The dashboard greeting and header avatar read from this row.
  revalidatePath("/settings");
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

/** Clear an avatar or agency logo without uploading a replacement. */
export async function clearImage(
  field: "avatar_url" | "agency_logo_url",
): Promise<Result> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  // Written as literal shapes rather than a computed key: postgrest's update
  // type rejects an index signature, and a literal keeps the column names
  // checked against Profile.
  const now = new Date().toISOString();
  const patch: Partial<Profile> =
    field === "avatar_url"
      ? { avatar_url: null, updated_at: now }
      : { agency_logo_url: null, updated_at: now };

  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

/** One notification toggle. Saved as it is flipped, not behind a Save button. */
export async function setNotification(
  kind: NotificationKind,
  enabled: boolean,
): Promise<Result> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const now = new Date().toISOString();
  const patch: Partial<Profile> | null =
    kind === "approvals"
      ? { notify_approvals: enabled, updated_at: now }
      : kind === "comments"
        ? { notify_comments: enabled, updated_at: now }
        : kind === "assets"
          ? { notify_assets: enabled, updated_at: now }
          : null;

  if (!patch) return { ok: false, error: "Unknown notification type." };

  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}

/**
 * Start an email change.
 *
 * Supabase does not swap the address on the spot: it emails the new one for
 * confirmation and only then applies it. The caller has to say so, or the
 * user watches an unchanged address and assumes it failed.
 */
export async function changeEmail(newEmail: string): Promise<Result> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const email = newEmail?.trim();
  if (!email || !email.includes("@")) {
    return { ok: false, error: "That doesn't look like an email address." };
  }
  if (email.toLowerCase() === user.email?.toLowerCase()) {
    return { ok: false, error: "That's already your email address." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ email });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Change the password, after proving the current one.
 *
 * Supabase will happily set a new password from a valid session alone. That
 * makes a borrowed laptop or a stolen cookie enough to take an account over,
 * so the current password is verified first — signInWithPassword against the
 * same account, which refreshes the session rather than replacing it.
 */
export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<Result> {
  const user = await getUser();
  if (!user?.email) return { ok: false, error: "Please sign in first." };

  if (!input.currentPassword) {
    return { ok: false, error: "Enter your current password." };
  }
  if (input.newPassword.length < 8) {
    return { ok: false, error: "Use at least 8 characters for your new password." };
  }
  if (input.newPassword === input.currentPassword) {
    return { ok: false, error: "That's the password you already have." };
  }

  const supabase = createClient();

  const { error: checkError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: input.currentPassword,
  });

  if (checkError) {
    return { ok: false, error: "That current password isn't right." };
  }

  const { error } = await supabase.auth.updateUser({
    password: input.newPassword,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
