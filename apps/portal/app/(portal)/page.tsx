import { PageHeader, Section } from "@/components/page";
import { Head, Row, Table, Td, Th } from "@/components/table";
import { TextLink } from "@/components/ui";
import { requireAccess } from "@/lib/auth/access";
import { authCopy } from "@/lib/copy/auth";
import { consoleCopy } from "@/lib/copy/console";
import { directoryCopy } from "@/lib/copy/directory";

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
    <main>
      <PageHeader title={authCopy["portal.title"]} meta={access.email} />

      {access.memberships.length > 0 ? (
        <Section>
          <Table>
            <Head>
              <Th>{authCopy["portal.col.organisation"]}</Th>
              <Th>{authCopy["portal.col.role"]}</Th>
              <Th>{authCopy["portal.col.subscription"]}</Th>
              <Th />
            </Head>
            <tbody>
              {access.memberships.map((m) => (
                <Row key={`${m.organisationId}-${m.role}`}>
                  <Td>{m.organisationName}</Td>
                  <Td muted>{authCopy[`role.${m.role}`]}</Td>
                  <Td muted>{authCopy[`state.${m.state}`]}</Td>
                  <Td align="right">
                    {m.role === "account_owner" || m.role === "administrator" ? (
                      <span className="space-x-6">
                        <TextLink href={`/org/${m.organisationId}/directory`}>
                          {directoryCopy["page.nav"]}
                        </TextLink>
                        <TextLink href={`/org/${m.organisationId}/access`}>
                          {consoleCopy["nav.access"]}
                        </TextLink>
                      </span>
                    ) : null}
                  </Td>
                </Row>
              ))}
            </tbody>
          </Table>
          {managerOnly ? <p className="mt-6 text-grey">{authCopy["portal.managerNote"]}</p> : null}
        </Section>
      ) : null}

      {staff ? (
        <Section title={authCopy["portal.staffSessions"]}>
          {access.openSupportSessions.length === 0 ? (
            <p className="text-grey">{authCopy["portal.noStaffSessions"]}</p>
          ) : (
            <ul>
              {access.openSupportSessions.map((s) => (
                <li key={s.sessionId} className="border-b border-grey-20 py-3 text-slate">
                  <TextLink href={`/org/${s.organisationId}/access`}>{s.organisationName}</TextLink>{" "}
                  <span className="text-sm text-grey">
                    {authCopy["portal.expires"]} {new Date(s.expiresAt).toLocaleTimeString("en-AU")}
                  </span>{" "}
                  <TextLink href={`/org/${s.organisationId}/directory`}>
                    {directoryCopy["page.nav"]}
                  </TextLink>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-6">
            <TextLink href="/pvp">{consoleCopy["nav.console"]}</TextLink>
          </p>
        </Section>
      ) : null}
    </main>
  );
}
