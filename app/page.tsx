import Link from "next/link";

/**
 * Placeholder landing page.
 * Replaced by the provided landing-page.html conversion in build step 10.
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6">
      <p className="text-sm uppercase tracking-[0.2em] text-faint">Signoff</p>
      <h1 className="mt-4 text-4xl leading-tight sm:text-5xl">
        Client review and approval, without the back-and-forth.
      </h1>
      <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">
        Share your work through a single link. Your client approves or comments
        — no login, no account. You hear about it the moment they do.
      </p>
      <div className="mt-9 flex flex-wrap gap-3">
        <Link
          href="/signup"
          className="rounded-soft bg-ink px-5 py-3 text-sm text-white"
        >
          Start free
        </Link>
        <Link
          href="/login"
          className="hover-emphasis rounded-soft border-hairline border-line px-5 py-3 text-sm text-ink"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
