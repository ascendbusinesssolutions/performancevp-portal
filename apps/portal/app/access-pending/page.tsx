import { AuthShell } from "@/components/ui";
import { SignOutButton } from "@/components/sign-out-button";
import { requireSession } from "@/lib/auth/access";
import { authCopy } from "@/lib/copy/auth";

export default async function AccessPendingPage() {
  await requireSession();
  return (
    <AuthShell title={authCopy["pending.title"]}>
      <p className="text-grey">{authCopy["pending.body"]}</p>
      <div className="mt-8">
        <SignOutButton />
      </div>
    </AuthShell>
  );
}
