import type Stripe from "stripe";
import { stripe, updateProfile, userIdForCustomer } from "@/lib/stripe";
import { planForPriceId } from "@/lib/plans";

/**
 * PUBLIC, but authenticated by Stripe's signature rather than a session.
 *
 * This is the only thing that may change a plan. Nothing in the app writes
 * `profiles.plan` from a user action — otherwise anyone could grant
 * themselves Studio by replaying a request.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[signoff] STRIPE_WEBHOOK_SECRET is not set");
    return new Response("Not configured", { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  // The raw body, unparsed: signature verification is over the exact bytes
  // Stripe sent, so anything that re-serialises it invalidates the check.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error("[signoff] stripe signature verification failed", error);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        // Nothing to sync yet if it was not a subscription checkout.
        if (session.mode !== "subscription" || !session.subscription) break;

        const subscription = await stripe().subscriptions.retrieve(
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id,
        );
        await syncSubscription(subscription);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(event.data.object);
        break;
      }

      default:
        break;
    }
  } catch (error) {
    // A 500 tells Stripe to retry, which is what we want for a transient
    // failure — but log it, because a permanent one will retry forever.
    console.error(`[signoff] webhook ${event.type} failed`, error);
    return new Response("Handler failed", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}

/**
 * Bring a profile in line with a Stripe subscription.
 *
 * Stripe's state is the source of truth here, not our own: this runs on
 * renewals, cancellations, card failures and plan switches alike.
 */
async function syncSubscription(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const userId =
    (subscription.metadata?.supabase_user_id as string | undefined) ||
    (await userIdForCustomer(customerId));

  if (!userId) {
    console.error(
      "[signoff] no account matches stripe customer",
      customerId,
    );
    return;
  }

  const item = subscription.items.data[0];

  // Anything not currently paying reverts to free. "past_due" keeps its plan
  // during Stripe's retry window rather than cutting access off on the first
  // failed charge.
  const entitled =
    subscription.status === "active" ||
    subscription.status === "trialing" ||
    subscription.status === "past_due";

  const plan = entitled ? planForPriceId(item?.price?.id) : "free";

  const periodEnd = item?.current_period_end;

  await updateProfile(userId, {
    plan,
    stripe_customer_id: customerId,
    stripe_subscription_id: entitled ? subscription.id : null,
    current_period_end: periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : null,
  });
}
