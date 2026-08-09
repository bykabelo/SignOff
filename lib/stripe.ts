import "server-only";

import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Plan, Profile } from "@/types/database";

/**
 * Stripe client and the profile read/write used by billing.
 *
 * Instantiated lazily rather than at module scope so that the rest of the
 * app still builds and runs with no Stripe keys set — billing is the last
 * thing added and should not be a prerequisite for everything else.
 */
let client: Stripe | null = null;

export function stripe() {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    client = new Stripe(key);
  }
  return client;
}

export const stripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

/**
 * The user's profile, created on demand.
 *
 * The signup trigger normally makes this row, but reading it lazily means a
 * database that has not had the trigger installed yet still works instead of
 * failing at the point of sale.
 */
export async function getProfile(userId: string): Promise<Profile> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (data) return data;

  const { data: created } = await supabase
    .from("profiles")
    .insert({ user_id: userId })
    .select()
    .single();

  // Last-resort shape if even the insert failed, so callers always get a
  // whole Profile rather than having to null-check every field.
  return (
    created ?? {
      user_id: userId,
      plan: "free",
      stripe_customer_id: null,
      stripe_subscription_id: null,
      current_period_end: null,
      updated_at: new Date().toISOString(),
      display_name: null,
      avatar_url: null,
      agency_name: null,
      agency_logo_url: null,
      notify_approvals: true,
      notify_comments: true,
      notify_assets: true,
    }
  );
}

export async function updateProfile(
  userId: string,
  patch: Partial<Omit<Profile, "user_id">>,
) {
  const supabase = createAdminClient();
  await supabase
    .from("profiles")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
}

/**
 * The Stripe customer for this user, reused if one already exists.
 *
 * The Supabase user id goes into customer metadata so a webhook can find its
 * way back to the account even if the local profile row is missing.
 */
export async function customerFor(
  userId: string,
  email: string | undefined,
): Promise<string> {
  const profile = await getProfile(userId);
  if (profile.stripe_customer_id) return profile.stripe_customer_id;

  const customer = await stripe().customers.create({
    email,
    metadata: { supabase_user_id: userId },
  });

  await updateProfile(userId, { stripe_customer_id: customer.id });
  return customer.id;
}

/** Resolve a Stripe customer back to a Supabase user id. */
export async function userIdForCustomer(
  customerId: string,
): Promise<string | null> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (data) return data.user_id;

  // Fall back to the metadata written at customer creation, which survives
  // the profile row being missing or the customer id not yet stored.
  try {
    const customer = await stripe().customers.retrieve(customerId);
    if (!customer.deleted) {
      return (customer.metadata?.supabase_user_id as string) || null;
    }
  } catch {
    // Nothing more to try.
  }

  return null;
}

export type { Plan };
