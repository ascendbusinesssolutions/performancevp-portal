# PerformanceVP Online Subscription: UX Brief

**Status:** v1.0, settled 23 September 2026, amended the same day to remove the support-access switch after the tenancy decisions. The six decisions in Section 8 were confirmed by Michael the same day. This file lives in the portal repository; the IP folder holds only a pointer to it. It is the reference for the Claude Design mockups and for every interface milestone in `PORTAL_BUILD_PLAN.md` (Milestones 4, 5, 6, 7 and 9). It defers to the Online Measurement Specification and the Online Recommendations Specification for what is measured and shown, and to the build plan for what is built when.

---

## 1. What the interface has to achieve

The product is a self-service measurement instrument. A client sets up its own organisation, runs the instruments itself, and reads results that tell it where performance is most constrained and what kind of intervention fits. No consultant is in the loop, so the interface has to do three things a consultant would otherwise do: make setup feel manageable, make a campaign easy to run well, and make results readable by an executive who has ten minutes.

The feel to aim for is a well-set board paper, not a software dashboard. Calm, evidence-grounded, honest about what is and is not measured, and generous with white space. Every number should be able to answer "where did this come from" within one click. Nothing in it should read as gamified, and nothing should promise.

Three journeys decide whether the product is good. If these are right the rest follows.

1. **Setup to a passing readiness check.** A new administrator, with no help, gets an organisation from empty to ready for its first campaign.
2. **Running a campaign.** Launch, watch response, close, review and release, without a consultant chasing anyone.
3. **Reading results.** An executive opens a unit, sees the binding constraint and the trip-wires in the first screen, understands why the list is in the order it is, and knows what to consider doing next.

---

## 2. Who uses it

| User | Comes to | How often | Device | Notes |
|---|---|---|---|---|
| **Account owner** | Everything an administrator does, plus users, the subscription view, the record of PerformanceVP support sessions, the data-contribution opt-out | Setup, then occasional | Desktop | Usually the HR lead or a chief of staff |
| **Administrator** | Set up and maintain the directory and unit context, run campaigns, review and release results, the ratings area, exports | Weekly around a campaign, quarterly otherwise | Desktop | The person the product has to earn trust with. Often the same person as the owner |
| **Executive viewer** | Read released results across the organisation, trends, suggestions | After each release; a few minutes | Desktop and tablet | Never sees ratings or the directory. Wants the answer first |
| **Unit viewer** | The same for nominated units | After each release | Desktop and tablet | A unit leader. Never sees ratings; cannot hide a trip-wire |
| **Manager respondent** | Rate their own direct reports (skills, knowledge, talent bands) | Once per annual cycle, 30 to 50 minutes | Desktop | Signs in with a one-time code. Sees only their own forms, pre-filled from last year |
| **Survey respondent** | Answer Part A and Part B, or a team-leader or leadership-team module | Once per campaign, 12 to 25 minutes | Phone as often as desktop | Not a portal user. Arrives from a tokenised link. Anonymity has to be visible, not just stated |
| **PerformanceVP support** | Assist with setup and problems | Rare | Desktop | Access logged and visible to the client |

The administrator and the executive viewer are the two to design for first. The respondent surfaces matter most for response rates, which decide whether anything can be scored at all.

---

## 3. Design principles, from the IP

These come from the Online Measurement and Recommendations Specifications and from the claims discipline. They are constraints on the interface, not preferences.

1. **Unit-level, always.** Every score, finding and suggestion is about a unit. Nothing on any screen names, ranks or implies an individual. The ratings area is the one identified surface and is kept visibly separate.
2. **Trip-wires come first.** A breach appears above everything else on every view of that unit and cannot be dismissed by a unit viewer. It is styled as a critical finding, not as a KPI.
3. **The binding constraint leads.** The results page opens with P, the binding constraint statement and the lowest force. The full ranking follows, with the two quantities that produced the order explained in plain terms, so a reader sees why a heavily weighted strength does not lead the list.
4. **Honest labelling.** Every score carries its confidence. Every results view carries the methodology footer: route, response rates, exclusions, sub-dimensions marked insufficient, adjustments applied, carry-forwards, and the standing statements that ratings and checklists are self-reported and that decision latency is not measured. Insufficient data is shown as insufficient, never as zero and never as blank without a reason.
5. **The claims discipline.** Movement is "could" or "indicative", never "will". No dollar figures, no percentage returns, no comparison with other organisations until the comparison set supports it, and never described as an engagement survey.
6. **A fixed instrument.** Clients configure context (units, role families, skills, domains, decision types, processes, systems). Item wording, scales, scoring, thresholds and weights are never editable and the interface does not suggest they might be.
7. **Anonymity is visible.** The survey tells respondents what is anonymous and what is not, in one sentence, before the first item. The difference between the anonymous survey and the identified manager rating is stated wherever a person could confuse the two.
8. **Explain the order, not just the number.** Wherever the product ranks or flags, the reason is one click away: the priority quantities, the gap between structural and perception layers, the threshold a validity rule applied.
9. **Design guidance only.** Suggestions carry the pattern, its fit, its shape in outline, what to expect and what goes wrong. No timelines, owners or implementation plans. The route to Intervention Design is on every card, as an offer, not a nag.
10. **Nothing hidden by default.** Suppressed scores say why they are suppressed. A unit below threshold says what it needs. A carried-forward score shows its original date.

---

## 4. The three journeys

### 4.1 Setup to a passing readiness check (administrator)

**Screens.** Welcome and progress; organisation and units; directory (template download, upload, difference preview, confirm; individual edit); unit context (role families and skills from the template library, knowledge domains with criticality, decision types, three critical processes, primary systems); formal ratings mapping (optional); readiness check.

**What matters.**
- Progress is visible from the first screen: the six steps, which are done, which is next, and that the administrator can leave and return. Setup for a mid-sized organisation is a few hours of work spread over days.
- The directory upload is the highest-anxiety step. The preview must show joiners, leavers, moves and manager changes in plain counts and lists before anything applies, and applying nothing until confirmed has to be obvious.
- The template library does the work. Role families and skills, decision types and process prompts are offered as starting points to select, rename and trim, so the administrator is editing rather than authoring.
- The readiness check is a checklist with blockers named: units under 10, people without a unit or manager, team leaders and leadership team not flagged, frameworks incomplete. Each blocker links to the screen that fixes it. Passing it is a moment; the screen should feel like one.
- The 12-month rule for formal ratings and the calibration declaration are stated where the mapping is done, not in a help page.

### 4.2 Running a campaign (administrator, then respondents)

**Administrator screens.** Cadence calendar; launch (which units, which audiences, counts per audience, the snapshot notice); monitoring (response rate by audience and unit against the thresholds that will apply, managers outstanding, reminders sent); close; review the run (scores with the methodology footer and any insufficiency notices); release.

**Respondent screens.** Survey landing (who is asking, why, what is anonymous, how long); items in groups with a progress indicator, one group per screen on a phone; Part B as a second short survey in the same window; team-leader and leadership-team modules; the leadership-team disclosure that a small group cannot be fully anonymous; the manager rating form (direct reports listed, skills per role family, the 1 to 5 scale with its anchors visible, evidence note required for a 5 and for Bands 5 and 1, pre-filled from last year, save and return); the administrator checklists.

**What matters.**
- Monitoring shows response against the threshold that will decide validity, per audience and unit, so the administrator knows before close whether a unit will score. "Below threshold" is shown as a warning with the number needed, not as a red failure.
- Managers outstanding is a list with a reminder action. The product never accepts a substitute for a manager's rating and the interface does not offer one.
- Review before release is the administrator's moment to read the methodology footer. Insufficiencies and adjustments are shown as notices with their reasons, above the scores.
- The survey is mobile-first. Thumb-sized answer targets, one group per screen, progress visible, no account, no email. The anonymity sentence is on the landing screen and the anonymity floor is stated in plain words ("results are only shown for groups of five or more").
- The manager form respects the manager's time: it opens on the first incomplete report, it can be left and resumed, and last year's ratings are visibly pre-filled and visibly editable.

### 4.3 Reading results (executive viewer, unit viewer, administrator)

**Screens.** Organisation overview (units with P, confidence, trend direction and trip-wire alerts; no organisational P); unit results page; force view (C, M, O, S with their sub-dimensions); sub-dimension view (score, confidence, the layers where there are two, the gap, the item groups at unit level); suggestion card; what-if simulator; action tracking; trends across cycles; the methodology footer on every results view.

**The unit results page, in the order the Recommendations Specification fixes.**
1. Trip-wire breaches, if any, with the action path.
2. P with its confidence band; C, M, O and the Synergy coefficient; the binding component; the binding-constraint statement in the workbook's own words.
3. The ranked list of all fourteen C, M and O sub-dimensions with score, confidence, "how much P could realistically move" and "how far below this unit's own level it sits". The executive view shows the top six by default, with the full fourteen one click away and strengths at 85 or above shown separately. Ranks 1 to 3 carry full suggestions, 4 to 6 summaries, the rest are listed.
4. The Synergy lane beside the ranking: S1, S2, S3, the coefficient, and its effect on P as a percentage.
5. Findings from the flags: structure-versus-perception gaps on O1 to O3 and the false-consensus pattern, each with its interpretation.
6. Suggestions, the what-if simulator and action tracking.
7. The methodology footer.

**What matters.**
- The first screen answers the question. An executive should know the binding constraint, whether a trip-wire has fired, and the confidence of P without scrolling.
- The ranked list explains itself. The two priority quantities are labelled in plain terms and the reason a strong sub-dimension can show a large gain but rank lower is one click away.
- Trends are honest. A break in unit lineage, a change of C3 source, and a carried-forward score are annotated on the line, not smoothed over.
- Suggestion cards are the action layer. Each is short (under 350 words), in client voice, with what it addresses, signs it fits, the shape of the fix, what to expect, what goes wrong, evidence rating, and the offer of Intervention Design. Where the signals could not separate two patterns, the card shows both with the self-check question.
- The what-if simulator moves one sub-dimension at a time and says so. Action tracking shows movement against the indicative range from the cycle at which the pattern's pace says it could show, with the statement that movement cannot be attributed to the action alone.

### 4.4 Two surfaces outside the journeys

- **The ratings area** (administrator and account owner only). A separate area, visibly separate from results, with its own navigation entry, an access-logged banner, browse by unit and manager, and export. It shares no screen with results.
- **The subscription view** (account owner). Band, period, status, the grace and suspension rules stated plainly, renewal date, the data-contribution switch with one sentence on what it does, and the record of PerformanceVP support sessions: who, when, why, and what was done. There is no switch for support access; staff reach a client's data only through a logged session, and the client can always see the sessions (decided 23 September 2026).

---

## 5. Interface conventions

- **Numbers.** Scores are whole numbers in the interface; P to one decimal. Within half a point of a threshold (60 for a trip-wire, 75 and 50 for bands, 15 for a gap) the score is shown to one decimal, so a "60" is never flagged critical without the reader seeing why. Thresholds are always applied to the unrounded value, never to the displayed one (decided 23 September 2026).
- **Confidence.** Always beside the score, as a word (High, Medium, Low), with the measurement date on hover or tap.
- **Missing data.** "Insufficient data" with the reason ("12 valid responses; 15 needed") and, where a rule applied, the rule. Never an empty cell.
- **Bands.** Green above 75, Amber at 50 or more, Red below, Neutral when there is no score. Colour is never the only carrier: the word or the number is always present.
- **The four forces** share slate blue and are distinguished by position, label and shape, not by colour. Status colours are reserved for bands and trip-wires.
- **Language.** Client voice, Australian spelling, no jargon from the analyst documents ("binding constraint" and "trip-wire" stay because the reports use them; "Type A", "Tier 3", "route" and sub-dimension codes do not appear except in the footer). No "will". No em dashes.
- **Empty states** explain what will appear and what has to happen first. The organisation overview before the first campaign is the most important one.
- **The footer** is the same component everywhere results appear, collapsed by default to one line ("Online, self-administered; 71% response; 2 sub-dimensions insufficient; C3 from formal ratings dated March 2027") and expanded on demand.
- **Help** is inline where a rule applies (the 12-month rule at the mapping screen, the anonymity floor at the threshold), not a separate manual.

---

## 6. Brand and visual direction

- **Colour.** Corporate Slate Blue #1F3A52, Strategic Gold #B89E6E, Measurement Grey #5C6670, White, with the tint scale and gold-deep #82693F for text from the marketing site. Tailwind's default palette is removed, so every colour is a deliberate token. The status colours (green, amber, red, and the critical trip-wire treatment) do not exist yet and must be defined with contrast checked before Milestone 6.
- **Type.** Spectral for display, IBM Plex Sans for text, IBM Plex Mono for figures. Figures are set in the mono face so columns of scores align.
- **Feel.** Editorial. Generous margins, a strong type hierarchy, few boxes, thin rules, no shadows or gradients. Charts are simple SVG: a ranked bar list, a trend line with annotations, a small four-force figure. No gauges, no speedometers, no donuts.
- **Motion.** Almost none. State changes are immediate; the only transitions are the readiness check passing and a campaign releasing.
- **Density.** The results page is for reading; the directory, monitoring and ratings screens are for working and can be denser, with tables.
- **Dark mode.** Not in v1.

---

## 7. Accessibility

WCAG 2.1 AA throughout: contrast (gold-deep, not gold, for text on white), keyboard operation for every control, visible focus, labels on every form field, colour never the only carrier of meaning, and touch targets of at least 44 pixels on the survey. The survey is tested on a phone before anything else is.

---

## 8. Decisions (settled 23 September 2026)

1. **Display rounding near thresholds.** One decimal within half a point of a threshold; thresholds stay on the unrounded value.
2. **Status colours.** Three band colours plus the critical trip-wire treatment are proposed in the first mockup, with contrast checked, and defined as tokens before Milestone 6.
3. **Client-facing names.** Performance index, Capability, Motivation, Opportunity, Synergy, with the letters P, C, M, O and S shown beside them. Sub-dimension codes appear only in the methodology footer.
4. **Executive default view.** The top six of the ranking, with the full fourteen one click away and strengths (85 and above) shown separately.
5. **Manager rating form.** Designed for desktop, readable on a tablet, not designed for a phone in v1.
6. **Organisation overview.** Performance index, confidence and trend direction per unit, sorted by the number of trip-wires fired, then by performance index ascending.

---

## 9. Mockups, in the order to make them

1. Unit results page (executive viewer).
2. A suggestion card, full and summary forms, including the two-pattern self-check.
3. Organisation overview, populated and empty.
4. Setup: directory upload preview and the readiness check.
5. Campaign monitoring.
6. Survey landing and one item group, on a phone.
7. Manager rating form.
8. Ratings area (administrator).

Each mockup is reviewed against Section 3 before it is handed to Claude Code, and each interface milestone is reviewed against the mockup before it is approved.
