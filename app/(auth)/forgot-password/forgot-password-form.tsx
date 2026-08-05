"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Requests a reset email.
 *
 * Runs in the browser rather than as a server action on purpose: the PKCE
 * flow stores a code_verifier alongside the request, and having the browser
 * that will open the link be the one that holds it is what makes the default
 * email template work without further configuration.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim() || busy) return;

    setBusy(true);
    setError(null);

    /*
     * Points straight at /reset-password, with no query string.
     *
     * Supabase only honours redirect_to when it matches the project's
     * Redirect URLs allowlist; anything else is silently swapped for the
     * Site URL, which lands the user on the marketing page with no clue why.
     * A bare path is the easiest possible thing to allowlist exactly.
     *
     * NEXT_PUBLIC_APP_URL is preferred over window.location.origin so the
     * link is pinned to the canonical domain — a Vercel preview deployment
     * has its own origin, which would never be on the allowlist.
     */
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: `${appUrl}/reset-password` },
    );

    setBusy(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
  }

  /*
   * The confirmation never says whether the address had an account. Supabase
   * returns success either way, and repeating that here keeps the form from
   * becoming a way to test which emails are registered.
   */
  if (sent) {
    return (
      <div>
        <p className="rounded-soft bg-approved-bg px-4 py-3 text-sm leading-relaxed text-approved-fg">
          Check your email for a reset link.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          If an account exists for <strong className="text-ink">{email}</strong>,
          a link is on its way. It expires in an hour, and it opens best in
          this browser.
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setError(null);
          }}
          className="mt-4 text-sm text-ink underline underline-offset-4"
        >
          Use a different address
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-sm text-muted">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-soft border-hairline border-line bg-white px-4 py-3 text-[15px] text-ink outline-none placeholder:text-faint focus:border-ink"
          placeholder="you@studio.com"
        />
      </label>

      {error ? (
        <p
          role="alert"
          className="rounded-soft bg-changes-bg px-4 py-3 text-sm text-changes-fg"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy || !email.trim()}
        className="mt-2 w-full rounded-soft bg-ink px-5 py-3 text-sm text-white transition-opacity disabled:opacity-60"
      >
        {busy ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
