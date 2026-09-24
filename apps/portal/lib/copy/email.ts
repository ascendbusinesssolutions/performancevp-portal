/**
 * Copy for campaign mail (Milestone 5 plan, 5.2; DECISIONS.md 2.2): the survey invitation, the
 * managers' invitation, the refused scheduled launch and results ready for review (C4's fixed line).
 * Every survey email states that PerformanceVP runs the survey on behalf of the named client. Mail
 * about the anonymous survey and mail about identified ratings are always separate, so the two are
 * never confused. Drafted for Michael's review. Bodies are rendered at send time and never stored.
 */
export const emailCopy = {
  "from.name": "PerformanceVP Surveys",
  footer: "Sent by PerformanceVP for {organisation}.",

  "survey.subject": "A short survey for {organisation}",
  "survey.intro":
    "{organisation} has asked PerformanceVP to run a short survey about how work is going.",
  "survey.anonymous":
    "It is anonymous. Your answers carry no name, and results are only shown for groups of 5 or more.",
  "survey.link.members_part_a": "The survey about {unit}, about {minutes} minutes:",
  "survey.link.members_part_b": "A second, shorter survey about {unit}, about {minutes} minutes:",
  "survey.link.team_leaders": "Questions for team leaders in {unit}, about {minutes} minutes:",
  "survey.link.leadership_team":
    "Questions for the leadership team of {unit}, about {minutes} minutes:",
  "survey.small":
    "The questions for team leaders and the leadership team go to small groups, so complete anonymity cannot be guaranteed there. The survey says more before you start.",
  "survey.once": "Each link works once and is yours alone, so please do not forward this email.",
  "survey.closes": "The survey closes {date} at {time}.",
  "survey.behalf": "PerformanceVP runs this survey on behalf of {organisation}.",

  "manager.subject": "Rate your team for {organisation}",
  "manager.intro":
    "{organisation} is asking you to rate the skills and knowledge of your direct reports in {units}.",
  "manager.identified":
    "Your ratings carry your name and your administrators can see them. They are separate from the anonymous staff survey.",
  "manager.signIn": "Sign in with a one-time code sent to this address:",
  "manager.closes": "Rating closes {date} at {time}.",

  "refused.subject": "{campaign} did not open",
  "refused.body":
    "{campaign} was scheduled to open, but the readiness check found something to fix first. It is a draft again.",
  "refused.link": "See what to fix:",

  "scores.subject": "Results ready for review: {campaign}",
  "scores.body":
    "{campaign} has closed. Scores are calculated and held for your review. Nothing is visible to viewers until you release it.",
  "scores.link": "Review them:",
} as const;

export type EmailCopyKey = keyof typeof emailCopy;
