import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Set a new password — Signoff",
  // A recovery URL should never end up in a search index.
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: {
    code?: string;
    token_hash?: string;
    type?: string;
    error?: string;
    error_description?: string;
  };
}) {
  /*
   * A code has to be exchanged server-side, where the PKCE verifier cookie
   * can be read and the resulting session cookies can actually be written —
   * a Server Component cannot set cookies, and the browser client cannot be
   * trusted to do it twice.
   *
   * Bouncing to /auth/callback rather than pointing resetPasswordForEmail
   * there directly keeps /reset-password as the only URL Supabase ever
   * redirects to, so the Redirect URLs allowlist does not need a second
   * entry. This redirect is server-side, so the page never renders and the
   * browser client never gets a chance to race the exchange.
   */
  if (searchParams.code) {
    const params = new URLSearchParams({
      code: searchParams.code,
      next: "/reset-password",
    });
    redirect(`/auth/callback?${params}`);
  }

  if (searchParams.token_hash && searchParams.type) {
    const params = new URLSearchParams({
      token_hash: searchParams.token_hash,
      type: searchParams.type,
      next: "/reset-password",
    });
    redirect(`/auth/callback?${params}`);
  }

  const serverError = searchParams.error
    ? (searchParams.error_description ?? "This reset link is no longer valid.")
    : null;

  return (
    <AuthShell>
      <div className="w-full max-w-[400px]">
        <h1 className="text-3xl">Set a new password</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Choose something you&rsquo;ll remember. You&rsquo;ll sign in with it
          straight after.
        </p>

        <div className="card mt-7 p-6">
          <ResetPasswordForm serverError={serverError} />
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/login" className="text-ink underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
