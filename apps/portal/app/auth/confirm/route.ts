import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// The links in the invitation and password emails land here (supabase/templates). The token hash
// is single-use and carries no personal data. A valid link opens a session and goes on to set a
// password; that session is not a password session, so it carries no role until the person signs
// in with the password they set.
const NEXT: Partial<Record<EmailOtpType, string>> = {
  invite: "/auth/set-password",
  recovery: "/auth/set-password",
  email: "/",
};

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const next = type ? NEXT[type] : undefined;

  if (tokenHash && type && next) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }
  // An expired or used link offers a new one (PORTAL_BUILD_PLAN.md Milestone 4).
  return NextResponse.redirect(new URL("/auth/new-link?notice=expired", request.url));
}
