import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Billing } from "@/components/dashboard/billing";
import { getProfile } from "@/lib/stripe";
import { createClient, getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Plan & billing — Signoff" };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { upgraded?: string };
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const profile = await getProfile(user.id);

  const supabase = createClient();
  const { count } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true });

  const renewsOn = profile.current_period_end
    ? new Date(profile.current_period_end).toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-muted">
        ← Back to dashboard
      </Link>
      <div className="mt-4">
        <Billing
          plan={profile.plan}
          clientCount={count ?? 0}
          hasBilling={Boolean(profile.stripe_customer_id)}
          renewsOn={renewsOn}
          upgraded={searchParams.upgraded === "1"}
          isAdmin={profile.is_admin}
        />
      </div>
    </div>
  );
}
