/**
 * Where a signed-in person goes next. Pure, so it is unit-tested; the database is still the
 * authority on what each role may do (the helpers in `private` refuse a role that lacks the
 * required assurance), and this only keeps people from reaching pages that would show them nothing.
 *
 * The rules (Milestone 3 plan, decision 1 and Section 9):
 *   - an email-code session counts only for the manager role; anyone else is sent to sign in with
 *     their password;
 *   - the Owner, support staff, account owners and administrators must complete TOTP (aal2), and
 *     so must anyone who has enrolled a factor; they enrol first if they have none;
 *   - a signed-in person with no membership and no staff designation waits for access.
 */

export type Role =
  "account_owner" | "administrator" | "executive_viewer" | "unit_viewer" | "manager_respondent";

export type SubscriptionState = "pending" | "active" | "grace" | "suspended" | "cancelled";

export interface Membership {
  organisationId: string;
  organisationName: string;
  role: Role;
  state: SubscriptionState;
}

export interface OpenSupportSession {
  sessionId: string;
  organisationId: string;
  organisationName: string;
  expiresAt: string;
}

/** What `public.my_access()` returns, parsed. */
export interface Access {
  userId: string;
  email: string;
  fullName: string | null;
  sessionLive: boolean;
  aal: string | null;
  passwordSession: boolean;
  hasVerifiedFactor: boolean;
  isOwner: boolean;
  isSupportStaff: boolean;
  mfaRequired: boolean;
  memberships: Membership[];
  openSupportSessions: OpenSupportSession[];
}

export type Destination =
  "portal" | "login" | "password_required" | "enrol" | "challenge" | "pending";

export const DESTINATION_PATHS: Record<Exclude<Destination, "portal">, string> = {
  login: "/login",
  password_required: "/login?notice=password-required",
  enrol: "/mfa/enrol",
  challenge: "/mfa/challenge",
  pending: "/access-pending",
};

export function destinationFor(access: Access | null): Destination {
  if (access === null || !access.sessionLive) return "login";
  const staff = access.isOwner || access.isSupportStaff;
  const holdsManagerRole = access.memberships.some((m) => m.role === "manager_respondent");

  if (!access.passwordSession) {
    if (!holdsManagerRole) return "password_required";
    if (access.hasVerifiedFactor && access.aal !== "aal2") return "challenge";
    return "portal";
  }
  if ((access.mfaRequired || access.hasVerifiedFactor) && access.aal !== "aal2") {
    return access.hasVerifiedFactor ? "challenge" : "enrol";
  }
  if (!staff && access.memberships.length === 0) return "pending";
  return "portal";
}

const ROLES: readonly Role[] = [
  "account_owner",
  "administrator",
  "executive_viewer",
  "unit_viewer",
  "manager_respondent",
];
const STATES: readonly SubscriptionState[] = [
  "pending",
  "active",
  "grace",
  "suspended",
  "cancelled",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  if (typeof value !== "string") throw new Error("my_access: expected a string");
  return value;
}

function flag(value: unknown): boolean {
  return value === true;
}

/** Parses the JSON `public.my_access()` returns; anything malformed reads as no access. */
export function parseAccess(value: unknown): Access | null {
  if (!isRecord(value)) return null;
  try {
    const memberships = Array.isArray(value.memberships) ? value.memberships : [];
    const sessions = Array.isArray(value.open_support_sessions) ? value.open_support_sessions : [];
    return {
      userId: text(value.user_id),
      email: text(value.email),
      fullName: typeof value.full_name === "string" ? value.full_name : null,
      sessionLive: flag(value.session_live),
      aal: typeof value.aal === "string" ? value.aal : null,
      passwordSession: flag(value.password_session),
      hasVerifiedFactor: flag(value.has_verified_factor),
      isOwner: flag(value.is_owner),
      isSupportStaff: flag(value.is_support_staff),
      mfaRequired: flag(value.mfa_required),
      memberships: memberships.filter(isRecord).map((m) => {
        const role = text(m.role);
        const state = text(m.state);
        if (!ROLES.some((r) => r === role) || !STATES.some((s) => s === state)) {
          throw new Error("my_access: unexpected role or state");
        }
        return {
          organisationId: text(m.organisation_id),
          organisationName: text(m.organisation_name),
          role: role as Role,
          state: state as SubscriptionState,
        };
      }),
      openSupportSessions: sessions.filter(isRecord).map((s) => ({
        sessionId: text(s.session_id),
        organisationId: text(s.organisation_id),
        organisationName: text(s.organisation_name),
        expiresAt: text(s.expires_at),
      })),
    };
  } catch {
    return null;
  }
}
