import { signOut } from "@/app/sign-out";
import { authCopy } from "@/lib/copy/auth";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="text-sm text-slate underline underline-offset-4 hover:text-gold-deep"
      >
        {authCopy["portal.signOut"]}
      </button>
    </form>
  );
}
