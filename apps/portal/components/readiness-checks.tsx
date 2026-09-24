import { constants } from "@performancevp/intake";
import Link from "next/link";
import type { ReactNode } from "react";

import { Glyph, type GlyphKind } from "@/components/glyph";
import { commonCopy, familyCount, peopleCount, unitCount } from "@/lib/copy/common";
import { contextCopy } from "@/lib/copy/context";
import { fillNodes } from "@/lib/copy/nodes";
import { readinessCopy } from "@/lib/copy/readiness";
import { fill, listOf } from "@/lib/copy/template";
import type { FamilyProblem } from "@/lib/setup/frameworks";
import type {
  CandidateRef,
  Check,
  CheckKey,
  Finding,
  Level,
  Ref,
  UnitRef,
} from "@/lib/setup/readiness";

const SETUP = constants.SETUP;
const LIST_LIMIT = 5;

/** The S2 order, with the Milestone 4 additions beside the checks they belong with. */
export const CHECK_ORDER: readonly CheckKey[] = [
  "units",
  "grouping",
  "managers",
  "leadershipTeam",
  "teamLeaders",
  "teamSize",
  "unitLeader",
  "unitForEveryone",
  "roleFamilies",
  "context",
  "criticalDomain",
  "formalRatings",
  "workEmails",
  "uploadAwaiting",
];

const GLYPHS: Record<Level, GlyphKind> = {
  passed: "passed",
  warning: "warning",
  blocker: "blocker",
  skipped: "skipped",
};

const LINK = "underline underline-offset-4 hover:text-gold-deep";

function familyProblem(problem: FamilyProblem): string {
  switch (problem.kind) {
    case "tooFew":
      return fill(contextCopy["family.problem.tooFew"], { n: problem.n, min: problem.min });
    case "tooMany":
      return fill(contextCopy["family.problem.tooMany"], { n: problem.n, max: problem.max });
    case "noCritical":
      return contextCopy["family.problem.noCritical"];
    case "noTechnical":
      return contextCopy["family.problem.noTechnical"];
    case "noBehavioural":
      return contextCopy["family.problem.noBehavioural"];
  }
}

/** People as links to their records, cut short with a link to the filtered directory. */
function peopleList(orgId: string, people: Ref[], missing: string): ReactNode {
  const shown = people.slice(0, LIST_LIMIT);
  const rest = people.length - shown.length;
  const links = shown.map((p, i) => (
    <span key={p.id}>
      {i > 0 ? (i === shown.length - 1 && rest === 0 ? ` ${commonCopy["list.and"]} ` : ", ") : null}
      <Link className={LINK} href={`/org/${orgId}/directory/people/${p.id}`}>
        {p.name}
      </Link>
    </span>
  ));
  return (
    <>
      {links}
      {rest > 0 ? (
        <>
          {` ${commonCopy["list.and"]} `}
          <Link className={LINK} href={`/org/${orgId}/directory?missing=${missing}`}>
            {fill(commonCopy["list.more"], { n: rest })}
          </Link>
        </>
      ) : null}
    </>
  );
}

function unitLink(href: string, unit: Ref): ReactNode {
  return (
    <Link className={LINK} href={href}>
      {unit.name}
    </Link>
  );
}

const LIST_WORDS = {
  and: commonCopy["list.and"],
  more: (n: number) => fill(commonCopy["list.more"], { n }),
};

/**
 * Where a measurement unit's findings are fixed: its context by measurement unit; the rest on its
 * unit's own screens for a single, and on the units screen's measurement section for a combination
 * (Milestone 4b).
 */
const where = {
  directory: (base: string, unit: UnitRef, missing?: string) =>
    `${base}/directory${
      unit.combined
        ? missing
          ? `?missing=${missing}`
          : ""
        : `?unit=${unit.unitIds[0]}${missing ? `&missing=${missing}` : ""}`
    }`,
  context: (base: string, unit: UnitRef, anchor = "") =>
    `${base}/context/units/${unit.id}${anchor}`,
  leader: (base: string, unit: UnitRef) =>
    unit.combined ? `${base}/units#measurement` : `${base}/units/${unit.unitIds[0]}#leader`,
  measurement: (base: string) => `${base}/units#measurement`,
  teams: (base: string, unit: UnitRef) =>
    unit.combined ? `${base}/units#measurement` : `${base}/units/${unit.unitIds[0]}#teams`,
};

/** The units a unit under 10 could be measured with, each with the total together. */
export function candidateLine(candidate: CandidateRef): string {
  const slots = {
    candidate: candidate.target.name,
    people: peopleCount(candidate.n),
    together: fill(
      readinessCopy[candidate.short ? "candidate.togetherShort" : "candidate.together"],
      { total: candidate.total },
    ),
  };
  return candidate.direction === "aboveGrouping"
    ? fill(readinessCopy["candidate.aboveGrouping"], {
        ...slots,
        parent: candidate.via?.name ?? "",
      })
    : fill(readinessCopy[`candidate.${candidate.direction}`], slots);
}

/** A finding's candidates, where it has any. */
export function findingCandidates(finding: Finding): ReactNode {
  const list =
    finding.kind === "unitShort" ||
    finding.kind === "combinationShort" ||
    finding.kind === "groupingUndecided"
      ? finding.candidates
      : [];
  if (list.length === 0) return null;
  return (
    <ul className="mt-1 space-y-0.5 pl-4 text-grey" data-testid="candidates">
      {list.map((c) => (
        <li key={c.target.id}>{candidateLine(c)}</li>
      ))}
    </ul>
  );
}

/** One finding, worded from the copy module, with its names linked to where each is fixed. */
export function findingLine(orgId: string, finding: Finding): ReactNode {
  const base = `/org/${orgId}`;
  switch (finding.kind) {
    case "unitShort":
      return fillNodes(readinessCopy["units.blocker"], {
        unit: unitLink(where.directory(base, finding.unit), finding.unit),
        n: finding.n,
      });
    case "unitEmpty":
      return fillNodes(readinessCopy["units.empty"], {
        unit: unitLink(`${base}/units/${finding.unit.unitIds[0]}`, finding.unit),
      });
    case "combinationShort":
      return fillNodes(readinessCopy["units.combinationShort"], {
        unit: unitLink(where.measurement(base), finding.unit),
        list: listOf(
          finding.holds.map((u) => u.name),
          LIST_WORDS,
        ),
        people: peopleCount(finding.n),
      });
    case "branchBroken":
      return fillNodes(readinessCopy["units.branchBroken"], {
        unit: unitLink(where.measurement(base), finding.unit),
      });
    case "groupingUndecided":
      return fillNodes(readinessCopy["grouping.undecided"], {
        unit: unitLink(where.measurement(base), finding.unit),
        n: finding.n,
      });
    case "noManager":
      return fillNodes(readinessCopy["managers.noManager"], {
        n: finding.people.length,
        list: peopleList(orgId, finding.people, "manager"),
      });
    case "managerLeft":
      return fillNodes(readinessCopy["managers.left"], {
        n: finding.people.length,
        list: peopleList(orgId, finding.people, "manager"),
      });
    case "noEmail":
      return fillNodes(readinessCopy["workEmails.blocker"], {
        n: finding.people.length,
        list: peopleList(orgId, finding.people, "email"),
      });
    case "noRoleFamily":
      return fillNodes(readinessCopy["roleFamilies.noRoleFamily"], {
        unit: unitLink(where.directory(base, finding.unit, "role_family"), finding.unit),
        n: finding.n,
      });
    case "familyIncomplete":
      return fillNodes(readinessCopy["roleFamilies.family"], {
        family: unitLink(`${base}/context/role-families/${finding.family.id}`, finding.family),
        problems: finding.problems.map(familyProblem).join("; "),
      });
    case "contextIncomplete":
      return fillNodes(readinessCopy["context.blocker"], {
        unit: unitLink(where.context(base, finding.unit), finding.unit),
        missing: finding.parts
          .map(({ part, n }) =>
            part === "processes"
              ? fill(readinessCopy["context.part.processes"], {
                  n,
                  needed: SETUP.criticalProcessesPerUnit,
                })
              : fill(readinessCopy[`context.part.${part}`], {
                  n,
                  ...(part === "domains"
                    ? SETUP.knowledgeDomainsPerUnit
                    : part === "decisions"
                      ? SETUP.decisionTypesPerUnit
                      : SETUP.primarySystemsPerUnit),
                }),
          )
          .join("; "),
      });
    case "noCriticalDomain":
      return fillNodes(readinessCopy["criticalDomain.warning"], {
        unit: unitLink(where.context(base, finding.unit, "#domains"), finding.unit),
      });
    case "leadershipTeam":
      return fillNodes(readinessCopy["leadershipTeam.warning"], {
        unit: unitLink(where.directory(base, finding.unit), finding.unit),
        n: finding.n,
      });
    case "noTeamLeaders":
      return fillNodes(readinessCopy["teamLeaders.warning"], {
        unit: unitLink(where.directory(base, finding.unit), finding.unit),
      });
    case "smallTeams":
      return fillNodes(readinessCopy["teamSize.warning"], {
        unit: unitLink(where.teams(base, finding.unit), finding.unit),
        teams: listOf(
          finding.teams.map((t) => fill(readinessCopy["teamSize.team"], { team: t.name, n: t.n })),
          LIST_WORDS,
        ),
      });
    case "noUnitLeader":
      return finding.candidates > 1
        ? fillNodes(readinessCopy["unitLeader.ambiguous"], {
            unit: unitLink(where.leader(base, finding.unit), finding.unit),
            n: finding.candidates,
          })
        : fillNodes(readinessCopy["unitLeader.none"], {
            unit: unitLink(where.leader(base, finding.unit), finding.unit),
          });
    case "leaderNotFlagged":
      return fillNodes(readinessCopy["unitLeader.notFlagged"], {
        leader: (
          <Link className={LINK} href={`${base}/directory/people/${finding.leader.id}`}>
            {finding.leader.name}
          </Link>
        ),
        unit: unitLink(where.leader(base, finding.unit), finding.unit),
      });
    case "ratingsUndecided":
      return readinessCopy["formalRatings.undecided"];
    case "labelsUnmapped":
      return fill(readinessCopy["formalRatings.unmapped"], {
        list: listOf(finding.labels, {
          and: commonCopy["list.and"],
          more: (n) => fill(commonCopy["list.more"], { n }),
        }),
      });
    case "uploadAwaiting":
      return readinessCopy["uploadAwaiting.warning"];
  }
}

/** A check's line when it passed or was skipped. */
export function passLine(orgId: string, check: Check): ReactNode {
  const pass = check.pass;
  if (pass.key === "waiting") return readinessCopy["waiting.pass"];
  if (check.level === "skipped") return readinessCopy["formalRatings.skipped"];
  switch (pass.key) {
    case "units":
      return fill(readinessCopy["units.pass"], { units: unitCount(pass.n) });
    case "grouping":
      if (pass.kept.length === 0) return readinessCopy["grouping.none"];
      return pass.kept.length === 1
        ? fill(readinessCopy["grouping.keptOne"], { unit: pass.kept[0]!.name })
        : fill(readinessCopy["grouping.keptMany"], {
            list: listOf(
              pass.kept.map((u) => u.name),
              LIST_WORDS,
            ),
          });
    case "unitForEveryone":
      return fill(readinessCopy["unitForEveryone.pass"], { n: pass.n });
    case "managers":
      return pass.head
        ? fillNodes(readinessCopy["managers.passHead"], {
            n: pass.n,
            head: (
              <Link className={LINK} href={`/org/${orgId}/directory/people/${pass.head.id}`}>
                {pass.head.name}
              </Link>
            ),
          })
        : fill(readinessCopy["managers.pass"], { n: pass.n });
    case "workEmails":
      return fill(readinessCopy["workEmails.pass"], { n: pass.n });
    case "roleFamilies":
      return fill(readinessCopy["roleFamilies.pass"], {
        n: pass.units,
        units: unitCount(pass.units),
        families: familyCount(pass.families),
        min: pass.min,
        max: pass.max,
      });
    case "context":
      return fill(readinessCopy["context.pass"], {
        n: pass.units,
        units: unitCount(pass.units),
        processes: SETUP.criticalProcessesPerUnit,
      });
    case "formalRatings":
      return (
        <>
          {fill(readinessCopy["formalRatings.pass"], { n: pass.current })}
          {pass.below.length > 0
            ? ` ${fill(readinessCopy["formalRatings.below"], {
                list: listOf(
                  pass.below.map((u) => u.name),
                  {
                    and: commonCopy["list.and"],
                    more: (n) => fill(commonCopy["list.more"], { n }),
                  },
                ),
              })}`
            : null}
        </>
      );
    case "none": {
      const key = `${check.key}.pass` as const;
      return key in readinessCopy ? readinessCopy[key as keyof typeof readinessCopy] : null;
    }
  }
}

const FIX: Partial<Record<CheckKey, { href: string; label: keyof typeof readinessCopy }>> = {
  units: { href: "units#measurement", label: "fix.units" },
  grouping: { href: "units#measurement", label: "fix.units" },
  managers: { href: "directory?missing=manager", label: "fix.directory" },
  leadershipTeam: { href: "directory", label: "fix.directory" },
  teamLeaders: { href: "directory", label: "fix.directory" },
  teamSize: { href: "units", label: "fix.units" },
  unitLeader: { href: "units", label: "fix.units" },
  roleFamilies: { href: "context", label: "fix.context" },
  context: { href: "context", label: "fix.context" },
  criticalDomain: { href: "context", label: "fix.context" },
  formalRatings: { href: "formal-ratings", label: "fix.formalRatings" },
  workEmails: { href: "directory?missing=email", label: "fix.directory" },
};

/** The rows of the readiness check: glyph and level, the check, its lines, and where to fix it. */
export function ReadinessRows({ orgId, checks }: { orgId: string; checks: readonly Check[] }) {
  const ordered = CHECK_ORDER.map((key) => checks.find((c) => c.key === key)).filter(
    (c): c is Check => c !== undefined,
  );
  return (
    <ul className="border-t border-grey-20" data-testid="readiness-checks">
      {ordered.map((check) => {
        const open = check.level === "blocker" || check.level === "warning";
        const fix =
          check.key === "uploadAwaiting" && check.findings[0]?.kind === "uploadAwaiting"
            ? {
                href: `/org/${orgId}/directory/uploads/${check.findings[0].uploadId}`,
                label: readinessCopy["fix.upload"],
              }
            : FIX[check.key]
              ? {
                  href: `/org/${orgId}/${FIX[check.key]!.href}`,
                  label: readinessCopy[FIX[check.key]!.label],
                }
              : null;
        return (
          <li
            key={check.key}
            className="grid items-start gap-x-6 gap-y-1 border-b border-grey-20 py-4 md:grid-cols-[9rem_14rem_minmax(0,1fr)_auto]"
            data-testid={`check-${check.key}`}
            data-level={check.level}
          >
            <span className="flex items-center gap-2 text-sm text-slate">
              <Glyph kind={GLYPHS[check.level]} />
              {readinessCopy[`level.${check.level}`]}
            </span>
            <span className="text-sm font-medium text-slate">
              {readinessCopy[`check.${check.key}`]}
            </span>
            <div className="space-y-1 text-sm text-slate">
              {open ? (
                check.findings.map((finding, i) => (
                  <div key={i}>
                    <p>{findingLine(orgId, finding)}</p>
                    {findingCandidates(finding)}
                  </div>
                ))
              ) : (
                <p className="text-grey">{passLine(orgId, check)}</p>
              )}
            </div>
            <span className="text-sm">
              {open && fix ? (
                <Link className={`text-slate ${LINK}`} href={fix.href}>
                  {fix.label}
                </Link>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
