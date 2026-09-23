import { homeCrumb, PageHeader, Section } from "@/components/page";
import { ReadinessRows } from "@/components/readiness-checks";
import { readinessCopy } from "@/lib/copy/readiness";
import { setupCopy } from "@/lib/copy/setup";
import { fill } from "@/lib/copy/template";
import { requireOrgManager } from "@/lib/org/context";
import { loadSetupState } from "@/lib/setup/state";

/**
 * Setup step 5: the readiness check (PORTAL_BUILD_PLAN.md 7; PORTAL_COPY_SPEC.md S2). Every check
 * with its level, the blockers and warnings named, each linked to where it is fixed. Passing is a
 * moment (UX brief 4.1): the one transition on these screens.
 */
export default async function ReadinessPage({ params }: PageProps<"/org/[orgId]/readiness">) {
  const { orgId } = await params;
  const org = await requireOrgManager(orgId);
  const { readiness } = await loadSetupState(orgId);

  return (
    <main>
      <PageHeader
        crumbs={[
          homeCrumb(),
          { label: org.name },
          { label: setupCopy["organisation.crumb"], href: `/org/${orgId}/setup` },
        ]}
        title={readinessCopy["page.title"]}
        meta={
          <span data-testid="readiness-summary">
            {fill(readinessCopy["summary"], {
              b: readiness.blockers,
              w: readiness.warnings,
              p: readiness.passed,
            })}
          </span>
        }
      >
        <p className="text-grey">{readinessCopy["page.intro"]}</p>
      </PageHeader>

      {readiness.ready ? (
        <div className="relative mb-2 pt-6" data-testid="readiness-passed" role="status">
          <span
            aria-hidden="true"
            className="readiness-rule absolute inset-x-0 top-0 block h-[3px] bg-gold"
          />
          <p className="font-display text-2xl font-medium text-slate">
            {readinessCopy["passed.title"]}
          </p>
          <p className="mt-2 max-w-3xl text-grey">{readinessCopy["passed.body"]}</p>
        </div>
      ) : null}

      <Section>
        <ReadinessRows orgId={orgId} checks={readiness.checks} />
        <p className="mt-6 text-sm text-grey">
          {readiness.ready ? readinessCopy["foot.ready"] : readinessCopy["foot.blocked"]}
        </p>
      </Section>
    </main>
  );
}
