"use client";

import { useFormState, useFormStatus } from "react-dom";
import { signInAction } from "@/lib/auth-actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full rounded-soft bg-ink px-5 py-3 text-sm text-white transition-opacity disabled:opacity-60"
    >
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useFormState(signInAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ""} />

      <label className="flex flex-col gap-2">
        <span className="text-sm text-muted">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-soft border-hairline border-line bg-white px-4 py-3 text-[15px] text-ink outline-none placeholder:text-faint focus:border-ink"
          placeholder="you@studio.com"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm text-muted">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-soft border-hairline border-line bg-white px-4 py-3 text-[15px] text-ink outline-none placeholder:text-faint focus:border-ink"
          placeholder="••••••••"
        />
      </label>

      {state?.error ? (
        <p
          role="alert"
          className="rounded-soft bg-changes-bg px-4 py-3 text-sm text-changes-fg"
        >
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
