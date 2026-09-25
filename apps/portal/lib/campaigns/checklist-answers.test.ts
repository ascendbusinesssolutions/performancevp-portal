import { describe, expect, it } from "vitest";

import { answersFromForm, fieldName, optionOf } from "./checklist-answers";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(entries)) data.set(k, v);
  return data;
}

describe("checklist answers from the form", () => {
  it("reads the role architecture checklist per role family, leaving out what is unanswered", () => {
    const data = form({
      [fieldName("F1", "ra1")]: "yes",
      [fieldName("F1", "ra2")]: "no",
      [fieldName("F2", "ra3")]: "yes",
      [fieldName("F3", "ra1")]: "",
    });
    expect(answersFromForm("ADM-O1", data, ["F1", "F2", "F3"])).toEqual({
      F1: { ra1: true, ra2: false },
      F2: { ra3: true },
    });
  });

  it("reads the tools checklist per system, and refuses an answer outside the choices", () => {
    const data = form({
      [fieldName("S1", "ti1")]: "yes",
      [fieldName("S1", "ti3")]: "partly",
      [fieldName("S1", "int1")]: "not-connected",
    });
    expect(answersFromForm("ADM-O2", data, ["S1"])).toEqual({
      S1: { ti1: true, ti3: "partly", int1: "not-connected" },
    });
    expect(
      answersFromForm("ADM-O2", form({ [fieldName("S1", "ti3")]: "sometimes" }), ["S1"]),
    ).toBeNull();
  });

  it("reads the capacity facts as figures, with the backlog not applicable", () => {
    const data = form({
      utilisationPercent: "108",
      overtimeHoursPerFte: "4,5",
      absenceAboveBaselinePercent: "",
      "backlogChangePercent:na": "on",
      vacancyRatePercent: "4%",
    });
    expect(answersFromForm("ADM-O4", data, [])).toEqual({
      utilisationPercent: 108,
      overtimeHoursPerFte: 4.5,
      backlogChangePercent: "not-applicable",
      vacancyRatePercent: 4,
    });
    expect(answersFromForm("ADM-O4", form({ utilisationPercent: "high" }), [])).toBeNull();
  });

  it("shows stored answers as the form's choices", () => {
    expect([true, false, "partly", 4.5, null].map(optionOf)).toEqual([
      "yes",
      "no",
      "partly",
      "4.5",
      "",
    ]);
  });
});
