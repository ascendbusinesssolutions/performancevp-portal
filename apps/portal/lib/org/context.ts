import "server-only";

import { cache } from "react";

import { redirect } from "next/navigation";

import { requireAccess } from "@/lib/auth/access";
import type { SubscriptionState } from "@/lib/auth/route";
import { createClient } from "@/lib/supabase/server";

/**
 * The organisation a setup screen is about, for the people who manage it: its account owner and
 * administrators, and PerformanceVP staff with a support session open on it. Anyone else is sent
 * home. This only decides what to show; the database decides every read and write, and refuses
 * writes when the organisation is not writable (grace or suspension).
 */
export interface OrgContext {
  orgId: string;
  name: string;
  state: SubscriptionState;
  /** Whether the subscription allows changes (PORTAL_BUILD_PLAN.md 11: pending or active). */
  writable: boolean;
  /** A PerformanceVP staff member working under a support session. */
  asStaff: boolean;
  /** When the staff member's session ends. */
  sessionEndsAt: string | null;
}

const STATES: readonly SubscriptionState[] = [
  "pending",
  "active",
  "grace",
  "suspended",
  "cancelled",
];

export const requireOrgManager = cache(async (orgId: string): Promise<OrgContext> => {
  const access = await requireAccess();
  const membership = access.memberships.find(
    (m) => m.organisationId === orgId && (m.role === "account_owner" || m.role === "administrator"),
  );
  const session = access.openSupportSessions.find((s) => s.organisationId === orgId);
  if (!membership && !session) redirect("/");

  if (membership) {
    return {
      orgId,
      name: membership.organisationName,
      state: membership.state,
      writable: membership.state === "pending" || membership.state === "active",
      asStaff: false,
      sessionEndsAt: null,
    };
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc("staff_organisations");
  const row = (data ?? []).find((o) => o.organisation_id === orgId);
  const state = STATES.find((s) => s === row?.state) ?? "suspended";
  return {
    orgId,
    name: row?.name ?? session!.organisationName,
    state,
    writable: state === "pending" || state === "active",
    asStaff: true,
    sessionEndsAt: session!.expiresAt,
  };
});
