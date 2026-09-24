import { AppHeader } from "@/components/app-header";
import { requireAccess } from "@/lib/auth/access";

/**
 * The signed-in area. requireAccess sends anyone who lacks the assurance their roles need to
 * sign in, enrol or complete TOTP first; the database refuses those roles anyway until they do.
 * The header shows an organisation's navigation to the people who manage it: its account owner and
 * administrators, and staff with a session open on it.
 */
export default async function PortalLayout({ children }: LayoutProps<"/">) {
  const access = await requireAccess();
  const manageable = [
    ...access.memberships
      .filter((m) => m.role === "account_owner" || m.role === "administrator")
      .map((m) => m.organisationId),
    ...access.openSupportSessions.map((s) => s.organisationId),
  ];
  return (
    <>
      <AppHeader person={access.fullName ?? access.email} manageable={manageable} />
      <div className="mx-auto max-w-[1160px] px-6 pb-24">{children}</div>
    </>
  );
}
