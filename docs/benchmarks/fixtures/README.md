# Portal parity fixtures from the Diagnostic Workbook

`2026-09-21-gap-rule-and-blank-inputs.json` holds 50 scenarios. Each has its inputs, written as edits to the Northwind Mutual worked example stored in the production workbook, and the outputs Microsoft Excel 16.113.1 computed:

- **before:** under archive v5
- **after:** under the corrected production workbook of 21 September 2026

The portal engine should reproduce the **after** outputs. The **before** outputs are kept to show what each change moved.

Each output block holds:
- the key sub-dimension, layer, gap and flag cells;
- C, M, O, the Synergy internal score, S and P;
- the reallocated weight sum for each component;
- the top six of the priority ranking;
- any error cells;
- the raw values as Excel stored them (17 significant digits).

The scenarios cover:
- the perception-only gap rule for O1, O2 and O3, including gaps of exactly 15 and of 15.01;
- the false-consensus guard;
- partial entry and unset routes under the blank-input rule;
- the confidence bands and P confidence;
- the priority block when P is blank;
- the exclusions summary;
- the response-rate token;
- the critical-findings text when trip-wires are unmeasured.

## Excel comparison behaviour the engine must reproduce

Excel does not compare numbers at full IEEE double precision. In scenario `a_nominal15_real`:
- the structural layer is 75;
- the perception item means are chosen to give a nominal 60, but the stored perception score is 59.999999999999986;
- the stored gap is therefore 15.000000000000014.

Excel evaluates `ABS(gap)>15` as FALSE for that value. The gap flag stays blank, and O1 is the mean of the two layers (67.5). A strict IEEE comparison in the engine would evaluate it as TRUE, fire the flag and use the perception score, breaking parity.

The engine must reproduce Excel's result wherever a threshold is compared against an unrounded computed value. These comparisons are:
- the gap rules (greater than 15);
- the trip-wires (below 60);
- false consensus (below 60, above 75);
- the Green, Amber and Red bands (above 75, at least 50);
- the S and P range checks;
- the binding-component tie order.

An explicit, documented rounding rule applied before each comparison would achieve this. A tolerance whose width is not tied to Excel's behaviour would not. Integer comparisons (DATEDIF months, sample counts) and comparisons on raw inputs are unaffected.

A related presentation point: bands and trip-wires are decided on unrounded scores, but deliverables print whole numbers. A score of 74.6 prints as 75 and is Amber, and a trip-wire of 59.6 prints as 60 and is a critical finding.
