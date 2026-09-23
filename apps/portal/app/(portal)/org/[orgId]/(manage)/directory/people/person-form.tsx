import { ActionForm } from "@/components/action-form";
import { CheckboxField, SelectField } from "@/components/fields";
import { Field, INPUT_CLASS } from "@/components/ui";
import { directoryCopy } from "@/lib/copy/directory";
import { fill } from "@/lib/copy/template";
import type { Person, Team } from "@/lib/setup/data";
import { personName, unitTree, type UnitRow } from "@/lib/setup/units";

import { savePerson } from "./actions";

/**
 * The fields of one directory record (Online Measurement Specification 6.1). The employee ID is set
 * when the person is added and never changed. The manager is given by employee ID, with the
 * directory offered as suggestions; teams are listed under their units, and the database refuses a
 * team outside the person's unit.
 */
export function PersonForm({
  orgId,
  person,
  people,
  units,
  teams,
  families,
  writable,
  currentManager,
}: {
  orgId: string;
  person: Person | null;
  /** The person's manager, looked up separately when they are no longer active. */
  currentManager?: Person | null;
  people: Person[];
  units: UnitRow[];
  teams: Team[];
  families: Array<{ id: string; name: string }>;
  writable: boolean;
}) {
  const tree = unitTree(units);
  const manager = person?.manager_employee_id
    ? (people.find((p) => p.id === person.manager_employee_id) ?? currentManager ?? undefined)
    : undefined;
  const others = people
    .filter((p) => p.id !== person?.id)
    .sort((a, b) => a.employee_ref.localeCompare(b.employee_ref, "en-AU"));

  return (
    <ActionForm
      action={savePerson}
      submitLabel={person ? directoryCopy["person.save"] : directoryCopy["person.add"]}
      className="max-w-3xl"
    >
      <input type="hidden" name="organisationId" value={orgId} />
      <input type="hidden" name="employeeId" value={person?.id ?? ""} />
      <div className="grid gap-5 md:grid-cols-2">
        {person ? null : (
          <div className="md:col-span-2 md:max-w-sm">
            <Field
              label={directoryCopy["person.employeeRef"]}
              name="employeeRef"
              maxLength={64}
              hint={directoryCopy["person.employeeRef.hint"]}
              disabled={!writable}
            />
          </div>
        )}
        <Field
          label={directoryCopy["person.firstName"]}
          name="firstName"
          defaultValue={person?.first_name}
          maxLength={100}
          disabled={!writable}
        />
        <Field
          label={directoryCopy["person.lastName"]}
          name="lastName"
          defaultValue={person?.last_name}
          maxLength={100}
          disabled={!writable}
        />
        <Field
          label={directoryCopy["person.workEmail"]}
          name="workEmail"
          type="email"
          required={false}
          defaultValue={person?.work_email ?? ""}
          hint={directoryCopy["person.workEmail.hint"]}
          disabled={!writable}
        />
        <Field
          label={directoryCopy["person.roleTitle"]}
          name="roleTitle"
          required={false}
          defaultValue={person?.role_title ?? ""}
          maxLength={200}
          disabled={!writable}
        />
        <SelectField
          label={directoryCopy["person.unit"]}
          name="unitId"
          required
          defaultValue={person?.unit_id ?? tree[0]?.unit.id}
          disabled={!writable}
          options={tree.map((e) => ({
            value: e.unit.id,
            label: `${" ".repeat(e.depth)}${e.unit.name} (${e.unit.unit_code})`,
          }))}
        />
        <div>
          <label htmlFor="person-team" className="block text-sm text-grey">
            {directoryCopy["person.team"]}
          </label>
          <select
            id="person-team"
            name="teamId"
            className={INPUT_CLASS}
            defaultValue={person?.team_id ?? ""}
            disabled={!writable}
          >
            <option value="">{directoryCopy["person.team.none"]}</option>
            {tree.map(({ unit }) => {
              const unitTeams = teams.filter((t) => t.unit_id === unit.id && t.status === "active");
              return unitTeams.length > 0 ? (
                <optgroup key={unit.id} label={unit.name}>
                  {unitTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </optgroup>
              ) : null;
            })}
          </select>
        </div>
        <div>
          <Field
            label={directoryCopy["person.manager"]}
            name="managerRef"
            required={false}
            defaultValue={manager?.employee_ref ?? ""}
            hint={directoryCopy["person.manager.hint"]}
            disabled={!writable}
            list="directory-people"
          />
          {manager ? (
            <p className="mt-1 text-xs text-slate">
              {fill(directoryCopy["person.managerNow"], { name: personName(manager) })}
            </p>
          ) : null}
          <datalist id="directory-people">
            {others.map((p) => (
              <option key={p.id} value={p.employee_ref}>
                {personName(p)}
              </option>
            ))}
          </datalist>
        </div>
        <SelectField
          label={directoryCopy["person.roleFamily"]}
          name="roleFamilyId"
          defaultValue={person?.role_family_id ?? ""}
          disabled={!writable}
          options={[
            { value: "", label: directoryCopy["person.roleFamily.none"] },
            ...families.map((f) => ({ value: f.id, label: f.name })),
          ]}
        />
        <Field
          label={directoryCopy["person.startDate"]}
          name="startDate"
          type="date"
          required={false}
          defaultValue={person?.start_date ?? ""}
          disabled={!writable}
        />
        <Field
          label={directoryCopy["person.fte"]}
          name="fte"
          inputMode="decimal"
          defaultValue={person ? String(person.fte) : "1"}
          hint={directoryCopy["person.fte.hint"]}
          disabled={!writable}
        />
        <Field
          label={directoryCopy["person.employmentStatus"]}
          name="employmentStatus"
          required={false}
          defaultValue={person?.employment_status ?? ""}
          maxLength={100}
          disabled={!writable}
        />
        <div className="space-y-1 md:col-span-2">
          <CheckboxField
            label={directoryCopy["person.teamLeader"]}
            name="teamLeader"
            defaultChecked={person?.is_team_leader}
            disabled={!writable}
          />
          <CheckboxField
            label={directoryCopy["person.leadershipTeam"]}
            name="leadershipTeam"
            defaultChecked={person?.is_leadership_team}
            disabled={!writable}
          />
        </div>
      </div>
    </ActionForm>
  );
}
