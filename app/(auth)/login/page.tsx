import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Sign in — Signoff" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; reset?: string };
}) {
  return (
    <AuthShell>
      <div className="w-full max-w-[400px]">
        <h1 className="text-3xl">Welcome back</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Sign in to see what your clients have said.
        </p>

        {searchParams.reset === "success" ? (
          <p
            role="status"
            className="mt-6 rounded-soft bg-approved-bg px-4 py-3 text-sm leading-relaxed text-approved-fg"
          >
            Your password has been updated. Sign in with it below.
          </p>
        ) : null}

        <div className="card mt-7 p-6">
          <LoginForm next={searchParams.next} />
        </div>

        <p className="mt-5 text-center text-sm">
          <Link
            href="/forgot-password"
            className="text-muted underline underline-offset-4 hover:text-ink"
          >
            Forgot password?
          </Link>
        </p>

        <p className="mt-4 text-center text-sm text-muted">
          New here?{" "}
          <Link href="/signup" className="text-ink underline underline-offset-4">
            Create an account
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
