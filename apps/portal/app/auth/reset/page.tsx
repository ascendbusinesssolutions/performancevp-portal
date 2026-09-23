import { AuthShell, TextLink } from "@/components/ui";
import { authCopy } from "@/lib/copy/auth";

import { ResetForm } from "./reset-form";

export default function ResetPage() {
  return (
    <AuthShell title={authCopy["reset.title"]}>
      <p className="mb-6 text-grey">{authCopy["reset.intro"]}</p>
      <ResetForm />
      <div className="mt-8">
        <TextLink href="/login">{authCopy["reset.toLogin"]}</TextLink>
      </div>
    </AuthShell>
  );
}
