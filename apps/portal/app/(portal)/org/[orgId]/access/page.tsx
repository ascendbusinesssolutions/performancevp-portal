import { redirect } from "next/navigation";

import { ActionForm } from "@/components/action-form";
import { Field, Notice } from "@/components/ui";
import { requireAccess } from "@/lib/auth/access";
import { authCopy } from "@/lib/copy/auth";
import { consoleCopy } from "@/lib/copy/console";
import { createClient } from "@/lib/supabase/server";

import {
  inviteMember,
  resetAuthenticator,
  revokeMembership,
  setContributionOptOut,
  setUnitAccess,
} from "./actions";

const GRANTABLE_ROLES = ["administrator", "executive_viewer", "unit_viewer"] as const;

function when(value: string): string {
  return new Date(value).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });
}

/**
 * The account owner's access page (Milestone 3 plan, Section 9): the subscription, the research
 * dataset opt-out, the people with access and their unit scopes, invitations, and every
 * PerformanceVP support session with what was done in it (PORTAL_COPY_SPEC.md A2 and A3).
 * Administrators and staff under a session see it without the account owner's controls.
 */
export default async function AccessPage({ params }: PageProps<"/org/[orgId]/access">) {
  const { orgId } = await params;
  const access = await requireAccess();
  const membership = access.memberships.filter((m) => m.organisationId === orgId);
  const isAccountOwner = membership.some((m) => m.role === "account_owner");
  const isAdministrator = membership.some((m) => m.role === "administrator");
  const inSession = access.openSupportSessions.some((s) => s.organisationId === orgId);
  if (!isAccountOwner && !isAdministrator && !inSession) redirect("/");
  const state = membership[0]?.state;

  const supabase = await createClient();
  const [organisation, subscription, memberships, invitations, unitAccess, units, sessions, trail] =
    await Promise.all([
      supabase
        .from("organisations")
        .select("name, data_contribution_opt_out")
        .eq("id", orgId)
        .maybeSingle(),
      supabase
        .from("subscriptions")
        .select("employee_band, period_start, period_end")
        .eq("organisation_id", orgId)
        .order("period_start", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("org_memberships")
        .select("id, user_id, role")
        .eq("organisation_id", orgId)
        .is("revoked_at", null)
        .neq("role", "manager_respondent")
        .order("role"),
      supabase
        .from("membership_invitations")
        .select("id, email, role")
        .eq("organisation_id", orgId)
        .is("claimed_at", null),
      supabase.from("unit_access").select("membership_id, unit_id").eq("organisation_id", orgId),
      supabase
        .from("business_units")
        .select("id, name, unit_code")
        .eq("organisation_id", orgId)
        .eq("status", "active")
        .order("name"),
      supabase
        .from("support_sessions")
        .select("id, staff_name, kind, reason, started_at, expires_at, ended_at")
        .eq("organisation_id", orgId)
        .order("started_at", { ascending: false }),
      supabase
        .from("audit_logs")
        .select("id, support_session_id, action, entity_type, changed_columns, occurred_at")
        .eq("organisation_id", orgId)
        .not("support_session_id", "is", null)
        .order("occurred_at"),
    ]);

  const userIds = (memberships.data ?? []).map((m) => m.user_id);
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, email, full_name").in("id", userIds)
    : { data: [] as Array<{ id: string; email: string; full_name: string | null }> };
  const person = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? p.email]));
  const unitName = new Map((units.data ?? []).map((u) => [u.id, u.name]));
  const scopes = (membershipId: string) =>
    (unitAccess.data ?? []).filter((a) => a.membership_id === membershipId).map((a) => a.unit_id);

  return (
    <main className="mt-10 space-y-14">
      <div>
        <p className="text-sm text-grey">{organisation.data?.name}</p>
        <h1 className="font-display text-3xl font-medium text-slate">
          {consoleCopy["access.title"]}
        </h1>
      </div>

      {state === "grace" ? <Notice tone="problem">{consoleCopy["access.grace"]}</Notice> : null}
      {state === "suspended" ? (
        <Notice tone="problem">{consoleCopy["access.suspended"]}</Notice>
      ) : null}

      {subscription.data ? (
        <section>
          <h2 className="font-display text-xl text-slate">{consoleCopy["access.subscription"]}</h2>
          <dl className="mt-4 grid max-w-md grid-cols-[max-content_1fr] gap-x-8 gap-y-2 text-sm">
            <dt className="text-grey">{consoleCopy["access.band"]}</dt>
            <dd className="font-mono text-slate">{subscription.data.employee_band}</dd>
            <dt className="text-grey">{consoleCopy["access.term"]}</dt>
            <dd className="font-mono text-slate">
              {subscription.data.period_start} to {subscription.data.period_end}
            </dd>
            {state ? (
              <>
                <dt className="text-grey">{consoleCopy["access.state"]}</dt>
                <dd className="text-slate">{authCopy[`state.${state}`]}</dd>
              </>
            ) : null}
          </dl>
        </section>
      ) : null}

      <section className="max-w-2xl">
        <h2 className="font-display text-xl text-slate">
          {consoleCopy["access.contribution.title"]}
        </h2>
        <p className="mt-2 text-sm text-grey">
          {organisation.data?.data_contribution_opt_out
            ? consoleCopy["access.contribution.off"]
            : consoleCopy["access.contribution.on"]}
        </p>
        {isAccountOwner ? (
          <ActionForm
            action={setContributionOptOut}
            submitLabel={
              organisation.data?.data_contribution_opt_out
                ? consoleCopy["access.contribution.optIn"]
                : consoleCopy["access.contribution.optOut"]
            }
            compact
            className="mt-3"
          >
            <input type="hidden" name="organisationId" value={orgId} />
            <input
              type="hidden"
              name="optOut"
              value={organisation.data?.data_contribution_opt_out ? "false" : "true"}
            />
          </ActionForm>
        ) : null}
      </section>

      <section>
        <h2 className="font-display text-xl text-slate">{consoleCopy["access.people.title"]}</h2>
        <table className="mt-4 w-full border-collapse text-left text-sm">
          <thead className="text-grey">
            <tr className="border-b border-grey-20">
              <th className="py-2 font-normal">{consoleCopy["access.people.col.person"]}</th>
              <th className="py-2 font-normal">{consoleCopy["access.people.col.role"]}</th>
              <th className="py-2 font-normal">{consoleCopy["access.people.col.units"]}</th>
              <th className="py-2 font-normal" />
            </tr>
          </thead>
          <tbody>
            {(memberships.data ?? []).map((m) => (
              <tr key={m.id} className="border-b border-grey-20 align-top">
                <td className="py-3 text-slate">{person.get(m.user_id)}</td>
                <td className="py-3 text-grey">
                  {authCopy[`role.${m.role}` as keyof typeof authCopy]}
                </td>
                <td className="py-3 text-grey">
                  {m.role === "unit_viewer" && isAccountOwner ? (
                    <ActionForm
                      action={setUnitAccess}
                      submitLabel={consoleCopy["access.people.setUnits"]}
                      compact
                    >
                      <input type="hidden" name="organisationId" value={orgId} />
                      <input type="hidden" name="membershipId" value={m.id} />
                      {(units.data ?? []).map((u) => (
                        <label key={u.id} className="block">
                          <input
                            type="checkbox"
                            name="units"
                            value={u.id}
                            defaultChecked={scopes(m.id).includes(u.id)}
                          />{" "}
                          {u.name}
                        </label>
                      ))}
                    </ActionForm>
                  ) : m.role === "unit_viewer" ? (
                    scopes(m.id)
                      .map((id) => unitName.get(id))
                      .join(", ")
                  ) : (
                    consoleCopy["access.people.allUnits"]
                  )}
                </td>
                <td className="space-y-3 py-3">
                  {isAccountOwner && m.role !== "account_owner" ? (
                    <ActionForm
                      action={revokeMembership}
                      submitLabel={consoleCopy["access.people.revoke"]}
                      compact
                    >
                      <input type="hidden" name="organisationId" value={orgId} />
                      <input type="hidden" name="membershipId" value={m.id} />
                    </ActionForm>
                  ) : null}
                  {isAccountOwner && m.user_id !== access.userId ? (
                    <ActionForm
                      action={resetAuthenticator}
                      submitLabel={consoleCopy["access.people.reset"]}
                      compact
                    >
                      <input type="hidden" name="organisationId" value={orgId} />
                      <input type="hidden" name="userId" value={m.user_id} />
                      <Field
                        label={consoleCopy["access.people.resetCode"]}
                        name="code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                      />
                    </ActionForm>
                  ) : null}
                </td>
              </tr>
            ))}
            {(invitations.data ?? []).map((i) => (
              <tr key={i.id} className="border-b border-grey-20 text-grey">
                <td className="py-3">{i.email}</td>
                <td className="py-3">{authCopy[`role.${i.role}` as keyof typeof authCopy]}</td>
                <td className="py-3" colSpan={2}>
                  {consoleCopy["access.people.pending"]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isAccountOwner ? (
          <p className="mt-3 text-sm text-grey">{consoleCopy["access.people.resetNote"]}</p>
        ) : null}
      </section>

      {isAccountOwner ? (
        <section className="max-w-md">
          <h2 className="font-display text-xl text-slate">{consoleCopy["access.invite.title"]}</h2>
          <ActionForm
            action={inviteMember}
            submitLabel={consoleCopy["access.invite.submit"]}
            className="mt-4"
          >
            <input type="hidden" name="organisationId" value={orgId} />
            <div className="space-y-4">
              <Field label={consoleCopy["access.invite.email"]} name="email" type="email" />
              <label className="block">
                <span className="block text-sm text-grey">{consoleCopy["access.invite.role"]}</span>
                <select
                  name="role"
                  className="mt-1 block w-full border border-grey-40 bg-white px-3 py-2 text-slate"
                >
                  {GRANTABLE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {authCopy[`role.${role}`]}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset>
                <legend className="text-sm text-grey">{consoleCopy["access.invite.units"]}</legend>
                {(units.data ?? []).map((u) => (
                  <label key={u.id} className="block text-sm text-slate">
                    <input type="checkbox" name="units" value={u.id} /> {u.name}
                  </label>
                ))}
              </fieldset>
            </div>
          </ActionForm>
        </section>
      ) : null}

      <section className="max-w-3xl">
        <h2 className="font-display text-xl text-slate">{consoleCopy["access.sessions.title"]}</h2>
        <p className="mt-2 text-sm text-grey">{consoleCopy["access.sessions.note"]}</p>
        {(sessions.data ?? []).length === 0 ? (
          <p className="mt-4 text-sm text-grey">{consoleCopy["access.sessions.none"]}</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {(sessions.data ?? []).map((s) => {
              const steps = (trail.data ?? []).filter((t) => t.support_session_id === s.id);
              return (
                <li key={s.id} className="border-l-2 border-slate-20 pl-4">
                  <p className="text-sm text-slate">
                    {s.staff_name}, {when(s.started_at)} to{" "}
                    {s.ended_at ? when(s.ended_at) : consoleCopy["access.sessions.open"]},{" "}
                    {s.reason}
                  </p>
                  {steps.length === 0 ? (
                    <p className="mt-1 text-xs text-grey">
                      {consoleCopy["access.sessions.nothing"]}
                    </p>
                  ) : (
                    <ul className="mt-1 space-y-1 font-mono text-xs text-grey">
                      {steps.map((t) => (
                        <li key={t.id}>
                          {when(t.occurred_at)} {t.action} {t.entity_type}
                          {t.changed_columns?.length ? ` (${t.changed_columns.join(", ")})` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
