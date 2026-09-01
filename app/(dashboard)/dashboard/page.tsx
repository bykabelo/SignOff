import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { getDashboardData } from "@/lib/data";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard — Signoff" };

export default async function Dashboard() {
  const user = await getUser();
  if (!user) redirect("/login");

  // No redirect when there are no clients: the dashboard has a real empty
  // state that invites adding one, and bouncing to /onboarding here would
  // both duplicate that job and stare across a redirect at the onboarding
  // page's own "already has clients" check.
  const data = await getDashboardData();

  const userName =
    (user.user_metadata?.name as string | undefined) || user.email || "there";

  // Computed server-side (not in the client component) so the date in the
  // header matches what was actually rendered on first paint — a client-side
  // `new Date()` here would hydrate against the visitor's clock and could
  // print a different day than the server just sent down.
  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <DashboardPage
      data={data}
      userName={userName}
      appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ""}
      todayLabel={todayLabel}
    />
  );
}
