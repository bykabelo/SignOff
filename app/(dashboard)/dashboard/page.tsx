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

  return (
    <DashboardPage
      data={data}
      userName={userName}
      appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ""}
    />
  );
}
