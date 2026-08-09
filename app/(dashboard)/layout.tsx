import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth-actions";

/**
 * Auth-gated shell for everything under /dashboard.
 *
 * Middleware already redirects signed-out visitors, so this is the second
 * lock on the same door — and the one that guarantees `user` is non-null for
 * every page rendered inside it.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const name =
    (user.user_metadata?.name as string | undefined) || user.email || "You";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b-hairline border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          {/*
            The lockup on roomy widths, the icon mark once the header gets
            tight — the creator's name and the Plan link share this row.
          */}
          <Link href="/dashboard" aria-label="Signoff dashboard">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/signoff-lockup.svg"
              alt=""
              width={104}
              height={26}
              className="hidden h-[26px] w-[104px] sm:block"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/signoff-icon.svg"
              alt=""
              width={28}
              height={28}
              className="block h-7 w-7 sm:hidden"
            />
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <span className="hidden text-sm text-muted sm:inline">{name}</span>
            <Link
              href="/dashboard/billing"
              className="text-sm text-muted transition-colors hover:text-ink"
            >
              Plan
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="hover-emphasis rounded-soft border-hairline border-line px-3 py-1.5 text-sm text-muted"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:px-8 sm:py-12">
        {children}
      </main>
    </div>
  );
}
