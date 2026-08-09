"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Status = "checking" | "ready" | "invalid";

/**
 * Collects the new password once a recovery session exists.
 *
 * This deliberately does not exchange anything. A `?code=` is handled by
 * /auth/callback before this page renders, because supabase-js exchanges
 * the code itself on init and deletes the PKCE verifier as it does — a
 * second exchange from here fails with "code verifier not found in
 * storage", which reads like a storage bug but is really a double spend.
 *
 * All that is left to do here is notice the session. The only case still
 * worth waiting for is an implicit-flow fragment, which never reaches the
 * server and is consumed asynchronously after mount.
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) setStatus("ready");
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;

      if (data.session) {
        setStatus("ready");
        return;
      }

      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

      const reported = hash.get("error_description");
      if (reported) {
        setReason(reported.replace(/\+/g, " "));
        setStatus("invalid");
        return;
      }

      // A fragment is still being consumed; give it a moment before calling
      // the link dead, so a working link does not flash an error on arrival.
      if (hash.get("access_token")) {
        setTimeout(() => {
          if (!active) return;
          setStatus((current) => (current === "checking" ? "invalid" : current));
        }, 1500);
        return;
      }

      setReason("This page was opened without a reset link.");
      setStatus("invalid");
    });

    return () => {
      active = false;
      subscription.unsubscribe();
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
