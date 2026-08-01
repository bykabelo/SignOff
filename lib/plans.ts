import type { Plan } from "@/types/database";

/**
 * Plans and what they allow.
 *
 * The free tier is deliberately generous enough to be genuinely usable —
 * one real client, with every feature — because it is the acquisition hook,
 * not a demo.
 */
export const PLANS: Record<
  Plan,
  {
    name: string;
    price: string;
    priceNote: string;
    clientLimit: number;
    blurb: string;
    features: string[];
  }
> = {
  free: {
    name: "Free",
    price: "$0",
    priceNote: "forever",
    clientLimit: 1,
    blurb: "Everything, for one client.",
    features: [
      "1 client workspace",
      "Unlimited posts and deliverables",
      "Version history and asset requests",
      "Email notifications",
    ],
  },
  solo: {
    name: "Solo",
    price: "$9",
    priceNote: "per month",
    clientLimit: 5,
    blurb: "For a freelancer with a handful of clients.",
    features: [
      "5 client workspaces",
      "Everything in Free",
      "Your brand colour on every review page",
    ],
  },
  studio: {
    name: "Studio",
    price: "$19",
    priceNote: "per month",
    clientLimit: Number.POSITIVE_INFINITY,
    blurb: "For a studio running a full roster.",
    features: [
      "Unlimited client workspaces",
      "Everything in Solo",
      "Priority support",
    ],
  },
};

export const PLAN_ORDER: Plan[] = ["free", "solo", "studio"];

export function clientLimitFor(plan: Plan) {
  return PLANS[plan]?.clientLimit ?? PLANS.free.clientLimit;
}

/** Map a Stripe price ID back to a plan. Unknown prices fall back to free. */
export function planForPriceId(priceId: string | null | undefined): Plan {
  if (!priceId) return "free";
  if (priceId === process.env.STRIPE_PRICE_SOLO) return "solo";
  if (priceId === process.env.STRIPE_PRICE_STUDIO) return "studio";
  return "free";
}

export function priceIdFor(plan: Plan): string | null {
  if (plan === "solo") return process.env.STRIPE_PRICE_SOLO ?? null;
  if (plan === "studio") return process.env.STRIPE_PRICE_STUDIO ?? null;
  return null;
}

/** The message shown when someone hits their plan's ceiling. */
export function limitMessage(plan: Plan) {
  const limit = clientLimitFor(plan);
  if (plan === "free") {
    return "The free plan covers one client. Upgrade to Solo for five, or Studio for as many as you like.";
  }
  return `Your ${PLANS[plan].name} plan covers ${limit} clients. Upgrade to Studio for unlimited.`;
}
