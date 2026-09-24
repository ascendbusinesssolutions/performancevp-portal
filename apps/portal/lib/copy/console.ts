/**
 * Copy for the PerformanceVP console and the account owner's access page (PORTAL_COPY_SPEC.md
 * Section 1, fixed strings, one entry per string; A2 and A3 follow Section 5). Drafted for
 * Michael's review with the copy module before Milestone 6.
 */
export const consoleCopy = {
  "nav.console": "PerformanceVP console",
  "nav.access": "Access and people",
  "nav.home": "Your access",

  "pvp.title": "PerformanceVP console",
  "pvp.organisations": "Organisations",
  "pvp.col.name": "Organisation",
  "pvp.col.state": "State",
  "pvp.col.band": "Band",
  "pvp.col.term": "Term ends",
  "pvp.col.session": "Your session",
  "pvp.session.none": "None open",
  "pvp.session.open": "Open",
  "pvp.session.reason": "Reason for opening a session",
  "pvp.session.openButton": "Open a session",
  "pvp.session.closeButton": "Close the session",
  "pvp.session.note":
    "A session lasts two hours. The client sees it, with your name, your reason and everything you do in it.",
  "pvp.session.view": "Open the organisation",

  "pvp.provision.title": "Provision an organisation",
  "pvp.provision.name": "Organisation name",
  "pvp.provision.band": "Employee band",
  "pvp.provision.start": "Term starts",
  "pvp.provision.end": "Term ends",
  "pvp.provision.agreement": "Agreement signed",
  "pvp.provision.invoice": "Invoice reference",
  "pvp.provision.owner": "Account owner's work email",
  "pvp.provision.submit": "Provision",
  "pvp.provision.done":
    "Provisioned. The account owner has access; if they have no account yet, they receive an email to set one up.",
  "pvp.provision.noBands":
    "No employee bands are defined yet. Bands are set by migration once they are settled.",

  "pvp.staff.title": "Support staff",
  "pvp.staff.email": "Work email",
  "pvp.staff.designate": "Designate as support staff",
  "pvp.staff.remove": "Remove",
  "pvp.staff.done": "Designated. A new person receives an email to set up their account.",
  "pvp.staff.none": "No support staff are designated.",

  "access.title": "Access and people",
  "access.subscription": "Subscription",
  "access.band": "Employee band",
  "access.term": "Term",
  "access.state": "State",
  // PORTAL_COPY_SPEC.md A3.
  "access.grace":
    "The subscription has ended. Read-only until the grace period closes. Campaigns cannot be launched and the directory cannot be changed.",
  "access.suspended": "Suspended. Data is retained until deleted.",

  "access.contribution.title": "Research dataset",
  "access.contribution.on":
    "Unit-level results from this organisation contribute, without any individual data, to PerformanceVP's research dataset.",
  "access.contribution.off":
    "This organisation's results are kept out of PerformanceVP's research dataset.",
  "access.contribution.optOut": "Opt out",
  "access.contribution.optIn": "Contribute again",

  "access.people.title": "People with access",
  "access.people.col.person": "Person",
  "access.people.col.role": "Role",
  "access.people.col.units": "Units",
  "access.people.allUnits": "All units",
  "access.people.revoke": "Revoke",
  "access.people.setUnits": "Save units",
  "access.people.reset": "Reset authenticator",
  "access.people.resetCode": "Your authenticator code",
  "access.people.resetNote":
    "Resetting removes their authenticator and signs them out; they set one up again at next sign-in. It needs a fresh code from yours.",
  "access.people.resetDone": "Authenticator reset. They set up a new one at next sign-in.",
  "access.people.pending": "Invited, no account yet",

  "access.invite.title": "Give someone access",
  "access.invite.email": "Work email",
  "access.invite.role": "Role",
  "access.invite.units": "Units they can see",
  "access.invite.submit": "Give access",
  "access.invite.done":
    "Access granted. If this person does not have an account yet, they receive an email to set one up.",

  "access.sessions.title": "PerformanceVP support sessions",
  "access.sessions.none": "PerformanceVP has not opened a session on this organisation.",
  "access.sessions.note":
    "PerformanceVP staff reach your data only through a session like these. Each is listed here with everything done in it.",
  "access.sessions.open": "open now",
  "access.sessions.nothing": "Nothing changed in this session.",
  // PORTAL_COPY_SPEC.md A2.
  "access.sessions.line": "{staff}, {start} to {end}, {reason}",
  "access.termRange": "{start} to {end}",
} as const;

export type ConsoleCopyKey = keyof typeof consoleCopy;
