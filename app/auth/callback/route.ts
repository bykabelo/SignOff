import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * PUBLIC. Where Supabase sends the user after they click an emailed link.
 *
 * Two link shapes are accepted, because which one arrives depends on how the
 * project's email templates are written:
 *
 *  - `?code=...`        the PKCE flow, which @supabase/ssr uses by default.
 *                       Requires the code_verifier cookie set when the reset
 *                       was requested, so it only works in the same browser.
 *  - `?token_hash=&type=` the OTP flow, used when the email template is
 *                       switched to {{ .TokenHash }}. Carries no browser
 *                       state, so it also works when the mail is opened on
 *                       a different device.
 *
 * Supporting both means the default template works out of the box and the
 * cross-device upgrade is a template edit rather than a code change.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Only ever redirect within this app; an absolute URL here would turn a
  // password-reset link into an open redirect.
  const requested = searchParams.get("next") ?? "/dashboard";
  const next =
    requested.startsWith("/") && !requested.startsWith("//")
      ? requested
      : "/dashboard";

  const supabase = createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  // Expired, already used, or opened in a browser that never held the
  // verifier. The destination decides how to say so.
  return NextResponse.redirect(`${origin}${next}?error=link_invalid`);
}
