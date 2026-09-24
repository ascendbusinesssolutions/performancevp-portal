import { Notice } from "@/components/ui";
import { consoleCopy } from "@/lib/copy/console";
import { setupCopy } from "@/lib/copy/setup";
import { fill } from "@/lib/copy/template";
import { requireOrgManager } from "@/lib/org/context";

/**
 * The screens an organisation is set up and maintained from: its account owner and administrators,
 * and PerformanceVP staff under a support session, who are told that everything they do is shown
 * to the client. In grace the screens stay readable and the database refuses every change.
 */
export default async function ManageLayout({ children, params }: LayoutProps<"/org/[orgId]">) {
  const { orgId } = await params;
  const org = await requireOrgManager(orgId);
  return (
    <>
      {org.asStaff && org.sessionEndsAt ? (
        <div className="pt-6">
          <Notice>
            {fill(setupCopy["notice.staffSession"], {
              organisation: org.name,
              time: new Date(org.sessionEndsAt).toLocaleTimeString("en-AU", {
                hour: "numeric",
                minute: "2-digit",
                timeZone: "Australia/Sydney",
              }),
            })}
          </Notice>
        </div>
      ) : null}
      {org.state === "grace" ? (
        <div className="pt-6">
          <Notice tone="problem">{consoleCopy["access.grace"]}</Notice>
        </div>
      ) : null}
      {children}
    </>
  );
}
