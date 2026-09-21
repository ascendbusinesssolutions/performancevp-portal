# The Performance Equation
## Online Recommendations Specification

**Author:** Michael, PerformanceVP
**Status:** Working draft v0.4, for review. Proposed new source document. The four decisions raised in drafting were confirmed on 21 September 2026 (Part 9.1). Updated the same day for the decisions to retain identified manager ratings and to accept formal performance ratings as an optional C3 input. The three checks at source are complete (Part 9.2).
**Last updated:** 21 September 2026
**Companion documents:** Online Measurement Specification; Intervention Design Library; Intervention Design Handbook; Diagnostic Workbook Spec (Parts 9 and 10); Measurement Reference Part 2 (Parts 8 and 9); Sub-Dimension × Cadence Master Reference; Strategy.

---

## Purpose of this document

The online subscription has no analyst to read the results, name the binding constraint, validate a root cause and propose what to do. This document defines how the platform does as much of that as can be done by rule, and where it stops.

It covers four things: how results are ranked and presented as priorities; how the platform chooses which intervention pattern to suggest for a sub-dimension; what a suggestion contains; and the what-if and action-tracking tools that sit beside the suggestions.

### What this document owns, and what it defers to

| Matter | Authority |
|---|---|
| The ranking method and its parameters (ρ, S_cap, τ) | Diagnostic Workbook Spec Part 10 |
| Gap rules, false-consensus flag, trip-wire logic and their interpretation | Measurement Reference Part 8 |
| The patterns themselves: root causes, design shape, variants, indicative effect, pace, failure modes, watch-fors, combinations and sequencing | Intervention Design Library |
| How an intervention is designed for a specific unit | Intervention Design Handbook (Offering 2) |
| **Which pattern the platform suggests from the signals it holds; what is shown; the limits on what is shown; the what-if and action-tracking rules; the authoring rules for the online pattern content** | **This document** |

### The boundary with Intervention Design

Online suggestions are generic. They tell a client which proven pattern most likely fits what the measurement shows, what that pattern involves in outline, and what movement is plausible. They do not validate a root cause, tailor the design to the unit, model overlapping effects, set success criteria or produce an implementation plan. Those remain Offering 2. The design and implementation boundary holds online as it does everywhere: suggestions carry design guidance only, the client implements, and measurement of effect comes from the subscription's own cadence.

---

# Part 1 - What the client sees, in order

1. **Trip-wire breaches.** Any trip-wire below 60 appears first, above all scores, on every view of the unit, with its action path (Part 3.4). It cannot be dismissed by a unit-level viewer.
2. **P and the binding constraint.** P with its confidence band; C, M, O and the Synergy coefficient; the binding component; and the binding-constraint statement, reproduced verbatim from the workbook's template (Diagnostic Workbook, Composite Scoring B45): "[sub-dimension] is the binding constraint, the highest-priority place a realistic improvement would lift P; [component] is the lowest-scoring force".
3. **The ranked list.** All 14 Capability, Motivation and Opportunity sub-dimensions ordered by Priority (ΔP × rel) from the stored calculation run. The consultant-led reports show the top six; online shows the full list. Each row shows score, confidence, realistic P gain and the relative-weakness factor in plain terms ("how much P could realistically move" and "how far below this unit's own level it sits"), so a client can see why a heavily weighted strength such as M1 does not lead the list.
4. **The Synergy lane.** S1, S2 and S3 are shown beside the ranking, not in it, under the settled rule that Synergy is a coefficient. The lane shows each score, S_internal, the coefficient, and its effect on P stated as the percentage by which Synergy currently amplifies or dampens the weighted mean.
5. **Findings from the flags.** Structure-versus-perception gaps on O1 to O3 and the false-consensus pattern, each with the interpretation from Measurement Reference 8.1 and 8.3.
6. **Suggestions.** As set out in Parts 2 to 4.

---

# Part 2 - Which sub-dimensions receive a suggestion

Focus is part of the method. The Library warns against running parallel interventions through one overloaded implementer, and Intervention Design works on one to three findings. The platform follows the same discipline.

| Position | Treatment |
|---|---|
| Trip-wire breach | Always shown first, regardless of ranking |
| Rank 1 (the binding constraint) | Full suggestion, marked as the first priority |
| Ranks 2 and 3 | Full suggestions |
| Ranks 4 to 6 | Summary suggestions ("also worth attention") |
| Ranks 7 to 14 | Listed with scores. The pattern is available on request, but the platform does not push it |
| Any sub-dimension at or above 85 | No suggestion. 85 is the ranking's S_cap, above which realistic improvement is nil. Shown as a strength to maintain |
| Synergy sub-dimension below 60 | A suggestion in the Synergy lane |
| Sub-dimension reported as insufficient | No suggestion. The platform states what is missing to measure it |

No more than three suggestions are marked as priorities at one time.

---

# Part 3 - Choosing the pattern

## 3.1 The problem and the approach

The Library chooses between patterns by validated root cause, which is the analyst's Stage 2 work. Online there is no Stage 2. The platform therefore does three things, in order:

1. **Use the signals it holds.** Layer scores, module component scores, item-group means, team-level spread, the inflation guard and the gap flags often separate one root-cause family from another.
2. **Where the signals separate the patterns, lead with the indicated pattern** and show the alternative beneath it.
3. **Where they do not, show both with a self-check question** and let the client choose. This is honest about where the judgement sits: the platform measures, and the client knows its own context.

**Material difference.** Throughout this Part, one value is materially below another when it is lower by 8 points or more. Eight is the ranking's own scale for relative weakness (τ), used here so the product applies one notion of "materially lower" everywhere. Confirmed as the default on 21 September 2026.

## 3.2 Sub-dimensions with one pattern

C4 (C4-P1), M3 (M3-P1), M4 (M4-P1), O3 (O3-P1), O5 (O5-P1), S1 (S1-P1), S2 (S2-P1), S3 (S3-P1). The pattern is suggested directly. Two refinements:

- **O3-P1** names the process with the lowest friction score from M-O3-PF as the place to start.
- **S3-P1** leads with the low-task-conflict form where the task-conflict items sit materially below the relationship-conflict items or the false-consensus flag has fired, and with the relationship-conflict form where the reverse holds. The task-conflict group is TSI3-01 to TSI3-03 and the relationship-conflict group is TSI3-04 and TSI3-05 (Survey Blueprint Part 5). Both are compared as converted scores after reverse-scoring, so a higher relationship score means less friction.

## 3.3 Sub-dimensions with two patterns

| Sub-dim | Signal held by the platform | Leads with | Self-check shown when the signal is inconclusive |
|---|---|---|---|
| **C1** | Coverage of behavioural skills in people-leader role families is materially below technical coverage, or the people-leader role family has the lowest coverage in the unit and O5 is materially below the unit mean | C1-P2 Leadership behavioural capability | Is the gap mainly technical or functional skill across a role family, or the way the unit's leaders lead? |
| | Otherwise | C1-P1 Coverage gap | |
| **C2** | No separating signal online | C2-P1 Knowledge structure and accessibility | Is the knowledge at risk mostly judgement and know-how held by a few experienced people, which documentation has failed to capture? If yes, C2-P2 |
| **C3** | The inflation guard fired on C3 (manager-module route), or formal ratings were the input and did not pass the acceptance test, so the uncalibrated rule applied (Online Measurement Specification 6.4) | C3-P1 Rigour reset. The card states that the first effect is a more honest baseline, which may read lower before it improves | |
| | The guard did not fire and C3 is low | C3-P2 Selective talent injection, with a readiness note where O1, O2 or O5 is materially below the unit mean | Are ratings honest and the unit simply short of strong performers in pivotal roles? |
| **C5** | S1 coverage breadth shows at least one critical skill with no proficient member | C5-P2 External capability injection, shown beside C1-P1 | Does the unit need a capability nobody inside it currently holds? |
| | Otherwise | C5-P1 Learning system redesign | |
| **M1** | One or more teams above the display threshold sit materially below the unit's M1 | M1-P1 Sub-population deep-dive | Is the problem concentrated in one group, or is the whole unit short of belief that it can succeed? |
| | The team-confidence items (MI1-05, MI1-06) sit materially below the engagement items (MI1-01 to MI1-04), evaluated only at a cadence where both team-confidence items are deployed (Survey Blueprint 3.1.1 and 3.1.2) | M1-P2 Confidence and efficacy lift | |
| **M2** | O5 is materially below the unit mean, or low M2 is concentrated in a minority of teams | M2-P2, presented as leadership practice (Part 6.1) | Is there a process or rule that punishes speaking up or disclosing errors, or is it how bad news is received day to day? |
| | Otherwise | M2-P1 Structural psychological safety | |
| **O1** | M-O1-LT materially below M-O1-CASCADE | O1-P1 Decision-rights reset | Is the difficulty knowing who decides, or seeing how the work connects to strategy? |
| | M-O1-CASCADE materially below M-O1-LT | O1-P2 Cascade alignment | |
| | Gap flag fired, structural above perception | O1-P1 in its documented-but-not-lived form: recommunication and reinforcement, not redesign (Measurement Reference 8.1) | |
| **O2** | ADM-O2 tool inventory or integration materially below M-O2-IA, or IA items 04 to 06 materially below items 01 to 03 | O2-P1 Tool rationalisation and integration | Are the tools themselves the problem, or is it getting at the information inside them? |
| | IA items 01 to 03 materially below items 04 to 06 and tool inventory at 60 or above | O2-P2 Information access redesign | |
| **O4** | No separating signal online | O4-P1 Demand management and capacity rebalance | Has the unit's scope grown through decisions made above it, without resourcing? If yes, O4-P2, and the card states plainly that the lever sits outside the unit |
| | Capacity facts at 75 or above with perception below 50 | O4-P1 in its demand-filter form, with a note that overload is being experienced but does not show in the capacity facts | |

**M1-P1 note.** The Library keys this pattern to behavioural triangulators, which the online route does not score in v1. Team-level spread stands in for them.

## 3.4 Trip-wires

| Breach | Pattern | First action stated on the card |
|---|---|---|
| Pay equity below 60 | TW-P1 | Commission a pay equity review |
| Fairness below 60 | TW-P2 | Investigate, independent of the unit's line management |
| Basic conditions below 60 | TW-P3 | Remediate conditions; check WHS obligations |

Wording follows Measurement Reference 8.4. The card states that a breach is a critical finding regardless of P.

## 3.5 Sequencing and combinations

Applied mechanically from Library 2.3:

1. Trip-wire actions come first.
2. The binding constraint leads the ranked suggestions.
3. **Quick win alongside.** Where the lead pattern's pace is Slow and a Fast pattern exists among the top six or in the Synergy lane (M1-P1, M1-P2, M2-P1, O3-P1, O5-P1, S2-P1), it is shown as a quick win to run alongside.
4. **Dependencies.** Where C5 is in the top three and M2 is below 60, the M2 suggestion is placed ahead of it with the Library's reason (low safety caps learning). C3-P2 carries the O-side readiness note.
5. **Combinations.** Where both members of a Library combination are in the top six, the pair is noted as commonly designed together: M2-P1 with C5-P1; C1-P1 with O5-P1; M1-P1 with O4-P1; M2-P2 with O5-P1; C2-P2 with C2-P1. Combinations involving the DLP patterns are omitted.

---

# Part 4 - What a suggestion contains

## 4.1 The online pattern card

Each Library pattern used online has an online edition, written for a client reader. The Library is written for analysts and is not shown verbatim.

| Card field | Drawn from | Notes |
|---|---|---|
| What this addresses | Pattern title and "when to use" | One or two sentences in plain language |
| Signs it fits | "When to use", root causes | Three to five bullet points in client voice |
| The shape of the fix | Design shape | Four to six steps in outline. No timelines, owners or implementation detail |
| Common forms | Variants | Variant names with one line each. The pick-by-root-cause table stays in the Library |
| What to expect | Indicative effect and pace of change | The range in sub-dimension points, labelled as an evidence-informed estimate that assumes competent implementation, and when the measurement is likely to show it |
| What goes wrong | Failure modes | The three that matter most |
| Watch for | Watch-for line | Trip-wire adjacency and cross-effects |
| Evidence | Evidence rating | A, B or C with the one-line basis |
| Go further | Fixed text | Route to Intervention Design for a root-caused, tailored brief |

**Withheld from the online edition:** the variant selection tables, the Stage 2 root-cause method, case sketches, the effect-estimation adjustments in the Intervention Design Handbook, and overlap modelling.

**Count.** 29 cards: the 32 Library patterns less DLP-P1 to P3.

**Length.** A card is at most 350 words. The online pattern content is a separate artefact, to be written once this specification is settled.

## 4.2 Effect ranges and the P projection

- The indicative effect range comes from the Library without adjustment. Where the target sub-dimension's confidence is Medium or Low, the card says the range is less certain. The Library's source-confidence ceiling and Intervention Design Handbook 6.4 (Principles 3 and 4) both call for a wider range at lower confidence, as a matter of analyst judgement, and neither gives a figure. The online product therefore states the caution in words and does not widen the range numerically, because any figure would be invented.
- Where the Library's range applies to the whole sub-dimension, the card shows a P projection computed by the engine's `projectImpact` at the low and high ends of the range, and says whether the binding constraint would change.
- Where the range applies to a component or an affected team only (C1-P2, M1-P1 sub-population figure, M1-P2, M2-P2, O1-P2, O5-P1), the card states the range in words and shows no P projection. For M1-P1 the unit-level figure (+2 to +5) is used for the projection.
- Where the Library gives variant-specific ranges, the card shows the range for each common form it lists.

## 4.3 Wording rules

The claims discipline applies to every card and to the simulator.

- Movement is always "could", "indicative" or "plausible", never "will".
- No dollar figures and no percentage returns. Movement is stated in sub-dimension points and P points only.
- Every projection carries the standing line that the model is decision support, that the estimate assumes competent implementation, and that it is not a forecast.
- The product is never described as an engagement survey, and no competitor is named.
- No comparison is made with other organisations until the internal comparison set supports it under Measurement Reference 7.2.

---

# Part 5 - The what-if simulator and action tracking

## 5.1 What-if simulator

The client selects one sub-dimension, sets an assumed score between the current score and 100, and sees the resulting component score, P, and whether the binding constraint changes. The calculation is the engine's `projectImpact` against the unit's latest stored run. The Library's indicative range for the suggested pattern is marked on the slider as a guide.

Version 1 moves one sub-dimension at a time. Combined movements are not additive, and modelling overlap is Intervention Design Workbook work. The simulator says so.

## 5.2 Action tracking

A light record, replacing the analyst-authored intervention module in the earlier portal plan.

- The client marks a suggestion as Considering, Under way, Completed or Set aside, with a start date and an optional note.
- From the next measurement at which the pattern's pace says movement could show, the platform displays the target sub-dimension's movement since the start date against the pattern's indicative range, alongside P.
- The display states that movement cannot be attributed to the action alone.

This is where the subscription closes the loop between acting and measuring, and it is the online equivalent of the measurement of effect that consultancy clients obtain from a re-run Diagnostic.

---

# Part 6 - Guardrails

## 6.1 Patterns that concern a leader's behaviour

C1-P2, M2-P2, O5-P1 and the manager-override form of O1-P1 are keyed in the Library to a specific manager. With no consultant present, the product must not point at a person.

- Card copy is written at the level of leadership practice in the unit. It never names, ranks or infers an individual.
- Team-level results appear only above the display thresholds and only to the account owner and executive viewers.
- These cards direct the client to its own leadership development and HR processes, and to Intervention Design where it wants the design work done for it.
- The administrator's ratings views (Online Measurement Specification Part 7) are a separate, access-logged area. Suggestions draw on ratings only as unit-level aggregates and never refer to a person.

## 6.2 Other guardrails

- Trip-wire cards cannot be dismissed or hidden at unit level.
- Suggestions never draw on open text, which the online route does not collect in v1.
- The product's terms prohibit redistribution of card content.

---

# Part 7 - Reference data

The platform seeds its pattern reference table from the Library (code, sub-dimension, name, effect range, evidence rating, pace). The Library remains the authority. Pace values, as read from the Library on 21 September 2026, are listed here because Part 3.5 depends on them:

| Pace | Patterns |
|---|---|
| Fast | M1-P1, M1-P2, M2-P1, O3-P1, O5-P1, S2-P1 |
| Moderate | C4-P1, M2-P2, O1-P1, O2-P1, O2-P2, S3-P1 |
| Moderate to slow, mixed or decision-gated | C1-P2 (mixed), O1-P2 (moderate to slow), O4-P1 (mixed), O4-P2 (decision-gated) |
| Slow | C1-P1, C2-P1, C2-P2, C3-P1, C3-P2, C5-P1, C5-P2, M3-P1, M4-P1, S1-P1 |

The selection rules in Part 3, the eligibility rules in Part 2 and the sequencing rules in Part 3.5 are pure functions of a stored calculation run and its inputs. They sit in their own package with named fixtures, so a suggestion can always be reproduced from the run that produced it.

---

# Part 8 - Dependencies on the Online Measurement Specification

- The Role-Family Template Library tags each skill as technical or behavioural (needed for the C1 rule) as well as critical or supporting (needed for S1).
- The intake package retains, as aggregates, the item-group means and component scores the rules use: MI1 engagement and team-confidence groups; M-O2-IA items 01 to 03 and 04 to 06; the task-conflict and relationship-conflict groups in TSI-3; per-process friction scores; S1 critical skills with no proficient member; team-level M1, M2 and O5 above threshold.
- These are computed at aggregation as unit-level values. The rules never read the retained individual ratings directly.

---

# Part 9 - Open items

## 9.1 Decisions (confirmed 21 September 2026)
1. **The 8-point materiality margin** (Part 3.1). Confirmed.
2. **Suggestion depth** (Part 2): full for ranks 1 to 3, summary for 4 to 6, on request below that. Confirmed.
3. **Action tracking is in v1** (Part 5.2). Confirmed.
4. **Case sketches are withheld** from the online cards, to keep a clear difference from Offering 2. Confirmed.

## 9.2 Checks at source (completed 21 September 2026)
1. **Effect-range widening.** Intervention Design Handbook 6.4 to 6.6 give no mechanical rule. Principles 3 and 4 make the width of the range a matter of analyst judgement. Part 4.2 stands: the Library range is shown unadjusted with a stated caution at Medium or Low confidence.
2. **Binding-constraint statement.** The Unit-Level Report Spec pastes the statement from the workbook and requires it to match verbatim. The template is the formula in Composite Scoring B45, now quoted in Part 1. The engine returns the string, and it joins the exact-match parity outputs.
3. **Item groups.** MI1: engagement is MI1-01 to MI1-04, team confidence is MI1-05 and MI1-06, pride and commitment is MI1-07 and MI1-08. TSI-3: task conflict is TSI3-01 to TSI3-03, relationship conflict is TSI3-04 and TSI3-05. Written into Part 3.

One stale reference noted for the later propagation pass: Intervention Design Handbook 6.5 Step 8 still says actual movement is compared "via the Tracking Subscription".

## 9.3 Questions for pilot validation
1. How often the signals separate the patterns, and how often the self-check is needed.
2. Whether clients' self-check answers agree with an analyst's Stage 2 conclusion, tested on consultant-led engagements.
3. Whether ranked suggestions lead clients to act on the binding constraint or to pick the easiest item.

---

*End of working draft. Revisions welcome.*
