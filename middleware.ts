import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session cookie on every request and gates the
 * creator-only areas of the app.
 *
 * `/review/*` and its public API routes are deliberately excluded — the
 * whole product promise is that a client can review work without an account.
 *
 * `/onboarding` is also public: its first step is creating the account, so
 * requiring a session to reach it would lock every new user out of signup.
 *
 * So is the whole password-reset path — `/forgot-password`, `/auth/callback`
 * and `/reset-password`. Someone who cannot sign in is exactly who needs
 * them, so gating any of the three would lock out the only people they are
 * for. Only add a prefix below that a signed-out user should never reach.
 */
/*
 * `/settings` is listed separately because it lives in the (dashboard)
 * route group, and a route group adds no path segment — the URL is
 * /settings, not /dashboard/settings, so the prefix above does not cover it.
 */
const PROTECTED_PREFIXES = ["/dashboard", "/settings"];

const PROTECTED_API = [
  "/api/upload",
  "/api/version",
  "/api/request-asset",
  "/api/profile-image",
  "/api/stripe/checkout",
  "/api/stripe/portal",
];
// Note: /api/stripe/webhook is deliberately absent. Stripe calls it with no
// session; it authenticates itself by signature instead.

/**
 * Paths with no session to refresh and nothing to gate. Returning before the
 * Supabase client is constructed keeps the marketing page independent of
 * Supabase configuration entirely — otherwise a missing env var takes down
 * the homepage along with the app.
 */
const PUBLIC_PATHS = new Set(["/"]);

export async function middleware(request: NextRequest) {
  if (PUBLIC_PATHS.has(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not remove: this refreshes an expired token and, because getUser()
  // revalidates against the auth server, it is what makes the session
  // trustworthy for every downstream Server Component.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && PROTECTED_API.some((p) => pathname.startsWith(p))) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!user && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // A signed-in user has no business on the sign-in screens.
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files. The review route is
     * matched too — it does not require auth, but running the middleware
     * keeps a signed-in creator's session fresh while they preview a link.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
