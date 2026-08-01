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
          <Link href="/dashboard" className="font-serif text-lg text-ink">
            Signoff
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
