import { SignOutButton } from "@/components/sign-out-button";
import { requireAccess } from "@/lib/auth/access";
import { authCopy } from "@/lib/copy/auth";

/**
 * The signed-in area. requireAccess sends anyone who lacks the assurance their roles need to
 * sign in, enrol or complete TOTP first; the database refuses those roles anyway until they do.
 */
export default async function PortalLayout({ children }: LayoutProps<"/">) {
  const access = await requireAccess();
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex items-baseline justify-between border-b border-grey-20 pb-4">
        <p className="font-mono text-xs uppercase tracking-widest text-gold-deep">
          {authCopy["brand.eyebrow"]}
        </p>
        <div className="flex items-baseline gap-6">
          <span className="text-sm text-grey">{access.fullName ?? access.email}</span>
          <SignOutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
