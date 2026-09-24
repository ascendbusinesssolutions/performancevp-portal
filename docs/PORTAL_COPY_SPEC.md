# PerformanceVP Online Subscription: Copy Specification

**Status:** Draft v0.3, 24 September 2026, amended with Milestones 4 and 4b, for Michael's review. Companion to `PORTAL_UX_BRIEF.md`. Inventories every sentence the portal produces so that Claude Code builds the interface copy as a closed, tested set. The mockups it inventories are on the Claude Design canvas "PerformanceVP portal mockups" (eight screens, 23 September 2026).

**Authority.** Every rule this document states about what a template says defers to the Online Measurement Specification, the Online Recommendations Specification and the Measurement Reference. This document owns the wording and the inventory only.

---

## 1. How copy is produced

No sentence in the portal is composed at run time. Every one is one of three kinds.

| Kind | What it is | Where it lives | How it is checked |
|---|---|---|---|
| **Fixed** | Headings, labels, buttons, standing statements | One copy module, `apps/portal/lib/copy/`, one entry per string, keyed | The copy lint (Section 6). Reviewed by Michael before Milestone 6 |
| **Template** | A fixed sentence with slots filled from the stored calculation run, the intake result, the directory or the campaign | The same module, one entry per template with its slot list | Every slot has a source path. Every branch has a named fixture. The interface never computes a slot value |
| **Pattern content** | The 29 online pattern cards | `ref_pattern_cards`, seeded by migration, versioned | Written from the Intervention Design Library under Recommendations Specification Part 4. Each stored suggestion records the card version it used |

Slot values come from the run, the intake result, the directory snapshot or the campaign record. Where a template needs a number the run does not already hold (for example the index at the top of a pattern's range), the recommendations package computes it at run time and stores it with the suggestion; the interface still only reads.

**Voice rules for every string.** Australian spelling. No em dashes. Short declaratives. No "will" about movement; "could", "indicative", "plausible". No dollar figures or percentage returns. Never "engagement survey". No competitor names. No sub-dimension codes outside the methodology footer. Force names and letters as decided in the UX brief (Performance index P, Capability C, Motivation M, Opportunity O, Synergy S).

**Number rules.** Scores are whole numbers; the index to one decimal. Within half a point of a threshold (60 for a trip-wire, 75 and 50 for bands, 15 for a gap) the score shows one decimal. Thresholds are applied to the unrounded value. Movement is stated in points. Response is stated as a percentage and a count ("78%, 47 of 60").

---

## 2. Templates: results

Slot names are in braces. Sources are result paths in `UnitMeasurementResult` (engine), `IntakeResult` (intake) or the stored suggestion. "Branches" lists every variant the template can produce; each is a fixture.

**R1. Binding-constraint statement.** Engine string, reproduced from the workbook template (Composite Scoring B45) with client-facing names substituted for the codes. `{subdimension} is where a realistic improvement would lift the index most. {force} is the lowest-scoring force.` Branches: with the force sentence; without it when the binding component is blank. Exact-match parity output.

**R2. Headline.** `{index}` with `Confidence {band}`. Branches: index present; index blank ("Not scored this cycle" with the reason from R9).

**R3. Lowest force marker.** `Lowest force` on the force card whose score is lowest, ties resolved C, then M, then O (engine rule).

**R4. Synergy sentence.** `A coefficient on the whole, not ranked. Lifting this unit's result by {pct}.` Branches: lifting (S above 1.00); `Holding this unit's result back by {pct}.` (S below 1.00); `Not measured this cycle; a neutral coefficient of 1.00 is applied.` (no Synergy data); `Neutral.` (S exactly 1.00 with data). `{pct}` is (S minus 1) as a percentage to one decimal.

**R5. Ranking row.** Columns from the run: score, confidence, lift to index (`+{dP}` to one decimal), below unit level (`{gap}` as a whole number, or `Above` when the score is above the unit mean). Footer line: `Unit level {mean}. {strengths}` where `{strengths}` is `Nothing at 85 or above this cycle.` or `At 85 or above: {list}.`

**R6. Trip-wire finding (unit page, one per breach, in trip-wire order).** Heading `{tripwire} trip-wire breached`. Body `Scored {score}. The threshold is 60. Reported ahead of every score, whatever the index.` Action line per trip-wire, fixed text from Measurement Reference 8.4: pay equity `Commission a pay equity review.`; fairness `Investigate, independent of the unit's line management.`; basic conditions `Remediate the conditions the items describe. Check work health and safety obligations.` Status line lists all three with scores; an unmeasured trip-wire reads `not measured`.

**R7. Critical findings string (footer and board summary).** Engine string (Methodology Footer C24 pattern): breach fragments, then not-measured fragments, else `No critical findings identified`. Four fixtures: all clear; one breached; one unmeasured; all unmeasured. Exact-match.

**R8. Gap findings.**
- O1, O2, O3 structural versus perception, gap above 15: heading `{subdimension}: the documented picture and people's experience {gap} points apart`. Body `Documented {structural}. Experienced {perception}. {interpretation} Gaps above 15 are reported, not averaged; the experienced score feeds the index.` Interpretation, fixed, from Measurement Reference 8.1: structural above perception `Documented in place, not lived.`; perception above structural `Working in practice beyond what is documented.`
- S2 telemetry versus perception, gap above 15: heading `Collaboration friction: data and survey {gap} points apart`. Body `Interaction data {telemetry}. Survey {perception}. {interpretation}` Interpretation: telemetry lower `People report less friction than the data shows.`; telemetry higher `People report more friction than the data shows.` Online v1 never fires this template (no telemetry); it exists for parity and the consultant-led route.
- Not fired: one collapsed card `Structure and perception agree on clarity, tools and process` with `Gaps of {g1}, {g2} and {g3}.`, or the subset measured.

**R9. Insufficient data.** `Insufficient data. {reason}` where `{reason}` is one of: `{valid} valid responses, {needed} needed.`; `Fewer than {floor} respondents.` (anonymity floor); `{count} of {total} managers rated; {needed} needed.`; `Ratings cover {pct} of the unit; 70% needed.`; `Leadership team of {n}; 3 needed.`; `A component was not entered: {component}.`; `Not measured at this cadence; the {date} result stands at {band} confidence.` Fixtures: one per reason.

**R10. False consensus.** Fired: `Low task conflict alongside high psychological safety. Disagreement may be going unspoken.` Not fired: `No false-consensus pattern.`

**R11. Carried forward.** On any score not refreshed this cycle: `From {date}` beside the confidence band, and in the footer `Carried forward: {list with dates}` or `None carried forward`.

**R12. Priority header.** `Priority {rank} · {subdimension}, {score}`.

**R13. Suggestion card conditionals.** Sentences switched by the recommendations package, each a boolean on the stored suggestion:
- `Start with {process}, the process with the lowest friction score in your audit.` (O3-P1 only; `{process}` from the intake per-process scores).
- `Relevant here, given the trip-wire.` appended to the watch-for line when any trip-wire fired.
- `Concentrated in {n} of {teams} teams.` (M1-P1, M2 patterns; from team-level aggregates above threshold; never names a team below threshold).
- `Ratings passed the inflation check.` or `The inflation check fired on {sub-dimension} ratings.` (C1, C2, C3 patterns).

**R14. Two-pattern self-check.** Heading `Two patterns fit. Which is closer?` Body `{signal sentence}` from a fixed table keyed by sub-dimension, with the two values inserted, for example O1: `Agreement on who decides scored {lt} and the strategy cascade {cascade}, too close for the measurement to separate the causes.` One sentence per sub-dimension in Recommendations Specification Part 3.3 (C1, C2, C3, C5, M1, M2, O1, O2, O4). After a choice: `You chose: {choice}.` with `Change`.

**R15. Movement and projection.** `+{low} to +{high}` on `{subdimension}`, then `assuming competent implementation. An estimate, not a forecast.` Index line `{index} → {low_index} to {high_index}` shown only where the range applies to the whole sub-dimension (Recommendations Specification 4.2); otherwise the range in words. Conditional: `At the top of the range, {new_binding} becomes the binding constraint.` shown only when the projection changes it. Where confidence is Medium or Low: `Less certain: this sub-dimension is at {band} confidence.`

**R16. Pace and evidence.** `Pace {pace}`, `Could show {cadence}` (Fast: `Half-yearly read`; Moderate: `Half-yearly read`; Moderate to slow, Mixed, Slow: `Annual read`; Decision-gated: `After the decision`), `Evidence {A|B|C}`.

**R17. What-if.** `{subdimension} {now} → {assumed}`; `{force} {now} → {new}`; `Index {index} → {new_index}`; binding constraint `{name}` or `Unchanged`. Fixed lines: `pattern range, {low} to {high}` on the slider; `One sub-dimension at a time. Decision support, not a forecast.`

**R18. Actions.** Empty: `None recorded` and `Record one and later measurements show movement against its range.` With a record, from the cycle at which the pattern's pace says it could show: `{subdimension} {start_score} → {now_score} since {start_date}, against +{low} to +{high}. Movement cannot be attributed to this action alone.` Before that cycle: `Too early to read; could show at the {cadence}.`

**R19. Methodology footer, one line.** `Online, self-administered · {member_rate} response · {insufficient}` where `{insufficient}` is `nothing insufficient` or `{n} insufficient` · `{adjustments}` (`no adjustments` or `{n} adjustments`) · `talent density from {C3 source}` (`manager ratings` or `formal ratings dated {date}`). Expanded columns list every instrument with `{valid} of {total} ({pct})`, exclusions `{n} ({pct}); speed check {ran|did not run}`, carry-forwards (R11), weight reallocation (`none` or the list), inflation guard (`did not fire` or `fired on {list}`; and `{n} deductions computed, not applied` while the workbook cells do not exist), flags, index confidence, the three standing statements, and `Engine {v} · Intake {v} · Run {id}`.

**R20. Trend annotations.** `Unit restructured {date}; earlier history is its predecessors'.` `Talent density source changed {date}.` `Carried forward from {date}.`

---

## 3. Templates: organisation, setup, campaigns

**O1. Overview row.** `{index}` to one decimal; `{band}`; since baseline `{direction}{change}` where direction is a chevron and change is one decimal, or `Baseline` at the first measurement; top three priorities as `1 {a}`, `2 {b}`, `3 {c}`; trip-wires `{n} breached` or `Clear`. Insufficient row: R9 followed by `The baseline result stands: {index}, now {band} confidence.` "Since baseline" compares with the unit's baseline of the current annual cycle (decision needed, Section 7).

**O2. Critical findings strip.** `{unit} {tripwire} {score}` per breach, in unit order of the table.

**O3. Overview footnote.** `Breaches first, then lowest index first. Lowest force underlined. Units are measured; the organisation is not scored.` Fixed.

**S1. Setup step status.** Per step: `{count} units` / `{n} people, uploaded {date}` / `{done} of {total} units. {remaining list} to go.` / `Skipped. Managers rate talent density.` or `Mapped. {n} people within 12 months.` / `{n} blockers` / `Opens when the readiness check passes`. Further branches: `No units yet.`; `{n} people` (no upload yet); `No one yet.`; `{done} of {total} units.` (all complete); `Waiting for people in the directory.`; `No formal ratings in the directory. Managers rate talent density.`; `Formal ratings found. Map them or skip them.`; `1 blocker`; `Passed.`; `Ready. The readiness check has passed.` Amended with Milestone 4b: counts of units are worded (`1 unit`, `4 units`), so `{count} units` and `{done} of {total} units` become `{units}` and `{done} of {total}`. Further branches: `{units}. {n} need a choice of how they are measured.`; `{units}. 1 needs a choice of how it is measured.`; `Waiting for a unit of 10 or more. Combine the units under 10 first.`

**S2. Readiness rows.** Each check has a pass line, a warning line and a blocker line:
- Units of 10: pass `{units} of 10 or more.`; blocker `{unit} has {n}. Nothing under 10 is measured. Combine it with a unit in its branch.`
- Manager for everyone: pass `{n} of {n}`; blocker `{n} without: {list}. Manager ratings and skill coverage need the reporting line.`
- Leadership team of 3: pass; warning `{unit} has {n} flagged. Clarity & decision rights will be insufficient for {unit} until 3 are flagged.`
- Team leaders: pass; warning `{unit} has none. The learning module goes to its unit leader instead.`
- Unit for everyone: pass `{n} of {n}`; blocker `{n} without a unit: {list}`.
- Role families and skills: pass `{units} of {units} units. {families} role families, {min} to {max} skills each, critical skills marked.`; blocker `{unit}: {missing}`.
- Context: pass `{units} of {units} units. 3 processes named in each.`; blocker `{unit}: {missing}`.
- Formal ratings: pass `Mapped to the five bands. Dated within 12 months for {n} people. {units below 80%}; its managers rate.`; skipped `Skipped. Managers rate.`
- Work emails: pass `{n} of {n} valid. Invitations can be sent.`; blocker `{n} invalid or missing: {list}`.
Summary `Blockers {b} · Warnings {w} · Passed {p}` and the foot `Available once the {b} blockers are fixed. Warnings do not block; they shape what can be scored.`

Further rows: unit leader (warning `{unit} has no unit leader.` or `{unit} has no unit leader: {n} people could lead it. Choose one.`); critical knowledge domain (warning `{unit} has no knowledge domain marked critical. Knowledge will be insufficient for {unit} until one is.`); directory uploads (warning when an upload awaits review). Units of 10 adds `{unit} has no one in it. Retire it, or record the merge or split it was part of.` Manager for everyone adds `{n} report to someone who has left: {list}.` and the pass line `{n} of {n}, with {head} at the head of the organisation.`

Measurement units (Milestone 4b): a unit under 10 lists its candidates, `{candidate}, beside it: {people}, {total} together.` (also `above it`, `above {parent}` and `below it`), each ending `, still short of 10` where the total is under 10. Units of 10 adds `{unit} holds {list}: {people}, still short of 10.` and `{unit} holds units that no longer share a branch. Undo it and choose again.` A new row, Grouping units: warning `{unit} has {n} of its own and units below it. Unless it is combined with a unit below, it is not measured and its people are not surveyed as members.` with its downward candidates; pass `{unit} groups the units below it and is not measured.` (or the plural `{list} group the units below them and are not measured.`), or `No unit under 10 has units below it.` Unit leaders adds `{leader}, who leads {unit}, is not flagged as leadership team.` The checks of measured units show `Checked once a unit has 10 or more.` until one has. The role families and context pass lines read `{n} of {units}.`

**S3. Directory preview.** Counts `Joiners {n}`, `Leavers {n}`, `Moved unit {n}`, `New manager {n}`, `Details changed {n}`, `Unchanged {n}`. Warnings: `{n} people report to a manager ID that is not in the file: {ids}.`; `Unit code {code} is new. It will be created as a unit named {name}, {n} people.`; `{unit} would have no active staff. Record a merge or split after applying.` Formal ratings `Rating and date present for {n} of {total}. Dated within 12 months: {n}. Coverage by unit: {list}.` then `Units at 80% or above use these for talent density. The managers of {list} will rate instead.` Apply `Apply {n} changes`. Leaver confirmation `{n} leavers is more than {threshold}. Confirm the file is the whole directory before applying it.` Fixed: `Nothing changes until you apply.` `Leavers are deactivated, not deleted. Their records are purged 30 days later.` `A running campaign keeps the directory it started with.`

The setup screens' fixed strings are inventoried in `apps/portal/lib/copy` (`setup.ts`, `units.ts`, `context.ts`, `ratings-map.ts`, `readiness.ts`, `directory.ts`), drafted in this document's voice with Milestone 4 for review. The Module Library 4.2 band names appear in client form ("Developing, partly meeting"); confirm against the source before the manager form uses them.

**C1. Campaign header.** `Open, day {d} of {total}` · `Closes {day} {date}, {time}` · `{units} units, {people} people` · `Reminders sent {dates}. Next: {date}`. Other states: `Scheduled, opens {date}`; `Closed {date}, under review`; `Released {date}`.

**C2. Response cell.** `{pct}` and `{valid} of {total}`; below threshold adds `{n} more needed`; leadership team below 3 adds `3 needed to score`; team leaders none flagged `None flagged; unit leader instead`. Column headers carry the threshold: `needs {pct}` or `needs 75%, 3+`.

**C3. Managers outstanding.** `{name}`, `{unit}`, `{reports} reports, {rated} rated` or `none rated`. Fixed: `Only the manager can rate. A form left incomplete at close counts as not rated.`

**C4. At close.** Fixed: `Scores are calculated and held for your review. Nothing is visible to viewers until you release it.` Review notices are R9 and R19.

---

## 4. Templates: respondents and managers

**V1. Survey landing.** `{organisation} · {unit}`; `How is work going in {unit}?`; fixed anonymity block `No name, no email, no login. Answers are only shown for groups of {floor} or more.` (floor 5; the M2 and trip-wire floor of 8 is not stated here); `About {minutes} minutes`; `{items} short questions in {groups} groups. {part B sentence}` where part B is `A second, shorter survey follows separately.` at baseline and annual and omitted otherwise; fixed `It measures what helps and what gets in the way for the unit as a whole. Not a review of anyone.`

**V2. Item screens.** `Group {g} of {total}`; group name from the Survey Blueprint block titles in client form; scale line `1 strongly disagree, 5 strongly agree` (or the block's own anchors where the Blueprint differs). Leadership-team disclosure, fixed, from Module Library 2.1 wording. Team selector question text from the Blueprint's CII team-selector item.

**M1. Manager form.** `{cadence} · {unit}`; `{done} of {total} done. Closes {day} {date}. Your answers save as you go.`; fixed `These ratings carry your name and your administrators can see them. The staff survey is separate and anonymous.`; `Last year's ratings shown. Change any that have moved.` (or `First time rating this team.`); scale anchors for skills `1 novice · 3 does the job without help · 5 expert others turn to` and for knowledge `1 little · 3 sound for the role · 5 an authority others consult` (align to Module Library 4.1 and Online Measurement Specification 4.1 anchors); band labels from Module Library 4.2 in client form; evidence prompts `A 5 needs one line of evidence` and `A 5 or a 1 needs one line of evidence.`; `Done, next: {name}`; fixed `Someone missing, or not yours? Tell your administrator. Only you can rate your team.`

**M2. Code sign-in.** Same response whether or not the address has an account: `If that address is on a rating list, a code is on its way. It lasts one hour.`

---

## 5. Templates: administration and subscription

**A1. Ratings area banner.** Fixed: `Identified data. Every view and export here is logged and visible to your account owner.` and `Not part of results. Nothing on this page reaches viewers.` Export button `Export, needs your authenticator`. Foot: `Talent density source: {manager ratings, this campaign | formal ratings dated {date}}. {coverage sentence}`; `Inflation check: did not fire. Band 5 at {pct}, mean band {m}, {pct} of skill ratings at 4 or 5.` or `fired on {list}: {rule}`; `Who has looked: you, {n} views this month. {PerformanceVP support, {n} session(s), {date}, {reason}}.`

**A2. Support sessions (account owner's access page).** `{staff name}, {date} {time} to {time}, {reason}` with the trail of actions beneath.

**A3. Subscription and lapse.** Grace: banner `Subscription ended {date}. Read-only until {date}. Campaigns cannot be launched and the directory cannot be changed.` Suspended (staff view and the account owner's access page only): `Suspended {date}. Data retained until deleted.` Reminders (email) at 60 and 30 days: subject `PerformanceVP subscription ends {date}`.

---

## 6. The copy lint

Runs on the copy module, the pattern cards and every fixture output. Fails on: an em dash; "will" within a sentence that mentions movement, lift, improvement or the index; a dollar sign or "%" followed by "return"; "engagement survey"; any competitor name from a maintained list; a sub-dimension code (`C1` to `S3`) outside the footer module; American spellings from a maintained list; "genuinely", "honestly", "leverage", "unlock", "seamless", "robust", "delve", "elevate".

---

## 7. Fixtures and open items

**Fixture rule.** Every template above has a fixture per branch, keyed by template ID and branch name, holding the slot inputs and the exact expected string. The engine-sourced strings (R1, R7) are already exact-match parity outputs and are reused, not duplicated. The suite fails if a template exists in the copy module without a fixture for each branch it declares.

**Open items.**
1. "Since baseline" (O1): confirm it compares with the unit's baseline of the current annual cycle, not the previous measurement. Recommended.
2. The M1-P1 concentration sentence (R13) names a count of teams, never a team; confirm.
3. Scale anchors (M1) to be aligned word for word with the Module Library and the Online Measurement Specification before the cards are seeded.
4. The 29 pattern cards are not yet written. They are the largest single copy task and are written from the Library under Recommendations Specification 4.1 and 4.3, then reviewed against this document's voice rules.
