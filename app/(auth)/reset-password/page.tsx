import Link from "next/link";
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
  searchParams: { error?: string };
}) {
  return (
    <AuthShell>
      <div className="w-full max-w-[400px]">
        <h1 className="text-3xl">Set a new password</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Choose something you&rsquo;ll remember. You&rsquo;ll sign in with it
          straight after.
        </p>

        <div className="card mt-7 p-6">
          <ResetPasswordForm linkFailed={searchParams.error === "link_invalid"} />
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
