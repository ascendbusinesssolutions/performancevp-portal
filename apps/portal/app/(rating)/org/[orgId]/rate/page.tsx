import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader, Section } from "@/components/page";
import { RatingBar } from "@/components/rating-bar";
import { requireAccess } from "@/lib/auth/access";
import { dayLabel } from "@/lib/campaigns/calendar";
import { asCadence } from "@/lib/campaigns/cadence";
import { cadenceName } from "@/lib/campaigns/display";
import { managerCopy } from "@/lib/copy/manager";
import { fill } from "@/lib/copy/template";
import { createClient } from "@/lib/supabase/server";

const LINK = "text-slate underline underline-offset-4 hover:text-gold-deep";

interface OpenForm {
  campaignId: string;
  name: string | null;
  cadence: string;
  eventTrigger: string | null;
  closesAt: string;
}

/**
 * A manager's open rating forms in one organisation. There is usually one, which opens directly.
 */
export default async function RatingIndex({ params }: PageProps<"/org/[orgId]/rate">) {
  const { orgId } = await params;
  const access = await requireAccess();
  const membership = access.memberships.find(
    (m) => m.organisationId === orgId && m.role === "manager_respondent",
  );
  if (!membership) redirect("/");
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_rating_campaigns", { p_organisation_id: orgId });
  const forms = (data ?? []) as unknown as OpenForm[];
  if (forms.length === 1) redirect(`/org/${orgId}/rate/${forms[0]!.campaignId}`);

  return (
    <>
      <RatingBar
        organisation={membership.organisationName}
        person={access.fullName ?? access.email}
      />
      <div className="mx-auto max-w-[1160px] px-6 pb-24">
        <PageHeader title={managerCopy["index.title"]} />
        <Section>
          {forms.length === 0 ? (
            <p className="text-grey">{managerCopy["index.none"]}</p>
          ) : (
            <ul className="space-y-3">
              {forms.map((f) => (
                <li key={f.campaignId}>
                  <Link className={LINK} href={`/org/${orgId}/rate/${f.campaignId}`}>
                    {fill(managerCopy["index.row"], {
                      campaign:
                        f.name ?? cadenceName(asCadence(f.cadence) ?? "baseline", f.eventTrigger),
                      date: dayLabel(f.closesAt),
                    })}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
