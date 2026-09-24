/**
 * Copy for the application shell: the header, the organisation navigation and the page furniture
 * shared by every signed-in screen. Drafted for Michael's review with the copy module.
 */
export const shellCopy = {
  "wordmark.first": "Performance",
  "wordmark.second": "VP",

  "nav.label": "Organisation",
  "nav.setup": "Setup",
  "nav.units": "Units",
  "nav.directory": "Directory",
  "nav.context": "Unit context",
  "nav.formalRatings": "Formal ratings",
  "nav.readiness": "Readiness",
  "nav.campaigns": "Campaigns",
  "nav.access": "Access",

  "crumb.label": "Breadcrumb",
  "crumb.home": "Home",
} as const;

export type ShellCopyKey = keyof typeof shellCopy;
