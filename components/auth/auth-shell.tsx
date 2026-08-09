import Link from "next/link";

/**
 * Chrome for the sign-in screens.
 *
 * Deliberately a component rather than a route-group layout: onboarding
 * shares the (auth) group but is a full-bleed flow with its own progress
 * chrome, and a shared layout would stack this header on top of it.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-6 py-6 sm:px-10">
        <Link href="/" aria-label="Signoff home" className="inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/signoff-lockup.svg"
            alt=""
            width={104}
            height={26}
            className="block h-[26px] w-[104px]"
          />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-6 pb-16 pt-4 sm:items-center sm:pt-0">
        {children}
      </main>
    </div>
  );
}
