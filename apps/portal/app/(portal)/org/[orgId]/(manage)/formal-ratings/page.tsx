import { evaluateFormalRatings, isCurrent } from "@performancevp/intake";

import { ActionForm } from "@/components/action-form";
import { RadioGroup } from "@/components/fields";
import { homeCrumb, PageHeader, Section } from "@/components/page";
import { Head, Row, Table, Td, Th } from "@/components/table";
import { CONTROL_CLASS } from "@/components/ui";
import { ratingsMapCopy } from "@/lib/copy/ratings-map";
import { setupCopy } from "@/lib/copy/setup";
import { fill } from "@/lib/copy/template";
import { sydneyToday } from "@/lib/dates";
import { requireOrgManager } from "@/lib/org/context";
import {
  headcountByUnit,
  loadActivePeople,
  loadFormalRatingsForCheck,
  loadScaleMap,
  loadUnits,
} from "@/lib/setup/data";
import { unitSnapshot } from "@/lib/setup/snapshot";
import { unitTree } from "@/lib/setup/units";
import { createClient } from "@/lib/supabase/server";

import { saveMapping, skipMapping } from "./actions";

const BANDS = [5, 4, 3, 2, 1] as const;

/**
 * Setup step 4, optional: the formal ratings mapping (Online Measurement Specification 6.4). The
 * labels found in the directory with how many people hold each and how many are dated within 12
 * months, mapped onto the five talent bands, with the calibration declaration; or the step
 * skipped. Each unit's route is previewed with the intake package's own evaluateFormalRatings on
 * the live directory. The ratings are read through the logged function (as a check); only counts
 * reach the page.
 */
export default async function FormalRatingsPage({
  params,
}: PageProps<"/org/[orgId]/formal-ratings">) {
  const { orgId } = await params;
  const org = await requireOrgManager(orgId);
  const supabase = await createClient();
  const [ratings, map, people, units] = await Promise.all([
    loadFormalRatingsForCheck(supabase, orgId),
    loadScaleMap(supabase, orgId),
    loadActivePeople(supabase, orgId),
    loadUnits(supabase, orgId),
  ]);
  const today = sydneyToday();
  const activeIds = new Set(people.map((p) => p.id));
  const held = ratings.filter((r) => activeIds.has(r.employee_id));

  const labels = [...new Set(held.map((r) => r.rating_label))].sort((a, b) =>
    a.localeCompare(b, "en-AU"),
  );
  const bandOf = new Map((map?.entries ?? []).map((e) => [e.label, e.band]));
  const counts = headcountByUnit(people);
  const staffed = unitTree(units).filter((e) => (counts.get(e.unit.id) ?? 0) > 0);
  const decision =
    map === null
      ? ratingsMapCopy["decision.none"]
      : map.decision === "skipped"
        ? ratingsMapCopy["decision.skipped"]
        : fill(ratingsMapCopy["decision.mapped"], {
            calibration: map.calibrated
              ? ratingsMapCopy["decision.calibrated"]
              : ratingsMapCopy["decision.notCalibrated"],
          });

  return (
    <main>
      <PageHeader
        crumbs={[
          homeCrumb(),
          { label: org.name },
          { label: setupCopy["organisation.crumb"], href: `/org/${orgId}/setup` },
        ]}
        title={ratingsMapCopy["page.title"]}
        meta={<span data-testid="mapping-decision">{decision}</span>}
      >
        <p className="text-grey">{ratingsMapCopy["page.intro"]}</p>
      </PageHeader>

      <Section title={ratingsMapCopy["rules.title"]}>
        <div className="max-w-3xl space-y-2 text-slate">
          <p>{ratingsMapCopy["rules.currency"]}</p>
          <p>{ratingsMapCopy["rules.coverage"]}</p>
          <p>{ratingsMapCopy["rules.acceptance"]}</p>
        </div>
      </Section>

      {labels.length === 0 ? (
        <Section title={ratingsMapCopy["none.title"]}>
          <p className="max-w-3xl text-slate">{ratingsMapCopy["none.body"]}</p>
        </Section>
      ) : (
        <>
          <Section
            id="labels"
            title={ratingsMapCopy["labels.title"]}
            intro={ratingsMapCopy["labels.intro"]}
          >
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <ActionForm
                action={saveMapping}
                submitLabel={ratingsMapCopy["save"]}
                className="space-y-8"
              >
                <input type="hidden" name="organisationId" value={orgId} />
                <Table testId="labels">
                  <Head>
                    <Th>{ratingsMapCopy["labels.col.label"]}</Th>
                    <Th align="right">{ratingsMapCopy["labels.col.people"]}</Th>
                    <Th align="right">{ratingsMapCopy["labels.col.current"]}</Th>
                    <Th>{ratingsMapCopy["labels.col.band"]}</Th>
                  </Head>
                  <tbody>
                    {labels.map((label, i) => {
                      const withLabel = held.filter((r) => r.rating_label === label);
                      return (
                        <Row key={label} middle>
                          <Td>
                            <input type="hidden" name={`label_${i}`} value={label} />
                            {label}
                          </Td>
                          <Td figure align="right">
                            {withLabel.length}
                          </Td>
                          <Td figure align="right">
                            {withLabel.filter((r) => isCurrent(r.rating_date, today)).length}
                          </Td>
                          <Td>
                            <select
                              name={`band_${i}`}
                              defaultValue={String(bandOf.get(label) ?? "")}
                              aria-label={`${ratingsMapCopy["labels.col.band"]} ${label}`}
                              className={`${CONTROL_CLASS} min-w-64`}
                              disabled={!org.writable}
                            >
                              <option value="">{ratingsMapCopy["labels.unmapped"]}</option>
                              {BANDS.map((band) => (
                                <option key={band} value={band}>
                                  {fill(ratingsMapCopy["labels.bandOption"], {
                                    band,
                                    name: ratingsMapCopy[`band.${band}.name`],
                                  })}
                                </option>
                              ))}
                            </select>
                          </Td>
                        </Row>
                      );
                    })}
                  </tbody>
                </Table>
                <RadioGroup
                  legend={ratingsMapCopy["calibrated.legend"]}
                  name="calibrated"
                  defaultValue={
                    map?.decision === "mapped" ? (map.calibrated ? "yes" : "no") : undefined
                  }
                  disabled={!org.writable}
                  options={[
                    { value: "yes", label: ratingsMapCopy["calibrated.yes"] },
                    { value: "no", label: ratingsMapCopy["calibrated.no"] },
                  ]}
                />
              </ActionForm>
              <aside>
                <h3 className="text-xs font-medium tracking-[0.08em] text-grey uppercase">
                  {ratingsMapCopy["guide.title"]}
                </h3>
                <dl className="mt-3 space-y-3 text-sm">
                  {BANDS.map((band) => (
                    <div key={band}>
                      <dt className="font-medium text-slate">
                        <span className="font-mono">{band}</span>{" "}
                        {ratingsMapCopy[`band.${band}.name`]}
                      </dt>
                      <dd className="text-grey">{ratingsMapCopy[`band.${band}.description`]}</dd>
                    </div>
                  ))}
                </dl>
              </aside>
            </div>
          </Section>

          {map?.decision === "mapped" ? (
            <Section
              id="units"
              title={ratingsMapCopy["units.title"]}
              intro={ratingsMapCopy["units.intro"]}
            >
              <Table testId="unit-routes">
                <Head>
                  <Th>{ratingsMapCopy["units.col.unit"]}</Th>
                  <Th align="right">{ratingsMapCopy["units.col.coverage"]}</Th>
                  <Th>{ratingsMapCopy["units.col.route"]}</Th>
                </Head>
                <tbody>
                  {staffed.map(({ unit }) => {
                    const result = evaluateFormalRatings(
                      { scaleMap: map.entries, calibrated: map.calibrated === true },
                      unitSnapshot(unit.id, people, held),
                      today,
                    );
                    return (
                      <Row key={unit.id} testId={`route-${unit.unit_code}`}>
                        <Td>{unit.name}</Td>
                        <Td figure align="right">
                          {fill(ratingsMapCopy["units.coverage"], {
                            pct: Math.floor((result?.coverage ?? 0) * 100),
                          })}
                        </Td>
                        <Td>
                          {result?.qualifies
                            ? `${ratingsMapCopy["units.route.formal"]}, ${
                                result.treatment === "as-declared"
                                  ? ratingsMapCopy["units.treatment.asDeclared"]
                                  : ratingsMapCopy["units.treatment.capped"]
                              }`
                            : ratingsMapCopy["units.route.managers"]}
                        </Td>
                      </Row>
                    );
                  })}
                </tbody>
              </Table>
            </Section>
          ) : null}
        </>
      )}

      {org.writable && map?.decision !== "skipped" ? (
        <Section id="skip" title={ratingsMapCopy["skip.title"]} intro={ratingsMapCopy["skip.body"]}>
          <ActionForm
            action={skipMapping}
            submitLabel={ratingsMapCopy["skip.submit"]}
            variant="secondary"
          >
            <input type="hidden" name="organisationId" value={orgId} />
          </ActionForm>
        </Section>
      ) : null}
    </main>
  );
}
