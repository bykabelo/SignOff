"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp, saveWorkDetails } from "@/lib/auth-actions";
import { createClientRecord } from "@/lib/client-actions";
import { getInitials } from "@/lib/format";
import type { ClientMode } from "@/types/database";

/*
 * Guided signup: account → about your work → first client → the live link.
 *
 * Each step commits its own work to the server before advancing, so a flow
 * abandoned at step three still leaves a usable account rather than nothing.
 */

const BRAND_COLORS = [
  "#C8522A",
  "#185FA5",
  "#534AB7",
  "#1D9E75",
  "#D85A30",
  "#993556",
];

const CONTENT_TYPES = [
  "📱 Social media",
  "🎬 Video",
  "📸 Photography",
  "✏️ Copywriting",
  "🎨 Design",
];

const CLIENT_COUNTS = [
  "Just me (1–2)",
  "Small team (3–5)",
  "Growing (6–10)",
  "10+",
];

/* ── Icons ───────────────────────────────────────────────── */

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M10 4L6 8l4 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* ── Shared pieces ───────────────────────────────────────── */

function StepLabel({ step, total }: { step: number; total: number }) {
  return (
    <p className="mb-2 text-xs font-medium uppercase tracking-[.06em] text-faint">
      Step {step} of {total}
    </p>
  );
}

function PrimaryBtn({
  onClick,
  disabled,
  children,
  className = "",
  type = "button",
}: {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-[14px] px-0 py-[15px] text-[15px] font-medium tracking-[-.01em] text-white transition-opacity ${
        disabled ? "cursor-default bg-[#d3d1c7]" : "bg-ink hover:opacity-[.88]"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Back"
      className="hover-emphasis flex items-center justify-center rounded-[14px] border-[1.5px] border-line px-[18px] py-[15px] text-muted"
    >
      <BackIcon />
    </button>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  autoFocus = false,
  autoComplete,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  autoFocus?: boolean;
  autoComplete?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      autoFocus={autoFocus}
      autoComplete={autoComplete}
      className="w-full rounded-xl border-[1.5px] border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition-all placeholder:text-faint focus:border-ink focus:shadow-[0_0_0_3px_rgba(44,42,42,.07)]"
    />
  );
}

function Tag({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-4 py-2 text-[13px] transition-all ${
        selected
          ? "border-ink bg-ink text-white"
          : "border-line bg-white text-[#5F5E5A]"
      }`}
    >
      {label}
    </button>
  );
}

function ErrorNote({ children }: { children?: string | null }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-xl bg-changes-bg px-4 py-3 text-sm text-changes-fg"
    >
      {children}
    </p>
  );
}

function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex justify-center gap-1.5 pt-[22px]">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-1.5 rounded-full transition-all"
          style={{
            background: i <= step ? "#2c2c2a" : "#e8e6de",
            width: i <= step ? 18 : 6,
          }}
        />
      ))}
    </div>
  );
}

/* ── Live preview of the client's review page ────────────── */

function ClientPreview({
  name,
  color,
  mode,
}: {
  name: string;
  color: string;
  mode: ClientMode;
}) {
  const initials = name ? getInitials(name) : "?";

  return (
    <div className="overflow-hidden rounded-card border-hairline border-line bg-white">
      <div
        className="flex items-center gap-2.5 px-4 py-3.5"
        style={{ background: color }}
      >
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] bg-white/25 text-[10px] font-semibold text-white">
          {initials}
        </div>
        <div>
          <div className="text-[13px] font-medium text-white">
            {name || "Your client"}
          </div>
          <div className="text-[10px] text-white/70">
            {mode === "design" ? "Design project" : "Content review"}
          </div>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="mb-2 font-serif text-[15px] text-ink">
          {mode === "design"
            ? "Your project is taking shape."
            : "Your content is ready."}
        </div>
        <div className="flex h-12 items-center gap-2 rounded-lg bg-[#f4f2ec] px-3">
          <div className="h-8 w-8 shrink-0 rounded-md bg-line" />
          <div className="flex-1">
            <div className="mb-[5px] h-2 w-3/5 rounded bg-line" />
            <div className="h-1.5 w-2/5 rounded bg-[#eeedea]" />
          </div>
          <div className="rounded-full bg-approved-bg px-2 py-[3px] text-[10px] font-medium text-approved-fg">
            Approved
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Screen 0: Welcome ───────────────────────────────────── */

function WelcomeScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 pb-6 pt-10 text-center">
      {/* The icon mark stands in for the lockup here: the wordmark would be
          redundant directly above a headline that says the same thing. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/signoff-icon.svg"
        alt=""
        width={64}
        height={64}
        className="mb-7 h-16 w-16"
      />


      <h1 className="mb-3 text-[30px] leading-[1.2] tracking-[-.02em]">
        Client approvals,
        <br />
        <em>without the chaos.</em>
      </h1>
      <p className="mb-9 max-w-[300px] text-[15px] leading-[1.65] text-muted">
        Signoff gives your clients a beautiful, simple way to review and approve
        content — no logins, no confusion.
      </p>

      <div className="w-full max-w-[340px]">
        <PrimaryBtn onClick={onNext}>Get started — it&rsquo;s free</PrimaryBtn>
        <Link
          href="/login"
          className="block w-full py-3 text-center text-sm text-muted transition-colors hover:text-ink"
        >
          Already have an account? Sign in
        </Link>
      </div>
    </div>
  );
}

/* ── Screen 1: Account ───────────────────────────────────── */

function AccountScreen({
  initial,
  onNext,
}: {
  initial: { name: string; email: string };
  onNext: (data: { name: string; email: string }) => void;
}) {
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState(false);

  // 8 characters to match what the server enforces — a form that accepts 6
  // and then fails on submit is worse than one that asks for 8 up front.
  const valid = name.trim() && email.includes("@") && password.length >= 8;

  async function handleNext() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);

    const result = await signUp({ email, password, name });
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (result.needsEmailConfirmation) {
      setConfirmEmail(true);
      return;
    }

    onNext({ name, email });
  }

  if (confirmEmail) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-7 pb-6 pt-10 text-center">
        <div className="mb-5 text-[44px]">📬</div>
        <h2 className="mb-2.5 text-[26px] tracking-[-.02em]">
          Check your inbox.
        </h2>
        <p className="max-w-[320px] text-sm leading-[1.65] text-muted">
          We sent a confirmation link to{" "}
          <strong className="text-ink">{email}</strong>. Click it, then sign in
          to finish setting up your first client.
        </p>
        <div className="mt-8 w-full max-w-[340px]">
          <Link href="/login">
            <PrimaryBtn>Go to sign in</PrimaryBtn>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col px-7 pb-6 pt-14">
      <div className="mb-7">
        <StepLabel step={1} total={3} />
        <h2 className="mb-1.5 text-[26px] tracking-[-.02em]">
          Let&rsquo;s start with you.
        </h2>
        <p className="text-sm leading-[1.6] text-muted">
          Takes 30 seconds. No credit card needed.
        </p>
      </div>

      <div className="mb-auto flex flex-col gap-3">
        <TextInput
          value={name}
          onChange={setName}
          placeholder="Your name"
          autoFocus
          autoComplete="name"
        />
        <TextInput
          value={email}
          onChange={setEmail}
          placeholder="Work email"
          type="email"
          autoComplete="email"
        />
        <TextInput
          value={password}
          onChange={setPassword}
          placeholder="Create a password (8+ characters)"
          type="password"
          autoComplete="new-password"
        />
        <ErrorNote>{error}</ErrorNote>
      </div>

      <div className="mt-6">
        <PrimaryBtn onClick={handleNext} disabled={!valid || busy}>
          {busy ? "Creating your account…" : "Continue"}
        </PrimaryBtn>
        <p className="mt-2.5 text-center text-[11px] text-faint">
          By continuing you agree to our Terms &amp; Privacy Policy
        </p>
      </div>
    </div>
  );
}

/* ── Screen 2: About your work ───────────────────────────── */

function AgencyScreen({
  initial,
  onNext,
}: {
  initial: {
    agencyName: string;
    clientCount: string | null;
    contentTypes: string[];
  };
  onNext: (data: {
    agencyName: string;
    clientCount: string;
    contentTypes: string[];
  }) => void;
}) {
  const [agencyName, setAgencyName] = useState(initial.agencyName);
  const [clientCount, setClientCount] = useState<string | null>(
    initial.clientCount,
  );
  const [contentTypes, setContentTypes] = useState<string[]>(
    initial.contentTypes,
  );
  const [busy, setBusy] = useState(false);

  const valid = Boolean(agencyName.trim() && clientCount);

  function toggleType(type: string) {
    setContentTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  async function handleNext() {
    if (!valid || busy) return;
    setBusy(true);

    // Best effort: this is context, not a gate. If it fails to save, the
    // account is still fine and there is nothing useful to tell the user.
    await saveWorkDetails({ agencyName, clientCount: clientCount!, contentTypes });

    setBusy(false);
    onNext({ agencyName, clientCount: clientCount!, contentTypes });
  }

  return (
    <div className="flex flex-1 flex-col px-7 pb-6 pt-14">
      <div className="mb-6">
        <StepLabel step={2} total={3} />
        <h2 className="mb-1.5 text-[26px] tracking-[-.02em]">
          Tell us about your work.
        </h2>
        <p className="text-sm text-muted">
          So we can set things up right for you.
        </p>
      </div>

      <div className="mb-auto flex flex-col gap-6">
        <div>
          <label className="mb-2 block text-xs font-medium text-muted">
            What do you go by?
          </label>
          <TextInput
            value={agencyName}
            onChange={setAgencyName}
            placeholder="Agency or your name (e.g. RevHaus Studio)"
            autoFocus
          />
        </div>

        <div>
          <span className="mb-2.5 block text-xs font-medium text-muted">
            How many clients do you manage?
          </span>
          <div className="flex flex-wrap gap-2">
            {CLIENT_COUNTS.map((label) => (
              <Tag
                key={label}
                label={label}
                selected={clientCount === label}
                onClick={() => setClientCount(label)}
              />
            ))}
          </div>
        </div>

        <div>
          <span className="mb-2.5 block text-xs font-medium text-muted">
            What kind of content do you make?
          </span>
          <div className="flex flex-wrap gap-2">
            {CONTENT_TYPES.map((type) => (
              <Tag
                key={type}
                label={type}
                selected={contentTypes.includes(type)}
                onClick={() => toggleType(type)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* No back button here: step one has already created the account, so
          returning to it would only fail on a duplicate email. */}
      <div className="mt-6">
        <PrimaryBtn onClick={handleNext} disabled={!valid || busy}>
          {busy ? "Saving…" : "Continue"}
        </PrimaryBtn>
      </div>
    </div>
  );
}

/* ── Screen 3: First client ──────────────────────────────── */

const MODES: { value: ClientMode; title: string; blurb: string }[] = [
  {
    value: "social",
    title: "Social content",
    blurb: "Weekly posts they approve one by one.",
  },
  {
    value: "design",
    title: "Design project",
    blurb: "Deliverables with versions and asset requests.",
  },
];

function FirstClientScreen({
  onNext,
  onBack,
}: {
  onNext: (data: {
    clientName: string;
    reviewToken: string;
    mode: ClientMode;
  }) => void;
  onBack?: () => void;
}) {
  const [clientName, setClientName] = useState("");
  const [brandColor, setBrandColor] = useState(BRAND_COLORS[0]);
  const [mode, setMode] = useState<ClientMode>("social");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleNext() {
    if (!clientName.trim() || busy) return;
    setBusy(true);
    setError(null);

    const result = await createClientRecord({
      name: clientName,
      mode,
      brandColor,
    });

    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onNext({
      clientName: result.client.name,
      reviewToken: result.client.review_token,
      mode,
    });
  }

  return (
    <div className="flex flex-1 flex-col px-7 pb-6 pt-14">
      <div className="mb-6">
        <StepLabel step={3} total={3} />
        <h2 className="mb-1.5 text-[26px] tracking-[-.02em]">
          Add your first client.
        </h2>
        <p className="text-sm leading-[1.6] text-muted">
          We&rsquo;ll set up their approval page. Add more any time.
        </p>
      </div>

      <div className="mb-auto flex flex-col gap-6">
        <div>
          <label className="mb-2 block text-xs font-medium text-muted">
            Client name
          </label>
          <TextInput
            value={clientName}
            onChange={setClientName}
            placeholder="e.g. Central City Market"
            autoFocus
          />
        </div>

        {/* Mode — decides which review page this client sees. */}
        <div>
          <span className="mb-2.5 block text-xs font-medium text-muted">
            What kind of work is this?
          </span>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {MODES.map((option) => {
              const selected = mode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMode(option.value)}
                  aria-pressed={selected}
                  className={`rounded-xl border-[1.5px] p-3.5 text-left transition-all ${
                    selected ? "border-ink bg-white" : "border-line bg-white"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px]"
                      style={{
                        borderColor: selected ? "#2c2c2a" : "#d3d1c7",
                        background: selected ? "#2c2c2a" : "transparent",
                      }}
                    >
                      {selected ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      ) : null}
                    </span>
                    <span className="text-sm font-medium text-ink">
                      {option.title}
                    </span>
                  </span>
                  <span className="mt-1.5 block text-xs leading-relaxed text-muted">
                    {option.blurb}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className="mb-2.5 block text-xs font-medium text-muted">
            Brand color
          </span>
          <div className="flex flex-wrap items-center gap-2.5">
            {BRAND_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Brand colour ${color}`}
                aria-pressed={brandColor === color}
                onClick={() => setBrandColor(color)}
                className="h-[38px] w-[38px] shrink-0 rounded-[10px] transition-all"
                style={{
                  background: color,
                  border:
                    brandColor === color
                      ? "2.5px solid #2c2c2a"
                      : "2px solid transparent",
                  transform: brandColor === color ? "scale(1.08)" : "scale(1)",
                }}
              />
            ))}
            <label className="relative cursor-pointer">
              <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border-[1.5px] border-dashed border-[#d3d1c7] text-lg text-faint">
                +
              </span>
              <input
                type="color"
                aria-label="Custom brand colour"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          </div>
        </div>

        <div>
          <span className="mb-2 block text-xs font-medium text-muted">
            Live preview
          </span>
          <ClientPreview name={clientName} color={brandColor} mode={mode} />
        </div>

        <ErrorNote>{error}</ErrorNote>
      </div>

      <div className="mt-6 flex gap-2.5">
        {onBack ? <BackBtn onClick={onBack} /> : null}
        <PrimaryBtn
          onClick={handleNext}
          disabled={!clientName.trim() || busy}
          className="flex-1"
        >
          {busy ? "Creating…" : "Create workspace →"}
        </PrimaryBtn>
      </div>
    </div>
  );
}

/* ── Screen 4: Done ──────────────────────────────────────── */

function DoneScreen({
  data,
  appUrl,
}: {
  data: { name: string; clientName: string; reviewToken: string };
  appUrl: string;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const firstName = data.name?.split(" ")[0] || "there";

  // The real token, not a generated slug — this link works the moment it is
  // shown, which is the point of ending the flow here.
  const reviewLink = `${appUrl}/review/${data.reviewToken}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(reviewLink);
    } catch {
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-7 pb-6 pt-10 text-center">
      <div className="mb-[22px] text-[44px]">🎉</div>
      <h2 className="mb-2.5 text-[26px] tracking-[-.02em]">
        You&rsquo;re all set, {firstName}!
      </h2>
      <p className="mb-7 max-w-[300px] text-sm leading-[1.65] text-muted">
        <strong className="text-ink">{data.clientName}</strong>&rsquo;s review
        page is live. Share the link and get your first approval today.
      </p>

      <div className="w-full max-w-[360px]">
        <div className="mb-3.5 flex items-center justify-between gap-2 rounded-[10px] bg-[#f4f2ec] px-3.5 py-2.5 text-left">
          <div className="min-w-0">
            <div className="mb-0.5 text-[10px] text-faint">Review link</div>
            <div className="truncate text-xs text-[#3d3d3a]">{reviewLink}</div>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 whitespace-nowrap rounded-lg border-hairline border-[#d3d1c7] px-3 py-[5px] text-xs transition-all"
            style={{
              background: copied ? "#EAF3DE" : "#fff",
              color: copied ? "#27500A" : "#888780",
            }}
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>

        <PrimaryBtn onClick={() => router.push("/dashboard")} className="mb-2">
          Go to my dashboard →
        </PrimaryBtn>
        <a
          href={reviewLink}
          target="_blank"
          rel="noreferrer"
          className="block w-full py-3 text-center text-sm text-muted transition-colors hover:text-ink"
        >
          Preview what they&rsquo;ll see
        </a>
      </div>
    </div>
  );
}

/* ── Flow ────────────────────────────────────────────────── */

type FlowData = {
  name: string;
  email: string;
  agencyName: string;
  clientCount: string | null;
  contentTypes: string[];
  clientName: string;
  reviewToken: string;
};

export function OnboardingFlow({
  appUrl,
  signedInName,
}: {
  appUrl: string;
  /** Set when the visitor already has an account but no client yet. */
  signedInName?: string | null;
}) {
  // Someone arriving already signed in has finished step one — usually by
  // confirming their email and coming back. Dropping them at the welcome
  // screen would walk them into a duplicate-account error.
  const [step, setStep] = useState(signedInName != null ? 3 : 0);
  const [data, setData] = useState<FlowData>({
    name: signedInName ?? "",
    email: "",
    agencyName: "",
    clientCount: null,
    contentTypes: [],
    clientName: "",
    reviewToken: "",
  });

  const merge = (incoming: Partial<FlowData>) =>
    setData((prev) => ({ ...prev, ...incoming }));

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      {step >= 1 && step <= 3 ? (
        <div className="flex justify-center pt-[22px]">
          <ProgressDots step={step - 1} total={3} />
        </div>
      ) : null}

      <div
        key={step}
        className="mx-auto flex w-full max-w-[480px] flex-1 flex-col"
        style={{ animation: "fadeUp .35s ease" }}
      >
        {step === 0 ? <WelcomeScreen onNext={() => setStep(1)} /> : null}

        {step === 1 ? (
          <AccountScreen
            initial={{ name: data.name, email: data.email }}
            onNext={(d) => {
              merge(d);
              setStep(2);
            }}
          />
        ) : null}

        {step === 2 ? (
          <AgencyScreen
            initial={{
              agencyName: data.agencyName,
              clientCount: data.clientCount,
              contentTypes: data.contentTypes,
            }}
            onNext={(d) => {
              merge(d);
              setStep(3);
            }}
          />
        ) : null}

        {step === 3 ? (
          <FirstClientScreen
            onNext={(d) => {
              merge(d);
              setStep(4);
            }}
            onBack={signedInName != null ? undefined : () => setStep(2)}
          />
        ) : null}

        {step === 4 ? <DoneScreen data={data} appUrl={appUrl} /> : null}
      </div>
    </div>
  );
}
