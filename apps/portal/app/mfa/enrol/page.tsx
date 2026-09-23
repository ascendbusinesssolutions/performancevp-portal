import { redirect } from "next/navigation";

import { AuthShell } from "@/components/ui";
import { requireSession } from "@/lib/auth/access";
import { authCopy } from "@/lib/copy/auth";

import { EnrolForm } from "./enrol-form";

export default async function EnrolPage() {
  const access = await requireSession();
  if (access.hasVerifiedFactor) redirect("/mfa/challenge");
  return (
    <AuthShell title={authCopy["mfa.enrol.title"]}>
      <p className="mb-6 text-grey">{authCopy["mfa.enrol.intro"]}</p>
      <EnrolForm />
    </AuthShell>
  );
}
