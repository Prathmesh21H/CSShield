import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./types";

/**
 * Server-side Supabase client for use inside Route Handlers and
 * Server Components. Reads the session from cookies, so auth-aware
 * reads/writes respect Row Level Security automatically.
 *
 * For privileged writes (ingestion jobs writing findings on behalf of
 * the system, not a specific user), use createServiceRoleClient()
 * instead — never expose the service role key to the browser.
 */
export async function createClient() {
  const cookieStore = await cookies();

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
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component with no write access to cookies —
            // safe to ignore as long as middleware refreshes the session.
          }
        },
      },
    }
  );
}

/**
 * Privileged client using the service role key. Only ever import this
 * inside a Route Handler (server-only code) — never in a Server Component
 * that could be inlined into a client bundle, and never in client code.
 */
export function createServiceRoleClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}