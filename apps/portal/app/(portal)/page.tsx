import { requireAccess } from "@/lib/auth/access";
import { authCopy } from "@/lib/copy/auth";

/**
 * The landing page: the organisations and roles the person holds, and for PerformanceVP staff
 * their open support sessions. The setup flows (Milestone 4), the consoles (Milestone 3, step 8)
 * and results (Milestone 6) grow from here.
 */
export default async function PortalHome() {
  const access = await requireAccess();
  const staff = access.isOwner || access.isSupportStaff;
  const managerOnly =
    access.memberships.length > 0 &&
    access.memberships.every((m) => m.role === "manager_respondent");

  return (
    <main className="mt-10">
      <h1 className="font-display text-3xl font-medium text-slate">{authCopy["portal.title"]}</h1>

      {access.memberships.length > 0 ? (
        <table className="mt-8 w-full border-collapse text-left">
          <tbody>
            {access.memberships.map((m) => (
              <tr key={`${m.organisationId}-${m.role}`} className="border-b border-grey-20">
                <td className="py-3 text-slate">{m.organisationName}</td>
                <td className="py-3 text-grey">{authCopy[`role.${m.role}`]}</td>
                <td className="py-3 text-grey">{authCopy[`state.${m.state}`]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {managerOnly ? <p className="mt-6 text-grey">{authCopy["portal.managerNote"]}</p> : null}

      {staff ? (
        <section className="mt-10">
          <h2 className="font-display text-xl text-slate">{authCopy["portal.staffSessions"]}</h2>
          {access.openSupportSessions.length === 0 ? (
            <p className="mt-3 text-grey">{authCopy["portal.noStaffSessions"]}</p>
          ) : (
            <ul className="mt-3">
              {access.openSupportSessions.map((s) => (
                <li key={s.sessionId} className="border-b border-grey-20 py-3 text-slate">
                  {s.organisationName}{" "}
                  <span className="text-sm text-grey">
                    {authCopy["portal.expires"]} {new Date(s.expiresAt).toLocaleTimeString("en-AU")}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-6 text-sm text-grey">{authCopy["portal.staffNote"]}</p>
        </section>
      ) : null}
    </main>
  );
}
