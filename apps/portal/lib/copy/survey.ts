/**
 * Copy for the anonymous surveys (PORTAL_COPY_SPEC.md V1 and V2; Milestone 5 plan, 3.2 to 3.4 and
 * 4.2): the landing, the team question, the item screens, Part B's process groups, the team-leader
 * and leadership-team modules, completion and the link states. V1's strings are kept as the
 * specification gives them. The leadership-team disclosure follows Module Library 8.3 (V2 cites
 * 2.1; discrepancy S9); the small-group line for team leaders follows Module Library 8.4 (D24).
 * The scale words are the Survey Blueprint's. Item wording comes from the reference tables,
 * verbatim, and is not held here. The rest is drafted for Michael's review.
 */
export const surveyCopy = {
  "page.title": "Survey",
  "bar.group": "Group {g} of {total}",
  "bar.decision": "Decision {g} of {total}",

  "landing.eyebrow": "{organisation} · {unit}",
  "landing.title.members": "How is work going in {unit}?",
  "landing.title.teamLeaders": "How does your team learn?",
  "landing.title.leadershipTeam": "Who decides what in {unit}?",
  "landing.anonymous.title": "Anonymous",
  "landing.anonymous":
    "No name, no email, no login. Answers are only shown for groups of {floor} or more.",
  "landing.small.title": "A small group",
  "landing.leadershipTeam":
    "The leadership team is small enough that complete anonymity cannot be guaranteed. Aggregate findings do not identify individual responses, but you should answer with that knowledge.",
  "landing.smallGroup":
    "This group is small, so complete anonymity cannot be guaranteed. Findings are reported for the group and never for one person, but you should answer with that knowledge.",
  "landing.minutes.title": "About {minutes} minutes",
  "landing.questions": "{items} short questions in {groups} groups.",
  "landing.partB": "A second, shorter survey follows separately.",
  "landing.decisions": "{n} of the unit's decisions, with six short questions on each.",
  "landing.why.title": "Why",
  "landing.why":
    "It measures what helps and what gets in the way for the unit as a whole. Not a review of anyone.",
  "landing.start": "Start",
  "landing.about": "Who is asking, and how answers are used",
  "about.behalf": "PerformanceVP runs this survey on behalf of {organisation}.",
  "about.stored":
    "Your link works once. Your answers are stored without your name, your email or the time you answered, and nothing records that you took part.",
  "about.shown":
    "{organisation} sees results for the unit, and for groups of {floor} or more, never one person's answers.",
  "about.skip": "You can leave out any question you would rather not answer.",

  "team.eyebrow": "Before you start",
  "team.title": "Which team are you part of?",
  "team.hint":
    "Only used to group answers by team. Nothing is shown for a team with fewer than 4 responses, and it is not scored.",

  "scale.agree": "1 strongly disagree, 5 strongly agree",
  "scale.1": "Strongly disagree",
  "scale.2": "Disagree",
  "scale.3": "Neither agree nor disagree",
  "scale.4": "Agree",
  "scale.5": "Strongly agree",
  "scale.value": "{value}, {label}",

  // Michael, checkpoint 2: the cascade section's heading.
  "partB.cascade": "How your work connects to the strategy",
  "partB.informationAccess": "The information you need",
  "partB.process": "Thinking about {process}",
  "partB.optOut": "I do not work on this process",
  "teamLeaders.heading": "How your team learns",

  "leadership.pickMany": "Choose any that apply.",
  "leadership.pickOne": "Choose one.",
  "leadership.unclear": "Unclear or varies",

  "nav.back": "Back",
  "nav.next": "Next",
  "nav.submit": "Send my answers",
  "nav.sending": "Sending",

  "done.title": "Thank you. Your answers are in.",
  "done.body": "Nothing in them identifies you. You can close this page.",
  "done.partB": "The same email holds a second, shorter survey, with its own link.",

  "state.loading": "Opening the survey",
  "state.unknown.title": "This link has been used, or is not recognised",
  "state.unknown.body":
    "Each link works once. If you have not answered yet, open the whole link from your email again.",
  "state.closed.title": "This survey has closed",
  "state.closed.body": "Thank you for your time.",
  "error.send":
    "Your answers could not be sent. Check your connection and try again; nothing has been lost.",
  "error.empty": "Answer at least one question before sending.",
} as const;

export type SurveyCopyKey = keyof typeof surveyCopy;
