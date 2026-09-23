import { redirect } from "next/navigation";

import { ActionForm } from "@/components/action-form";
import { Field, TextLink } from "@/components/ui";
import { requireAccess } from "@/lib/auth/access";
import { authCopy } from "@/lib/copy/auth";
import { consoleCopy } from "@/lib/copy/console";
import { createClient } from "@/lib/supabase/server";

import {
  closeSupportSession,
  designateSupportStaff,
  openSupportSession,
  provisionOrganisation,
  removeSupportStaff,
} from "./actions";

/**
 * The PerformanceVP console (Milestone 3 plan, Section 9): every organisation with its state and
 * term, support sessions, provisioning, and, for the Owner, the support staff. Renewal and lapse
 * screens arrive in Milestone 9; the database already holds and enforces the subscription.
 */
export default async function ConsolePage() {
  const access = await requireAccess();
  if (!access.isOwner && !access.isSupportStaff) redirect("/");
  const supabase = await createClient();

  const [{ data: organisations }, { data: bands }, { data: staff }] = await Promise.all([
    supabase.rpc("staff_organisations"),
    supabase.from("ref_employee_bands").select("code, label").order("sort_order"),
    access.isOwner
      ? supabase
          .from("profiles")
          .select("id, email, full_name")
          .eq("is_support_staff", true)
          .order("email")
      : Promise.resolve({
          data: [] as Array<{ id: string; email: string; full_name: string | null }>,
        }),
  ]);

  return (
    <main className="mt-10 space-y-14">
      <h1 className="font-display text-3xl font-medium text-slate">{consoleCopy["pvp.title"]}</h1>

      <section>
        <h2 className="font-display text-xl text-slate">{consoleCopy["pvp.organisations"]}</h2>
        <p className="mt-2 text-sm text-grey">{consoleCopy["pvp.session.note"]}</p>
        <table className="mt-4 w-full border-collapse text-left text-sm">
          <thead className="text-grey">
            <tr className="border-b border-grey-20">
              <th className="py-2 font-normal">{consoleCopy["pvp.col.name"]}</th>
              <th className="py-2 font-normal">{consoleCopy["pvp.col.state"]}</th>
              <th className="py-2 font-normal">{consoleCopy["pvp.col.band"]}</th>
              <th className="py-2 font-normal">{consoleCopy["pvp.col.term"]}</th>
              <th className="py-2 font-normal">{consoleCopy["pvp.col.session"]}</th>
            </tr>
          </thead>
          <tbody>
            {(organisations ?? []).map((o) => (
              <tr key={o.organisation_id} className="border-b border-grey-20 align-top">
                <td className="py-3 text-slate">{o.name}</td>
                <td className="py-3 text-grey">
                  {authCopy[`state.${o.state}` as keyof typeof authCopy] ?? o.state}
                </td>
                <td className="py-3 font-mono text-grey">{o.employee_band}</td>
                <td className="py-3 font-mono text-grey">{o.period_end}</td>
                <td className="py-3">
                  {o.open_session_id ? (
                    <div className="space-y-2">
                      <TextLink href={`/org/${o.organisation_id}/access`}>
                        {consoleCopy["pvp.session.view"]}
                      </TextLink>
                      <ActionForm
                        action={closeSupportSession}
                        submitLabel={consoleCopy["pvp.session.closeButton"]}
                        compact
                      >
                        <input type="hidden" name="sessionId" value={o.open_session_id} />
                      </ActionForm>
                    </div>
                  ) : (
                    <ActionForm
                      action={openSupportSession}
                      submitLabel={consoleCopy["pvp.session.openButton"]}
                      compact
                    >
                      <input type="hidden" name="organisationId" value={o.organisation_id} />
                      <Field label={consoleCopy["pvp.session.reason"]} name="reason" />
                    </ActionForm>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="max-w-md">
        <h2 className="font-display text-xl text-slate">{consoleCopy["pvp.provision.title"]}</h2>
        {bands && bands.length > 0 ? (
          <ActionForm
            action={provisionOrganisation}
            submitLabel={consoleCopy["pvp.provision.submit"]}
            className="mt-4"
          >
            <div className="space-y-4">
              <Field label={consoleCopy["pvp.provision.name"]} name="name" />
              <label className="block">
                <span className="block text-sm text-grey">{consoleCopy["pvp.provision.band"]}</span>
                <select
                  name="band"
                  required
                  className="mt-1 block w-full border border-grey-40 bg-white px-3 py-2 text-slate"
                >
                  {bands.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </label>
              <Field label={consoleCopy["pvp.provision.start"]} name="periodStart" type="date" />
              <Field label={consoleCopy["pvp.provision.end"]} name="periodEnd" type="date" />
              <Field
                label={consoleCopy["pvp.provision.agreement"]}
                name="agreementDate"
                type="date"
              />
              <Field label={consoleCopy["pvp.provision.invoice"]} name="invoiceReference" />
              <Field
                label={consoleCopy["pvp.provision.owner"]}
                name="accountOwnerEmail"
                type="email"
              />
            </div>
          </ActionForm>
        ) : (
          <p className="mt-4 text-sm text-grey">{consoleCopy["pvp.provision.noBands"]}</p>
        )}
      </section>

      {access.isOwner ? (
        <section className="max-w-md">
          <h2 className="font-display text-xl text-slate">{consoleCopy["pvp.staff.title"]}</h2>
          {(staff ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-grey">{consoleCopy["pvp.staff.none"]}</p>
          ) : (
            <ul className="mt-3">
              {(staff ?? []).map((s) => (
                <li
                  key={s.id}
                  className="flex items-baseline justify-between border-b border-grey-20 py-2 text-sm"
                >
                  <span className="text-slate">{s.full_name ?? s.email}</span>
                  <ActionForm
                    action={removeSupportStaff}
                    submitLabel={consoleCopy["pvp.staff.remove"]}
                    compact
                  >
                    <input type="hidden" name="userId" value={s.id} />
                  </ActionForm>
                </li>
              ))}
            </ul>
          )}
          <ActionForm
            action={designateSupportStaff}
            submitLabel={consoleCopy["pvp.staff.designate"]}
            className="mt-6"
          >
            <Field label={consoleCopy["pvp.staff.email"]} name="email" type="email" />
          </ActionForm>
        </section>
      ) : null}
    </main>
  );
}
