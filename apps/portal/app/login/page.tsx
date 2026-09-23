import { AuthShell, Notice, TextLink } from "@/components/ui";
import { authCopy } from "@/lib/copy/auth";

import { PasswordForm } from "./password-form";

// Notices are chosen by a fixed key; nothing personal travels in the query string.
const NOTICES: Record<string, string> = {
  "password-required": authCopy["login.notice.passwordRequired"],
  "password-set": authCopy["login.notice.passwordSet"],
  "link-expired": authCopy["login.notice.linkExpired"],
  "signed-out": authCopy["login.notice.signedOut"],
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { notice } = await searchParams;
  const message = typeof notice === "string" ? NOTICES[notice] : undefined;
  return (
    <AuthShell title={authCopy["login.title"]}>
      {message ? <Notice>{message}</Notice> : null}
      <PasswordForm />
      <div className="mt-8 flex flex-col gap-3">
        <TextLink href="/login/code">{authCopy["login.toCode"]}</TextLink>
        <TextLink href="/auth/reset">{authCopy["login.toReset"]}</TextLink>
        <TextLink href="/auth/new-link">{authCopy["login.toNewLink"]}</TextLink>
      </div>
    </AuthShell>
  );
}
