import { AuthShell, Notice, TextLink } from "@/components/ui";
import { authCopy } from "@/lib/copy/auth";

import { NewLinkForm } from "./new-link-form";

/**
 * Where an expired or used invitation or password link lands (PORTAL_BUILD_PLAN.md Milestone 4).
 * The notice is chosen by a fixed key; the address is typed here and never travels in a URL.
 */
export default async function NewLinkPage({ searchParams }: PageProps<"/auth/new-link">) {
  const { notice } = await searchParams;
  return (
    <AuthShell title={authCopy["newLink.title"]}>
      {notice === "expired" ? <Notice>{authCopy["newLink.expired"]}</Notice> : null}
      <p className="mb-6 text-grey">{authCopy["newLink.intro"]}</p>
      <NewLinkForm />
      <div className="mt-8">
        <TextLink href="/login">{authCopy["newLink.toLogin"]}</TextLink>
      </div>
    </AuthShell>
  );
}
