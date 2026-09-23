import { AuthShell } from "@/components/ui";
import { requireSession } from "@/lib/auth/access";
import { authCopy } from "@/lib/copy/auth";

import { SetPasswordForm } from "./set-password-form";

export default async function SetPasswordPage() {
  await requireSession();
  return (
    <AuthShell title={authCopy["setPassword.title"]}>
      <p className="mb-6 text-grey">{authCopy["setPassword.rules"]}</p>
      <SetPasswordForm />
    </AuthShell>
  );
}
