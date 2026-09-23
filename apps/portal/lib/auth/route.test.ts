import { describe, expect, it } from "vitest";

import { type Access, destinationFor, parseAccess } from "./route";

function access(overrides: Partial<Access> = {}): Access {
  return {
    userId: "u",
    email: "person@example.test",
    fullName: null,
    sessionLive: true,
    aal: "aal1",
    passwordSession: true,
    hasVerifiedFactor: false,
    isOwner: false,
    isSupportStaff: false,
    mfaRequired: false,
    memberships: [
      { organisationId: "o", organisationName: "Org", role: "executive_viewer", state: "active" },
    ],
    openSupportSessions: [],
    ...overrides,
  };
}

const manager = {
  organisationId: "o",
  organisationName: "Org",
  role: "manager_respondent",
  state: "active",
} as const;
const administrator = {
  organisationId: "o",
  organisationName: "Org",
  role: "administrator",
  state: "active",
} as const;

describe("destinationFor", () => {
  it("sends anyone without a live session to sign in", () => {
    expect(destinationFor(null)).toBe("login");
    expect(destinationFor(access({ sessionLive: false }))).toBe("login");
  });

  it("admits a viewer with no factor on a password alone", () => {
    expect(destinationFor(access())).toBe("portal");
  });

  it("sends a role that needs TOTP to enrol, then to the challenge", () => {
    expect(destinationFor(access({ mfaRequired: true, memberships: [administrator] }))).toBe(
      "enrol",
    );
    expect(
      destinationFor(
        access({ mfaRequired: true, hasVerifiedFactor: true, memberships: [administrator] }),
      ),
    ).toBe("challenge");
    expect(
      destinationFor(
        access({
          mfaRequired: true,
          hasVerifiedFactor: true,
          aal: "aal2",
          memberships: [administrator],
        }),
      ),
    ).toBe("portal");
  });

  it("requires TOTP of a viewer who has enrolled one", () => {
    expect(destinationFor(access({ hasVerifiedFactor: true }))).toBe("challenge");
  });

  it("treats staff as needing TOTP", () => {
    expect(destinationFor(access({ isOwner: true, mfaRequired: true, memberships: [] }))).toBe(
      "enrol",
    );
    expect(
      destinationFor(
        access({
          isSupportStaff: true,
          mfaRequired: true,
          aal: "aal2",
          hasVerifiedFactor: true,
          memberships: [],
        }),
      ),
    ).toBe("portal");
  });

  it("lets an email-code session through only for the manager role", () => {
    expect(destinationFor(access({ passwordSession: false, memberships: [manager] }))).toBe(
      "portal",
    );
    expect(destinationFor(access({ passwordSession: false }))).toBe("password_required");
    expect(
      destinationFor(
        access({ passwordSession: false, mfaRequired: true, memberships: [administrator] }),
      ),
    ).toBe("password_required");
  });

  it("asks a manager who has enrolled TOTP to complete it", () => {
    expect(
      destinationFor(
        access({ passwordSession: false, hasVerifiedFactor: true, memberships: [manager] }),
      ),
    ).toBe("challenge");
  });

  it("holds a person with no membership and no staff designation", () => {
    expect(destinationFor(access({ memberships: [] }))).toBe("pending");
  });
});

describe("parseAccess", () => {
  const raw = {
    user_id: "u",
    email: "a@b.test",
    full_name: "A Person",
    session_live: true,
    aal: "aal2",
    password_session: true,
    has_verified_factor: true,
    is_owner: false,
    is_support_staff: false,
    mfa_required: true,
    memberships: [
      { organisation_id: "o", organisation_name: "Org", role: "administrator", state: "grace" },
    ],
    open_support_sessions: [],
  };

  it("parses what my_access returns", () => {
    expect(parseAccess(raw)).toMatchObject({
      userId: "u",
      aal: "aal2",
      memberships: [{ organisationId: "o", role: "administrator", state: "grace" }],
    });
  });

  it("reads anything malformed as no access", () => {
    expect(parseAccess(null)).toBeNull();
    expect(parseAccess({ ...raw, user_id: 7 })).toBeNull();
    expect(
      parseAccess({ ...raw, memberships: [{ ...raw.memberships[0], role: "superuser" }] }),
    ).toBeNull();
  });
});
