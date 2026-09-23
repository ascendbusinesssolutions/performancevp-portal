import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabasePublishableKey, supabaseUrl } from "@/lib/env";

import type { Database } from "./database.types";
import { retryingFetch } from "./fetch";

/**
 * A Supabase client acting as the signed-in person, for server components, server actions and
 * route handlers. Every query it makes runs under row level security with that person's session;
 * the database, not this application, decides what they may see and do. Requests go through
 * retryingFetch, so a token used in the second it was issued is not taken for a missing session.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(supabaseUrl(), supabasePublishableKey(), {
    global: { fetch: retryingFetch() },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // A server component cannot set cookies; the proxy refreshes the session instead.
        }
      },
    },
  });
}
