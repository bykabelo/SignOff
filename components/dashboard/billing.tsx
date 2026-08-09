"use client";

import { useState } from "react";
import { PLANS, PLAN_ORDER, clientLimitFor } from "@/lib/plans";
import type { Plan } from "@/types/database";

/**
 * Plan picker and billing management.
 *
 * Both actions hand off to Stripe-hosted pages rather than rebuilding card
 * entry, plan switching or cancellation here.
 */
export function Billing({
  plan,
  clientCount,
  hasBilling,
  renewsOn,
  upgraded,
  isAdmin = false,
}: {
  plan: Plan;
  clientCount: number;
  hasBilling: boolean;
  renewsOn: string | null;
  upgraded: boolean;
  isAdmin?: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go(url: string, body?: object) {
    setBusy(url);
    setError(null);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        setError(data?.error ?? "Something went wrong. Try again?");
        setBusy(null);
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("Couldn't reach the server. Check your connection?");
      setBusy(null);
    }
  }

  const current = PLANS[plan];
  const limit = clientLimitFor(plan, isAdmin);

  return (
    <div>
      <h1 className="text-3xl">Plan &amp; billing</h1>
      <p className="mt-2 text-sm text-muted">
        You&rsquo;re on {current.name}, using {clientCount} of{" "}
        {Number.isFinite(limit) ? limit : "unlimited"} client
        {limit === 1 ? "" : "s"}.
        {renewsOn ? ` Renews ${renewsOn}.` : ""}
      </p>

      {isAdmin ? (
        <p className="mt-5 rounded-soft bg-approved-bg px-4 py-3 text-sm leading-relaxed text-approved-fg">
          Founder access is on for this account — plan limits do not apply,
          whichever plan is shown below.
        </p>
      ) : null}

      {upgraded ? (
        <p className="mt-5 rounded-soft bg-approved-bg px-4 py-3 text-sm text-approved-fg">
          You&rsquo;re all set — thanks for upgrading. If the plan below still
          looks wrong, give it a moment and refresh; Stripe confirms in the
          background.
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-5 rounded-soft bg-changes-bg px-4 py-3 text-sm text-changes-fg"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        {PLAN_ORDER.map((key) => {
          const option = PLANS[key];
          const isCurrent = key === plan;

          return (
            <div
              key={key}
              className="flex flex-col rounded-card border-hairline bg-white p-5"
              style={{
                borderColor: isCurrent ? "#2c2c2a" : "#e8e6de",
                borderWidth: isCurrent ? 1 : undefined,
              }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-serif text-xl">{option.name}</h2>
                {isCurrent ? (
                  <span className="rounded-full bg-waiting-bg px-2.5 py-1 text-[11px] font-medium text-waiting-fg">
                    Current
                  </span>
                ) : null}
              </div>

              <p className="mt-3">
                <span className="text-2xl font-medium text-ink">
                  {option.price}
                </span>{" "}
                <span className="text-sm text-faint">{option.priceNote}</span>
              </p>

              <p className="mt-2 text-sm leading-relaxed text-muted">
                {option.blurb}
              </p>

              <ul className="mt-4 flex flex-1 flex-col gap-2">
                {option.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex gap-2 text-[13px] leading-relaxed text-muted"
                  >
                    <span className="text-approved-fg">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                {isCurrent ? (
                  <button
                    type="button"
                    disabled
                    className="w-full cursor-default rounded-soft border-hairline border-line py-3 text-sm text-faint"
                  >
                    Your plan
                  </button>
                ) : key === "free" ? (
                  <button
                    type="button"
                    onClick={() => go("/api/stripe/portal")}
                    disabled={busy !== null}
                    className="hover-emphasis w-full rounded-soft border-hairline border-line py-3 text-sm text-ink disabled:opacity-60"
                  >
                    Downgrade
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => go("/api/stripe/checkout", { plan: key })}
                    disabled={busy !== null}
                    className="w-full rounded-soft bg-ink py-3 text-sm font-medium text-white transition-opacity disabled:opacity-60"
                  >
                    {busy === "/api/stripe/checkout"
                      ? "Opening Stripe…"
                      : `Upgrade to ${option.name}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hasBilling ? (
        <div className="card mt-6 flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <h3 className="font-serif text-lg">Manage billing</h3>
            <p className="mt-1 text-sm text-muted">
              Update your card, switch plan or cancel. Opens Stripe.
            </p>
          </div>
          <button
            type="button"
            onClick={() => go("/api/stripe/portal")}
            disabled={busy !== null}
            className="hover-emphasis shrink-0 rounded-soft border-hairline border-line bg-white px-5 py-3 text-sm font-medium text-ink disabled:opacity-60"
          >
            {busy === "/api/stripe/portal" ? "Opening…" : "Open billing portal"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
