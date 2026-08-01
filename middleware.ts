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
 */
const PROTECTED_PREFIXES = ["/dashboard"];

const PROTECTED_API = [
  "/api/upload",
  "/api/version",
  "/api/request-asset",
  "/api/stripe/checkout",
  "/api/stripe/portal",
];
// Note: /api/stripe/webhook is deliberately absent. Stripe calls it with no
// session; it authenticates itself by signature instead.

export async function middleware(request: NextRequest) {
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
