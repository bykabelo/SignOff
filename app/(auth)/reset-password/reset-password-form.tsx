"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { EmailOtpType } from "@supabase/supabase-js";

type Status = "checking" | "ready" | "invalid";

/**
 * Reads whatever Supabase put in the URL and turns it into a session.
 *
 * Three shapes can arrive, depending on project settings and the email
 * template, so all three are handled rather than assumed:
 *
 *   ?code=…                  PKCE. What @supabase/ssr produces by default,
 *                            since it hardcodes flowType: "pkce".
 *   ?token_hash=…&type=…     OTP, when the template uses {{ .TokenHash }}.
 *   #access_token=…          Implicit, if the project is set that way.
 *
 * Supabase can also report failure in either the query string or the hash,
 * and its reason is worth showing: "expired" and "opened in the wrong
 * browser" look identical otherwise.
 */
export function ResetPasswordForm({
  serverError,
}: {
  serverError?: string | null;
}) {
  const [status, setStatus] = useState<Status>(
    serverError ? "invalid" : "checking",
  );
  const [reason, setReason] = useState<string | null>(serverError ?? null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (serverError) return;

    const supabase = createClient();
    let active = true;

    const finish = (ok: boolean, why?: string) => {
      if (!active) return;
      if (ok) {
        setStatus("ready");
        // Drop the credential from the address bar so a refresh does not
        // replay a code that has already been consumed.
        window.history.replaceState({}, "", window.location.pathname);
      } else {
        setReason(why ?? null);
        setStatus("invalid");
      }
    };

    async function resolve() {
      const query = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

      // Supabase reports its own failures in one or the other.
      const reported =
        query.get("error_description") ?? hash.get("error_description");
      if (reported) {
        finish(false, reported.replace(/\+/g, " "));
        return;
      }

      const code = query.get("code");
      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        finish(!exchangeError, exchangeError?.message);
        return;
      }

      const tokenHash = query.get("token_hash");
      const type = query.get("type") as EmailOtpType | null;
      if (tokenHash && type) {
        const { error: otpError } = await supabase.auth.verifyOtp({
          type,
          token_hash: tokenHash,
        });
        finish(!otpError, otpError?.message);
        return;
      }

      // Implicit flow, or an already-established session. detectSessionInUrl
      // consumes the fragment asynchronously, so allow for it arriving late.
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        finish(true);
        return;
      }

      if (hash.get("access_token")) {
        setTimeout(async () => {
          const { data: retry } = await supabase.auth.getSession();
          finish(
            Boolean(retry.session),
            retry.session ? undefined : "That link could not be verified.",
          );
        }, 1500);
        return;
      }

      finish(false, "This page was opened without a reset link.");
    }

    void resolve();

    return () => {
      active = false;
    };
  }, [serverError]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    if (password !== confirm) {
      setError("Those two passwords don't match.");
      return;
    }

    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setBusy(false);
      setError(updateError.message);
      return;
    }

    /*
     * A recovery link leaves the user signed in. Ending that session makes
     * them prove the new password, and stops the middleware bouncing them
     * from /login to /dashboard on arrival. A full navigation, so the server
     * sees the cleared cookie rather than racing it.
     */
    await supabase.auth.signOut();
    window.location.assign("/login?reset=success");
  }

  if (status === "checking") {
    return <p className="text-sm text-muted">Checking your link…</p>;
  }

  if (status === "invalid") {
    return (
      <div>
        <p className="rounded-soft bg-changes-bg px-4 py-3 text-sm leading-relaxed text-changes-fg">
          {reason ?? "This reset link is no longer valid."}
        </p>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Reset links expire after an hour and can only be used once. They also
          need to be opened in the same browser that asked for them.
        </p>
        <Link
          href="/forgot-password"
          className="mt-5 block w-full rounded-soft bg-ink px-5 py-3 text-center text-sm text-white"
        >
          Send a new link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-sm text-muted">New password</span>
        <input
          type="password"
          autoComplete="new-password"
          required
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-soft border-hairline border-line bg-white px-4 py-3 text-[15px] text-ink outline-none placeholder:text-faint focus:border-ink"
          placeholder="At least 8 characters"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm text-muted">Confirm new password</span>
        <input
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="rounded-soft border-hairline border-line bg-white px-4 py-3 text-[15px] text-ink outline-none placeholder:text-faint focus:border-ink"
          placeholder="Type it again"
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
        disabled={busy}
        className="mt-2 w-full rounded-soft bg-ink px-5 py-3 text-sm text-white transition-opacity disabled:opacity-60"
      >
        {busy ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
