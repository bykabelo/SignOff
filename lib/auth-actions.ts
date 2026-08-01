"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type SignUpResult =
  | { ok: true; needsEmailConfirmation: boolean }
  | { ok: false; error: string };

/**
 * Create an account.
 *
 * Returns rather than redirects because onboarding calls this from step one
 * of a multi-step flow and needs to stay on the page.
 *
 * If "Confirm email" is enabled in Supabase, signUp returns no session and
 * the user cannot continue onboarding until they click the link in their
 * inbox — hence `needsEmailConfirmation`, so the caller can say so plainly
 * instead of failing at the next step with a confusing auth error.
 */
export async function signUp(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<SignUpResult> {
  const email = input.email?.trim();
  const password = input.password ?? "";

  if (!email || !password) {
    return { ok: false, error: "Email and password are both required." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Use at least 8 characters for your password." };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name: input.name?.trim() || null } },
  });

  if (error) return { ok: false, error: error.message };

  return { ok: true, needsEmailConfirmation: !data.session };
}

/** Sign in. Returns rather than redirects, for use from client components. */
export async function signIn(input: {
  email: string;
  password: string;
}): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email?.trim() ?? "",
    password: input.password ?? "",
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Form action for the login page. Redirects on success.
 * `next` carries the path the middleware bounced the user away from.
 */
export async function signInAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const result = await signIn({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!result.ok) return { error: result.error };

  const next = String(formData.get("next") ?? "") || "/dashboard";
  // Only ever redirect within this app — an absolute URL here would be an
  // open redirect straight out of the login form.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
}

/**
 * Store what onboarding asks about the user's work.
 *
 * This lives in the auth user's metadata rather than a profiles table: none
 * of it is queried, joined or filtered on — it is context for the operator,
 * and a whole table plus RLS policy to hold three never-read fields would be
 * weight without a purpose.
 */
export async function saveWorkDetails(input: {
  agencyName?: string;
  clientCount?: string;
  contentTypes?: string[];
}): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({
    data: {
      agency_name: input.agencyName?.trim() || null,
      client_count: input.clientCount ?? null,
      content_types: input.contentTypes ?? [],
    },
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
