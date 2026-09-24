import { describe, expect, it } from "vitest";

import { lintString } from "./lint";

// The rules themselves. copy.test.ts runs them over every copy table, fixture and email template.
describe("lintString", () => {
  it("catches each rule", () => {
    const rules = (text: string) => lintString("k", text).map((p) => p.rule);
    expect(rules("Clarity — then speed")).toContain("em dash");
    expect(rules("This change will lift the index.")).toContain('"will" about movement');
    expect(rules("Worth $40,000 a year.")).toContain("dollar figure or percentage return");
    expect(rules("A 12% return on the programme.")).toContain("dollar figure or percentage return");
    expect(rules("Not an engagement survey.")).toContain('"engagement survey"');
    expect(rules("Unlike Culture Amp, this measures units.")).toContain(
      "competitor name: Culture Amp",
    );
    expect(rules("O1 is the constraint.")).toContain("sub-dimension code outside the footer");
    expect(rules("The organization changed.")).toContain("American spelling: organization");
    expect(rules("A seamless setup.")).toContain("banned word: seamless");
  });

  it("allows what the rules allow", () => {
    expect(lintString("k", "You will be asked to set up an authenticator.")).toEqual([]);
    expect(lintString("k", "Enrolled staff can sign in.")).toEqual([]);
    expect(lintString("k", "O1 structural 72.", { footer: true })).toEqual([]);
  });
});
