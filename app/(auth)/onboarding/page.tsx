import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { getUser } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Get started — Signoff" };

/**
 * Onboarding is public: step one is creating the account.
 *
 * A signed-in user who already has a client has finished this flow, so send
 * them to the dashboard rather than inviting them to sign up again. Someone
 * signed in with no clients yet — an interrupted flow, or a confirmed email
 * link — is left here to finish.
 */
export default async function OnboardingPage() {
  const user = await getUser();

  if (user) {
    const supabase = createClient();
    const { count } = await supabase
      .from("clients")
      .select("id", { count: "exact", head: true });

    if ((count ?? 0) > 0) redirect("/dashboard");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const signedInName = user
    ? ((user.user_metadata?.name as string | undefined) ?? user.email ?? "")
    : null;

  return <OnboardingFlow appUrl={appUrl} signedInName={signedInName} />;
}
