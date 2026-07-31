import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Reads and refreshes the session from cookies.
 *
 * Always authenticate with `getUser()` — never `getSession()`. getSession
 * returns whatever is in the cookie without contacting the auth server, so
 * on the server it is unverified and spoofable.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Middleware refreshes the session, so this is safe to ignore.
          }
        },
      },
    },
  );
}

/** The signed-in user, or null. Verified against the auth server. */
export async function getUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * The signed-in user, or throw. For creator-only API routes, which the
 * middleware already guards — this is the second lock on the same door.
 */
export async function requireUser() {
  const user = await getUser();
  if (!user) throw new UnauthorisedError();
  return user;
}

export class UnauthorisedError extends Error {
  constructor() {
    super("Not signed in");
    this.name = "UnauthorisedError";
  }
}
