import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * PUBLIC. Turns an emailed link into a session.
 *
 * This runs in a Route Handler, and that is the whole point. The PKCE code
 * verifier is written to a cookie when the reset is requested, and the
 * session that comes back has to be written to cookies too. A Route Handler
 * can do both: Server Components can read cookies but not set them, and
 * doing the exchange in the browser means racing supabase-js, which
 * exchanges the code itself on init and deletes the verifier as it goes —
 * the second attempt then fails with "code verifier not found in storage".
 *
 * Both link shapes are accepted, since which one arrives depends on the
 * project's email template:
 *
 *   ?code=…                PKCE, the @supabase/ssr default.
 *   ?token_hash=…&type=…   OTP, when the template uses {{ .TokenHash }}.
 *                          Carries no browser state, so it survives being
 *                          opened on a different device.
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

  const fail = (reason: string) => {
    const url = new URL(`${origin}${next}`);
    url.searchParams.set("error", "link_invalid");
    url.searchParams.set("error_description", reason);
    return NextResponse.redirect(url);
  };

  // Supabase can report the failure itself before we ever see a token.
  const reported = searchParams.get("error_description");
  if (reported) return fail(reported);

  const supabase = createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail(error.message);
    return NextResponse.redirect(`${origin}${next}`);
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (error) return fail(error.message);
    return NextResponse.redirect(`${origin}${next}`);
  }

  return fail("That link was missing its verification token.");
}
