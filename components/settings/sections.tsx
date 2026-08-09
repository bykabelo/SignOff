"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  changeEmail,
  changePassword,
  saveProfile,
  setNotification,
} from "@/lib/settings-actions";
import { PLANS, clientLimitFor } from "@/lib/plans";
import { ImageUpload } from "./image-upload";
import {
  Field,
  Notice,
  SaveButton,
  SettingsCard,
  inputClass,
  useSave,
} from "./section";
import type { NotificationKind, Plan, Profile } from "@/types/database";

/* ── 1. Profile ──────────────────────────────────────────── */

export function ProfileSection({ profile }: { profile: Profile }) {
  const { busy, error, saved, run } = useSave();
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [agencyName, setAgencyName] = useState(profile.agency_name ?? "");

  return (
    <SettingsCard
      title="Profile"
      description="How you appear inside Signoff. Your clients never see this — their review pages carry their own branding."
    >
      <div className="flex flex-col gap-6">
        <ImageUpload
          kind="avatar"
          currentUrl={profile.avatar_url}
          shape="circle"
          label="Upload a photo"
          alt="Your avatar"
        />

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => saveProfile({ displayName, agencyName }));
          }}
        >
          <Field label="Display name">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Kabelo M."
              className={inputClass}
            />
          </Field>

          <Field
            label="Agency name"
            hint="Used where Signoff refers to your studio rather than to you."
          >
            <input
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              placeholder="RevHaus Studio"
              className={inputClass}
            />
          </Field>

          {error ? <Notice tone="bad">{error}</Notice> : null}
          {saved ? <Notice tone="ok">{saved}</Notice> : null}

          <div>
            <SaveButton busy={busy} />
          </div>
        </form>
      </div>
    </SettingsCard>
  );
}

/* ── 2. Branding ─────────────────────────────────────────── */

export function BrandingSection({ profile }: { profile: Profile }) {
  return (
    <SettingsCard
      title="Branding"
      description="Your agency logo, shown in your dashboard. Each client's review page uses that client's own brand colour and logo instead."
    >
      <ImageUpload
        kind="logo"
        currentUrl={profile.agency_logo_url}
        shape="rounded"
        label="Upload a logo"
        alt="Your agency logo"
      />
    </SettingsCard>
  );
}

/* ── 3. Account ──────────────────────────────────────────── */

export function AccountSection({ email }: { email: string }) {
  const emailSave = useSave();
  const passwordSave = useSave();

  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  return (
    <SettingsCard title="Account" description="Your sign-in details.">
      <div className="flex flex-col gap-8">
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await emailSave.run(
              () => changeEmail(newEmail),
              `Confirmation sent to ${newEmail}. The change takes effect once you click the link in it.`,
            );
            if (ok) setNewEmail("");
          }}
        >
          <Field label="Current email">
            <input value={email} readOnly className={`${inputClass} text-muted`} />
          </Field>

          <Field label="New email">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="you@studio.com"
              className={inputClass}
            />
          </Field>

          {emailSave.error ? (
            <Notice tone="bad">{emailSave.error}</Notice>
          ) : null}
          {emailSave.saved ? <Notice tone="ok">{emailSave.saved}</Notice> : null}

          <div>
            <SaveButton busy={emailSave.busy} disabled={!newEmail.trim()}>
              Change email
            </SaveButton>
          </div>
        </form>

        <form
          className="flex flex-col gap-4 border-t-hairline border-line pt-8"
          onSubmit={async (e) => {
            e.preventDefault();
            if (newPassword !== confirmPassword) {
              // Handled here rather than server-side: the server never needs
              // to see a mismatch it cannot act on.
              await passwordSave.run(async () => ({
                ok: false,
                error: "Those two passwords don't match.",
              }));
              return;
            }
            const ok = await passwordSave.run(
              () => changePassword({ currentPassword, newPassword }),
              "Password updated.",
            );
            if (ok) {
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
            }
          }}
        >
          <Field label="Current password">
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="New password" hint="At least 8 characters.">
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Confirm new password">
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
          </Field>

          {passwordSave.error ? (
            <Notice tone="bad">{passwordSave.error}</Notice>
          ) : null}
          {passwordSave.saved ? (
            <Notice tone="ok">{passwordSave.saved}</Notice>
          ) : null}

          <div>
            <SaveButton
              busy={passwordSave.busy}
              disabled={!currentPassword || !newPassword}
            >
              Change password
            </SaveButton>
          </div>
        </form>
      </div>
    </SettingsCard>
  );
}

/* ── 4. Notifications ────────────────────────────────────── */

const TOGGLES: {
  kind: NotificationKind;
  field: keyof Profile;
  title: string;
  blurb: string;
}[] = [
  {
    kind: "approvals",
    field: "notify_approvals",
    title: "Approvals and change requests",
    blurb: "When a client approves something or asks for a change.",
  },
  {
    kind: "comments",
    field: "notify_comments",
    title: "Comments",
    blurb: "When a client leaves a note on a post or a version.",
  },
  {
    kind: "assets",
    field: "notify_assets",
    title: "Asset uploads",
    blurb: "When a client sends back a file you asked for.",
  },
];

function Switch({
  checked,
  busy,
  onChange,
  label,
}: {
  checked: boolean;
  busy: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={busy}
      onClick={() => onChange(!checked)}
      className="relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60"
      style={{ background: checked ? "#27500A" : "#d3d1c7" }}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all"
        style={{ left: checked ? 22 : 2 }}
      />
    </button>
  );
}

export function NotificationsSection({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [values, setValues] = useState({
    notify_approvals: profile.notify_approvals,
    notify_comments: profile.notify_comments,
    notify_assets: profile.notify_assets,
  });
  const [busy, setBusy] = useState<NotificationKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(kind: NotificationKind, field: keyof Profile, next: boolean) {
    // Optimistic: a switch that waits on a round trip feels broken.
    setValues((v) => ({ ...v, [field]: next }));
    setBusy(kind);
    setError(null);

    const result = await setNotification(kind, next);
    setBusy(null);

    if (!result.ok) {
      setValues((v) => ({ ...v, [field]: !next }));
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <SettingsCard
      title="Notifications"
      description="Which emails Signoff sends you. Turning one off stops the email — the activity still appears in your dashboard."
    >
      <div className="flex flex-col gap-1">
        {TOGGLES.map((item, i) => {
          const checked = values[
            item.field as keyof typeof values
          ] as boolean;

          return (
            <div
              key={item.kind}
              className={`flex items-start justify-between gap-4 py-4 ${
                i < TOGGLES.length - 1 ? "border-b-hairline border-line" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{item.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">
                  {item.blurb}
                </p>
              </div>
              <Switch
                checked={checked}
                busy={busy === item.kind}
                label={item.title}
                onChange={(next) => toggle(item.kind, item.field, next)}
              />
            </div>
          );
        })}
      </div>

      {error ? (
        <div className="mt-4">
          <Notice tone="bad">{error}</Notice>
        </div>
      ) : null}
    </SettingsCard>
  );
}

/* ── 5. Plan ─────────────────────────────────────────────── */

export function PlanSection({
  plan,
  clientCount,
  renewsOn,
  isAdmin = false,
}: {
  plan: Plan;
  clientCount: number;
  renewsOn: string | null;
  isAdmin?: boolean;
}) {
  const current = PLANS[plan];
  const limit = clientLimitFor(plan, isAdmin);

  return (
    <SettingsCard
      title="Plan"
      description={
        renewsOn
          ? `You're on ${current.name}. Renews ${renewsOn}.`
          : `You're on ${current.name}.`
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-2xl font-medium text-ink">
            {current.price}
            <span className="ml-1.5 text-sm font-normal text-faint">
              {current.priceNote}
            </span>
          </p>
          <p className="mt-1 text-sm text-muted">
            {clientCount} of {Number.isFinite(limit) ? limit : "unlimited"}{" "}
            client{limit === 1 ? "" : "s"} in use
          </p>
          {isAdmin ? (
            <p className="mt-1.5 text-sm text-approved-fg">
              Founder access — plan limits do not apply to this account.
            </p>
          ) : null}
        </div>

        <Link
          href="/dashboard/billing"
          className="rounded-soft bg-ink px-5 py-3 text-sm font-medium text-white"
        >
          {plan === "studio" ? "Manage billing" : "See plans"}
        </Link>
      </div>
    </SettingsCard>
  );
}
