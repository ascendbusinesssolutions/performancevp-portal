import Link from "next/link";

import { LinkButton } from "@/components/button";
import { Glyph, type GlyphKind } from "@/components/glyph";
import { homeCrumb, PageHeader, Section } from "@/components/page";
import { findingLine } from "@/components/readiness-checks";
import { commonCopy } from "@/lib/copy/common";
import { setupCopy } from "@/lib/copy/setup";
import { fill, listOf } from "@/lib/copy/template";
import { requireOrgManager } from "@/lib/org/context";
import { loadSetupState, type SetupState, type Step, type StepState } from "@/lib/setup/state";

const GLYPHS: Record<StepState, GlyphKind> = {
  done: "passed",
  next: "next",
  todo: "todo",
  skipped: "skipped",
  locked: "locked",
};

function day(value: string): string {
  return new Date(value).toLocaleDateString("en-AU", {
    dateStyle: "medium",
    timeZone: "Australia/Sydney",
  });
}

/** The S1 status line for each step (PORTAL_COPY_SPEC.md S1). */
function statusLine(step: Step, state: SetupState): string {
  const measured = state.readiness.measured.length;
  switch (step.key) {
    case "organisation": {
      const count = state.units.filter((u) => u.status === "active").length;
      return count > 0 ? fill(setupCopy["status.units"], { count }) : setupCopy["status.noUnits"];
    }
    case "directory":
      if (state.people.length === 0) return setupCopy["status.noPeople"];
      return state.lastUpload
        ? fill(setupCopy["status.people"], {
            n: state.people.length,
            date: day(state.lastUpload.uploaded_at),
          })
        : fill(setupCopy["status.peopleNoUpload"], { n: state.people.length });
    case "context":
      if (measured === 0) return setupCopy["status.contextWaiting"];
      return state.contextRemaining.length > 0
        ? fill(setupCopy["status.context"], {
            done: state.contextDone,
            total: measured,
            remaining: listOf(state.contextRemaining, {
              and: commonCopy["list.and"],
              more: (n) => fill(commonCopy["list.more"], { n }),
            }),
          })
        : fill(setupCopy["status.contextDone"], { done: state.contextDone, total: measured });
    case "formalRatings":
      if (state.formal.decision === "skipped") return setupCopy["status.formalSkipped"];
      if (state.formal.held === 0) return setupCopy["status.formalNone"];
      if (step.state === "done")
        return fill(setupCopy["status.formalMapped"], { n: state.formal.current });
      return setupCopy["status.formalUndecided"];
    case "readiness":
      if (state.readiness.ready) return setupCopy["status.passed"];
      return state.readiness.blockers === 1
        ? setupCopy["status.oneBlocker"]
        : fill(setupCopy["status.blockers"], { n: state.readiness.blockers });
    case "campaign":
      return state.readiness.ready
        ? setupCopy["status.campaignReady"]
        : setupCopy["status.campaignLocked"];
  }
}

/**
 * The setup hub (UX brief 4.1; the setup mockup): the six steps as rows, each with a status glyph,
 * the step name, its S1 status line and an action on the right; the blockers in a bordered box
 * beneath; and one "Continue setup" button to the next step. Everything is derived from the data,
 * so leaving and returning needs nothing stored.
 */
export default async function SetupPage({ params }: PageProps<"/org/[orgId]/setup">) {
  const { orgId } = await params;
  const org = await requireOrgManager(orgId);
  const state = await loadSetupState(orgId);
  const next = state.steps.find((s) => s.state === "next" && s.key !== "campaign");
  const blockers = state.readiness.checks
    .filter((c) => c.level === "blocker")
    .flatMap((c) => c.findings);

  return (
    <main>
      <PageHeader crumbs={[homeCrumb(), { label: org.name }]} title={setupCopy["hub.title"]}>
        <p className="text-grey">{setupCopy["hub.intro"]}</p>
      </PageHeader>

      <Section>
        <ol aria-label={setupCopy["hub.stepsLabel"]} data-testid="setup-steps">
          {state.steps.map((step) => (
            <li
              key={step.key}
              className="grid grid-cols-[1.5rem_minmax(0,14rem)_minmax(0,1fr)_auto] items-baseline gap-x-6 border-b border-grey-20 py-4 first:border-t"
              data-testid={`step-${step.key}`}
              data-state={step.state}
            >
              <span className="self-center">
                <Glyph kind={GLYPHS[step.state]} />
              </span>
              <span className="font-medium text-slate">
                {setupCopy[`step.${step.key}`]}
                <span className="sr-only">
                  {", "}
                  {setupCopy[`hub.state.${step.state}`]}
                </span>
              </span>
              <span className="text-sm text-grey" data-testid={`status-${step.key}`}>
                {statusLine(step, state)}
              </span>
              <span className="text-sm">
                {step.state === "locked" ? null : (
                  <Link
                    className="text-slate underline underline-offset-4 hover:text-gold-deep"
                    href={step.href}
                    aria-label={`${setupCopy["hub.open"]} ${setupCopy[`step.${step.key}`]}`}
                  >
                    {setupCopy["hub.open"]}
                  </Link>
                )}
              </span>
            </li>
          ))}
        </ol>

        {blockers.length > 0 ? (
          <div className="mt-8 border border-grey-40 p-6" data-testid="setup-blockers">
            <h2 className="flex items-center gap-2 font-display text-lg font-medium text-slate">
              <Glyph kind="blocker" />
              {setupCopy["hub.blockers.title"]}
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-slate">
              {blockers.slice(0, 8).map((finding, i) => (
                <li key={i}>{findingLine(orgId, finding)}</li>
              ))}
            </ul>
            <p className="mt-4 text-sm">
              <Link
                className="text-slate underline underline-offset-4 hover:text-gold-deep"
                href={`/org/${orgId}/readiness`}
              >
                {setupCopy["hub.blockers.more"]}
              </Link>
            </p>
          </div>
        ) : null}

        {next ? (
          <div className="mt-8">
            <LinkButton href={next.href}>{setupCopy["hub.continue"]}</LinkButton>
          </div>
        ) : null}
      </Section>
    </main>
  );
}
