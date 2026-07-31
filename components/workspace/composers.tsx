"use client";

import { useRef, useState } from "react";
import { FileInput } from "./file-input";
import { useSubmit } from "./use-submit";
import {
  FieldError,
  Label,
  PrimaryButton,
  TextArea,
  TextInput,
} from "@/components/ui/field";

/* ── Shared shell ────────────────────────────────────────── */

/**
 * A composer is open or closed, and the toggle is a real button that is
 * always on screen. Nothing here appears on hover.
 */
function Composer({
  title,
  cta,
  accent,
  children,
  onSubmit,
  busy,
  error,
  submitLabel,
  formRef,
}: {
  title: string;
  cta: string;
  accent: string;
  children: React.ReactNode;
  onSubmit: (form: FormData) => Promise<boolean>;
  busy: boolean;
  error: string | null;
  submitLabel: string;
  formRef: React.RefObject<HTMLFormElement>;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hover-emphasis w-full rounded-card border-hairline border-dashed border-line bg-white px-5 py-4 text-left text-sm font-medium text-ink"
      >
        {cta}
      </button>
    );
  }

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="font-serif text-lg">{title}</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-soft px-2 py-1 text-sm text-muted"
        >
          Cancel
        </button>
      </div>

      <form
        ref={formRef}
        className="flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const ok = await onSubmit(form);
          if (ok) {
            formRef.current?.reset();
            setOpen(false);
          }
        }}
      >
        {children}
        <FieldError>{error}</FieldError>
        <div>
          <PrimaryButton type="submit" accent={accent} disabled={busy}>
            {busy ? "Working…" : submitLabel}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}

/* ── Social post ─────────────────────────────────────────── */

export function SocialComposer({
  clientId,
  accent,
}: {
  clientId: string;
  accent: string;
}) {
  const { busy, error, run } = useSubmit();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Composer
      title="New post"
      cta="+  Add a post"
      accent={accent}
      busy={busy}
      error={error}
      submitLabel="Add post"
      formRef={formRef}
      onSubmit={(form) => {
        form.set("clientId", clientId);
        form.set("kind", "post");
        return run(() =>
          fetch("/api/upload", { method: "POST", body: form }),
        );
      }}
    >
      <FileInput required label="Choose the post image" />

      <label className="flex flex-col gap-2">
        <Label>Caption</Label>
        <TextArea
          name="caption"
          rows={4}
          placeholder="The caption your client will see and approve."
        />
      </label>

      <label className="flex flex-col gap-2">
        <Label>Scheduled for</Label>
        <TextInput
          name="scheduledFor"
          placeholder="Tue 12 Aug, or just “week 2”"
        />
      </label>
    </Composer>
  );
}

/* ── Deliverable ─────────────────────────────────────────── */

export function DeliverableComposer({
  clientId,
  accent,
}: {
  clientId: string;
  accent: string;
}) {
  const { busy, error, run } = useSubmit();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Composer
      title="New deliverable"
      cta="+  Add a deliverable"
      accent={accent}
      busy={busy}
      error={error}
      submitLabel="Add deliverable"
      formRef={formRef}
      onSubmit={(form) => {
        form.set("clientId", clientId);
        form.set("kind", "deliverable");
        return run(() =>
          fetch("/api/upload", { method: "POST", body: form }),
        );
      }}
    >
      <label className="flex flex-col gap-2">
        <Label>Name</Label>
        <TextInput
          name="title"
          required
          placeholder="Logo concepts, Homepage layout…"
        />
      </label>

      <FileInput required label="Choose the v1 artwork" />

      <label className="flex flex-col gap-2">
        <Label>Note for this version</Label>
        <TextArea
          name="note"
          rows={3}
          placeholder="What you'd like them to look at."
        />
      </label>
    </Composer>
  );
}

/* ── Asset request ───────────────────────────────────────── */

export function AssetRequestComposer({
  clientId,
  accent,
}: {
  clientId: string;
  accent: string;
}) {
  const { busy, error, run } = useSubmit();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Composer
      title="Request an asset"
      cta="+  Request something from them"
      accent={accent}
      busy={busy}
      error={error}
      submitLabel="Send request"
      formRef={formRef}
      onSubmit={(form) =>
        run(() =>
          fetch("/api/request-asset", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientId,
              title: form.get("title"),
              message: form.get("message"),
            }),
          }),
        )
      }
    >
      <label className="flex flex-col gap-2">
        <Label>What do you need?</Label>
        <TextInput
          name="title"
          required
          placeholder="Team headshots, brand fonts, About copy…"
        />
      </label>

      <label className="flex flex-col gap-2">
        <Label>Message</Label>
        <TextArea
          name="message"
          rows={3}
          placeholder="Anything they need to know — formats, sizes, deadline."
        />
      </label>
    </Composer>
  );
}

/* ── Push a new version ──────────────────────────────────── */

/**
 * Lives inside a deliverable card. The trigger is a visible button rather
 * than an icon that appears on hover, because this is the single most-used
 * action in design mode.
 */
export function VersionPusher({
  postId,
  nextVersion,
  accent,
}: {
  postId: string;
  nextVersion: number;
  accent: string;
}) {
  const { busy, error, run } = useSubmit();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hover-emphasis rounded-soft border-hairline border-line bg-white px-4 py-2 text-sm font-medium text-ink"
      >
        Push v{nextVersion}
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      className="mt-3 flex w-full flex-col gap-3 rounded-soft bg-[#faf9f6] p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        form.set("postId", postId);
        const ok = await run(() =>
          fetch("/api/version", { method: "POST", body: form }),
        );
        if (ok) {
          formRef.current?.reset();
          setOpen(false);
        }
      }}
    >
      <p className="text-sm text-muted">Pushing version {nextVersion}</p>

      <FileInput required label={`Choose the v${nextVersion} artwork`} />

      <TextArea
        name="note"
        rows={2}
        placeholder="What changed in this version?"
      />

      <FieldError>{error}</FieldError>

      <div className="flex gap-2">
        <PrimaryButton type="submit" accent={accent} disabled={busy}>
          {busy ? "Pushing…" : `Push v${nextVersion}`}
        </PrimaryButton>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-soft px-4 py-3 text-sm text-muted"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
