import "server-only";

import { createClient } from "@supabase/supabase-js";

import { appBaseUrl, supabasePublishableKey, supabaseUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * "Send me a new link" (PORTAL_BUILD_PLAN.md Milestone 4; Milestone 4 plan, Section 8). The
 * database decides which link, if any, an address should receive (public.new_link_kind, callable by
 * the service role only): the invitation again where it was never taken up, a password link where
 * a confirmed account holds a role that signs in with a password, and nothing for an unknown
 * address, a manager, or inside the per-account cooldown. The person asking is told the same thing
 * in every case, and this runs after the response is sent, so neither the words nor the timing
 * reveal who holds an account. The password link goes through Supabase's own endpoint, so the auth
 * email rate limit applies to it as it does to the reset page.
 */
export async function sendNewLink(email: string): Promise<void> {
  const admin = createAdminClient();
  const { data: kind, error } = await admin.rpc("new_link_kind", { p_email: email });
  if (error) {
    console.error("new link: the decision failed", error.code);
    return;
  }
  const redirectTo = `${appBaseUrl()}/auth/confirm`;
  if (kind === "invite") {
    const { error: sendError } = await admin.auth.admin.inviteUserByEmail(email.trim(), {
      redirectTo,
    });
    if (sendError) console.error("new link: the invitation was not sent", sendError.code);
  } else if (kind === "recovery") {
    const anonymous = createClient(supabaseUrl(), supabasePublishableKey(), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { error: sendError } = await anonymous.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });
    if (sendError) console.error("new link: the password link was not sent", sendError.code);
  }
}
