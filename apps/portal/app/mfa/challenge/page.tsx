import { redirect } from "next/navigation";

import { AuthShell } from "@/components/ui";
import { requireSession } from "@/lib/auth/access";
import { authCopy } from "@/lib/copy/auth";

import { ChallengeForm } from "./challenge-form";

export default async function ChallengePage() {
  const access = await requireSession();
  if (!access.hasVerifiedFactor) redirect("/mfa/enrol");
  if (access.aal === "aal2") redirect("/");
  return (
    <AuthShell title={authCopy["mfa.challenge.title"]}>
      <ChallengeForm />
      <p className="mt-8 text-sm text-grey">{authCopy["mfa.lost"]}</p>
    </AuthShell>
  );
}
