import "server-only";

import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Client, NotificationKind } from "@/types/database";

/**
 * Transactional email.
 *
 * Notifications are a side effect of a client action, never its point: if
 * Resend is down or unconfigured, the approval or comment must still land.
 * Every function here therefore swallows its errors and logs, and callers
 * are expected not to await them on the critical path.
 */

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/* ══ Template ══════════════════════════════════════════════ */

function shell(opts: {
  accent: string;
  eyebrow: string;
  heading: string;
  body?: string;
  quote?: string | null;
  ctaLabel: string;
  ctaHref: string;
}) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:32px 16px;background:#faf9f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#2c2c2a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;">
      <tr><td>
        <p style="margin:0 0 24px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#b4b2a9;">Signoff</p>

        <div style="background:#ffffff;border:1px solid #e8e6de;border-radius:16px;padding:28px;">
          <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:${opts.accent};">${escapeHtml(opts.eyebrow)}</p>
          <h1 style="margin:0;font-size:22px;line-height:1.3;font-weight:500;color:#2c2c2a;">${escapeHtml(opts.heading)}</h1>
          ${
            opts.body
              ? `<p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:#888780;">${escapeHtml(opts.body)}</p>`
              : ""
          }
          ${
            opts.quote
              ? `<blockquote style="margin:20px 0 0;padding:14px 16px;background:#f6f4ee;border-left:2px solid ${opts.accent};border-radius:8px;font-size:15px;line-height:1.6;color:#2c2c2a;">${escapeHtml(opts.quote)}</blockquote>`
              : ""
          }
          <p style="margin:24px 0 0;">
            <a href="${opts.ctaHref}" style="display:inline-block;background:#2c2c2a;color:#ffffff;text-decoration:none;font-size:14px;padding:12px 20px;border-radius:14px;">${escapeHtml(opts.ctaLabel)}</a>
          </p>
        </div>

        <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#b4b2a9;">
          You're getting this because a client reviewed work you shared through Signoff.
        </p>
      </td></tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ══ Delivery ══════════════════════════════════════════════ */

/** The creator's email address, looked up from the client's owner. */
async function creatorEmail(client: Client): Promise<string | null> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase.auth.admin.getUserById(client.user_id);
    return data.user?.email ?? null;
  } catch (error) {
    console.error("[signoff] could not resolve creator email", error);
    return null;
  }
}

/**
 * Whether the creator still wants this kind of email.
 *
 * Defaults to sending: a profile row that is missing, or a lookup that
 * fails, should not silently swallow the one notification the product
 * exists to deliver.
 *
 * All three columns are selected with a literal string so postgrest can
 * type the result — a column name interpolated at runtime infers as an
 * error type instead.
 */
async function wants(client: Client, kind: NotificationKind): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("profiles")
      .select("notify_approvals, notify_comments, notify_assets")
      .eq("user_id", client.user_id)
      .maybeSingle();

    if (!data) return true;

    const value =
      kind === "approvals"
        ? data.notify_approvals
        : kind === "comments"
          ? data.notify_comments
          : data.notify_assets;

    return value !== false;
  } catch (error) {
    console.error("[signoff] could not read notification preference", error);
    return true;
  }
}

async function send(
  client: Client,
  kind: NotificationKind,
  subject: string,
  html: string,
) {
  if (!resend) {
    console.warn("[signoff] RESEND_API_KEY not set — skipping notification");
    return;
  }

  if (!(await wants(client, kind))) return;

  const to = await creatorEmail(client);
  if (!to) return;

  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (error) {
    console.error("[signoff] notification failed to send", error);
  }
}

const accentFor = (client: Client) =>
  client.brand_color || (client.mode === "design" ? "#534AB7" : "#C8522A");

const workspaceUrl = (client: Client) =>
  `${APP_URL}/dashboard/clients/${client.id}`;

/* ══ Notifications ═════════════════════════════════════════ */

export async function notifyApproval(
  client: Client,
  itemLabel: string,
  approved: boolean,
) {
  const subject = approved
    ? `${client.name} approved ${itemLabel}`
    : `${client.name} asked for changes on ${itemLabel}`;

  await send(
    client,
    "approvals",
    subject,
    shell({
      accent: approved ? "#27500A" : "#712B13",
      eyebrow: approved ? "Approved" : "Changes requested",
      heading: subject,
      body: approved
        ? "That one's signed off — nothing further needed from you."
        : "Have a look at their note and push an update when you're ready.",
      ctaLabel: "Open the workspace",
      ctaHref: workspaceUrl(client),
    }),
  );
}

export async function notifyComment(
  client: Client,
  itemLabel: string,
  body: string,
  author: string,
) {
  await send(
    client,
    "comments",
    `${author} commented on ${itemLabel}`,
    shell({
      accent: accentFor(client),
      eyebrow: "New comment",
      heading: `${author} left a note on ${itemLabel}`,
      quote: body,
      ctaLabel: "Open the workspace",
      ctaHref: workspaceUrl(client),
    }),
  );
}

export async function notifyClientUpload(
  client: Client,
  itemLabel: string,
  fileName: string,
) {
  await send(
    client,
    "assets",
    `${client.name} sent you a file for ${itemLabel}`,
    shell({
      accent: accentFor(client),
      eyebrow: "Asset received",
      heading: `${client.name} uploaded ${fileName}`,
      body: `This was in response to your request: ${itemLabel}.`,
      ctaLabel: "Open the workspace",
      ctaHref: workspaceUrl(client),
    }),
  );
}
