import { getUser } from "@/lib/supabase/server";
import { customerFor, stripe, stripeConfigured } from "@/lib/stripe";
import { priceIdFor } from "@/lib/plans";
import { jsonOk, jsonError, unauthorised, serverError } from "@/lib/api";
import type { Plan } from "@/types/database";

/** CREATOR ONLY. Start a Stripe Checkout session for a paid plan. */
export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) return unauthorised();

    if (!stripeConfigured()) {
      return jsonError("Billing isn't set up on this deployment yet.", 503);
    }

    const body = await request.json().catch(() => null);
    const plan = body?.plan as Plan | undefined;

    if (plan !== "solo" && plan !== "studio") {
      return jsonError("Pick a plan to upgrade to.");
    }

    const price = priceIdFor(plan);
    if (!price) {
      return jsonError(
        `No Stripe price is configured for the ${plan} plan.`,
        503,
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
    const customer = await customerFor(user.id, user.email);

    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer,
      line_items: [{ price, quantity: 1 }],
      success_url: `${appUrl}/dashboard/billing?upgraded=1`,
      cancel_url: `${appUrl}/dashboard/billing`,
      allow_promotion_codes: true,
      // Carried through to the webhook so a subscription can be matched to
      // an account even before the customer id has been written locally.
      subscription_data: { metadata: { supabase_user_id: user.id } },
      metadata: { supabase_user_id: user.id },
    });

    if (!session.url) return serverError("checkout session had no url", session.id);

    return jsonOk({ url: session.url });
  } catch (error) {
    return serverError("checkout threw", error);
  }
}
