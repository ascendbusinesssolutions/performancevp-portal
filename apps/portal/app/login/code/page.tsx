import { AuthShell, TextLink } from "@/components/ui";
import { authCopy } from "@/lib/copy/auth";

import { CodeForm } from "./code-form";

export default function CodeSignInPage() {
  return (
    <AuthShell title={authCopy["code.title"]}>
      <p className="mb-6 text-grey">{authCopy["code.intro"]}</p>
      <CodeForm />
      <div className="mt-8">
        <TextLink href="/login">{authCopy["code.toPassword"]}</TextLink>
      </div>
    </AuthShell>
  );
}
