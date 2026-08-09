import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/stripe";
import { createClient, getUser } from "@/lib/supabase/server";
import {
  AccountSection,
  BrandingSection,
  NotificationsSection,
  PlanSection,
  ProfileSection,
} from "@/components/settings/sections";

export const metadata: Metadata = { title: "Settings — Signoff" };

export default async function SettingsPage() {
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

      <h1 className="mt-4 text-3xl">Settings</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        Your profile, your branding, and how Signoff gets in touch.
      </p>

      <div className="mt-8 flex flex-col gap-5">
        <ProfileSection profile={profile} />
        <BrandingSection profile={profile} />
        <AccountSection email={user.email ?? ""} />
        <NotificationsSection profile={profile} />
        <PlanSection
          plan={profile.plan}
          clientCount={count ?? 0}
          renewsOn={renewsOn}
          isAdmin={profile.is_admin}
        />
      </div>
    </div>
  );
}
