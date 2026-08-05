"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Status = "checking" | "ready" | "invalid";

/**
 * Sets a new password from a recovery link.
 *
 * Session detection runs in the browser rather than on the server because
 * the two link flows deliver the session differently. PKCE has already been
 * exchanged into a cookie by /auth/callback, which the server could read —
 * but an implicit-flow link arrives as a URL fragment, and a fragment is
 * never sent to the server. Checking here covers both.
 */
export function ResetPasswordForm({ linkFailed }: { linkFailed: boolean }) {
  const [status, setStatus] = useState<Status>(
    linkFailed ? "invalid" : "checking",
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (linkFailed) return;

    const supabase = createClient();
    let active = true;

    // A fragment-borne session is parsed asynchronously after mount, so the
    // listener is what catches it; getSession covers the cookie case.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) setStatus("ready");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      if (session) {
        setStatus("ready");
        return;
      }
      // Give the fragment a moment to be consumed before calling it dead,
      // otherwise a valid link flashes an error on the way in.
      const hasPendingAuth =
        window.location.hash.includes("access_token") ||
        window.location.hash.includes("error");
      if (!hasPendingAuth) {
        setStatus("invalid");
        return;
      }
      setTimeout(() => {
        if (!active) return;
        setStatus((current) => (current === "checking" ? "invalid" : current));
      }, 1500);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [linkFailed]);

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
     * A recovery link leaves the user signed in. Ending that session does
     * two things: it proves the new password works by making them use it,
     * and it stops the middleware bouncing them straight from /login to
     * /dashboard on the redirect below.
     *
     * A full navigation rather than router.push, so the server is guaranteed
     * to see the cleared cookie rather than racing it.
     */
    await supabase.auth.signOut();
    window.location.assign("/login?reset=success");
  }

  if (status === "checking") {
    return (
      <p className="text-sm text-muted">Checking your link…</p>
    );
  }

  if (status === "invalid") {
    return (
      <div>
        <p className="rounded-soft bg-changes-bg px-4 py-3 text-sm leading-relaxed text-changes-fg">
          This reset link is no longer valid.
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
