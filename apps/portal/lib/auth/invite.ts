import "server-only";

import { appBaseUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Sends Supabase's invitation email (supabase/templates/invite.html) to an address with no account,
 * creating the account; the membership or staff designation already recorded for the address is
 * attached by the database when the account appears. Called only after a checked database function
 * has accepted the grant and reported that the address needs an account, so the service role never
 * decides who may be invited.
 */
export async function sendInvitation(email: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appBaseUrl()}/auth/confirm`,
  });
  if (error && error.code !== "email_exists") {
    throw new Error(`invitation not sent: ${error.code ?? error.message}`);
  }
}
