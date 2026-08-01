import { getUser } from "@/lib/supabase/server";
import { getProfile, stripe, stripeConfigured } from "@/lib/stripe";
import { jsonOk, jsonError, unauthorised, serverError } from "@/lib/api";

/**
 * CREATOR ONLY. Open Stripe's billing portal.
 *
 * Changing a card, switching plan and cancelling all live there rather than
 * being rebuilt here — Stripe already handles tax, proration and dunning.
 */
export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) return unauthorised();

    if (!stripeConfigured()) {
      return jsonError("Billing isn't set up on this deployment yet.", 503);
    }

    const profile = await getProfile(user.id);
    if (!profile.stripe_customer_id) {
      return jsonError("There's no billing history on this account yet.");
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

    const session = await stripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/dashboard/billing`,
    });

    return jsonOk({ url: session.url });
  } catch (error) {
    return serverError("portal threw", error);
  }
}
