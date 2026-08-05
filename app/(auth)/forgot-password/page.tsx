import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Reset your password — Signoff" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <div className="w-full max-w-[400px]">
        <h1 className="text-3xl">Forgot your password?</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Give us the email you signed up with and we&rsquo;ll send you a link
          to set a new one.
        </p>

        <div className="card mt-7 p-6">
          <ForgotPasswordForm />
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Remembered it?{" "}
          <Link href="/login" className="text-ink underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
