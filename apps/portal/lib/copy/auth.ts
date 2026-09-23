/**
 * Copy for signing in, second factors and access (PORTAL_COPY_SPEC.md Section 1: fixed strings,
 * one entry per string, keyed). M2 is the specification's own wording; the rest is drafted for
 * Michael's review with the copy module before Milestone 6.
 */
export const authCopy = {
  "brand.eyebrow": "PerformanceVP",

  "login.title": "Sign in",
  "login.email": "Work email",
  "login.password": "Password",
  "login.submit": "Sign in",
  "login.error": "That email and password do not match an account.",
  "login.toCode": "Rating your team? Sign in with a code",
  "login.toReset": "Set or reset your password",
  "login.notice.passwordRequired":
    "Your role needs a password. Sign in with your password instead of a code.",
  "login.notice.passwordSet": "Password saved. Sign in with it now.",
  "login.notice.linkExpired":
    "That link has expired or has already been used. Ask for a new one below.",
  "login.notice.signedOut": "You have signed out.",

  "code.title": "Sign in with a code",
  "code.intro": "For managers rating their team. We send a six-digit code to your work email.",
  "code.email": "Work email",
  "code.send": "Send code",
  // PORTAL_COPY_SPEC.md M2: the same response whether or not the address has an account.
  "code.sent": "If that address is on a rating list, a code is on its way. It lasts 10 minutes.",
  "code.code": "Code",
  "code.submit": "Sign in",
  "code.error": "That code did not work. Codes last 10 minutes and work once.",
  "code.again": "Send a new code",
  "code.toPassword": "Sign in with a password instead",

  "reset.title": "Set or reset your password",
  "reset.intro":
    "Enter your work email. If it belongs to an account, we send a link to set a new password.",
  "reset.email": "Work email",
  "reset.submit": "Send link",
  "reset.sent": "If that address belongs to an account, a link is on its way. It lasts 10 minutes.",
  "reset.toLogin": "Back to sign in",

  "setPassword.title": "Choose a password",
  "setPassword.rules": "At least 12 characters, with upper and lower case letters and a digit.",
  "setPassword.password": "New password",
  "setPassword.confirm": "Confirm new password",
  "setPassword.submit": "Save password",
  "setPassword.mismatch": "The two passwords do not match.",
  "setPassword.rejected": "That password does not meet the rules above.",
  "setPassword.noSession": "This page needs the link from your email. Ask for a new one.",

  "mfa.enrol.title": "Set up your authenticator",
  "mfa.enrol.intro":
    "Your role can see identified ratings, so signing in needs a second step. Add PerformanceVP to an authenticator app, then enter the six-digit code it shows.",
  "mfa.enrol.start": "Show the setup code",
  "mfa.enrol.scan": "Scan this with your authenticator app.",
  "mfa.enrol.secret": "Or enter this key by hand",
  "mfa.enrol.code": "Code from your app",
  "mfa.enrol.submit": "Confirm",
  "mfa.challenge.title": "Enter your authenticator code",
  "mfa.challenge.code": "Code from your app",
  "mfa.challenge.submit": "Continue",
  "mfa.error": "That code did not match. Check the time on your device and use the newest code.",
  "mfa.lost": "Lost your authenticator? Your account owner or PerformanceVP can reset it.",

  "pending.title": "No access yet",
  "pending.body":
    "You are signed in, but your account has no access to an organisation. Your account owner can grant it.",

  "portal.title": "Your access",
  "portal.signOut": "Sign out",
  "portal.staffSessions": "Open support sessions",
  "portal.noStaffSessions": "No open support sessions.",
  "portal.expires": "Ends",
  "portal.managerNote": "Your rating forms open here when a campaign starts.",

  "role.account_owner": "Account owner",
  "role.administrator": "Administrator",
  "role.executive_viewer": "Executive viewer",
  "role.unit_viewer": "Unit viewer",
  "role.manager_respondent": "Manager",

  "state.pending": "Not started yet",
  "state.active": "Active",
  "state.grace": "Read-only",
  "state.suspended": "Suspended",
  "state.cancelled": "Cancelled",

  "error.generic": "Something went wrong. Try again.",
  "error.notConfigured": "This deployment is not configured yet.",
} as const;

export type AuthCopyKey = keyof typeof authCopy;
