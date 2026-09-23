import "server-only";

import { createClient } from "@supabase/supabase-js";

import { supabaseUrl } from "@/lib/env";

import type { Database } from "./database.types";

/**
 * A Supabase client with the secret key: the service role. It is for the few server paths that
 * act without a signed-in session or on a person's behalf (the upload route, the daily job, the
 * auth admin API for invitations). It bypasses row level security, so every use names the
 * person it acts for and calls a checked database function rather than reading tables. The
 * `server-only` import makes a build fail if this module is ever reachable from the browser.
 */
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("SUPABASE_SECRET_KEY is not set. See apps/portal/.env.example.");
  }
  return createClient<Database>(supabaseUrl(), secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
