import { signOut } from "@/app/sign-out";
import { authCopy } from "@/lib/copy/auth";

export function SignOutButton({ onDark = false }: { onDark?: boolean }) {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className={`text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 ${
          onDark
            ? "text-white hover:text-gold focus-visible:outline-white"
            : "text-slate hover:text-gold-deep focus-visible:outline-slate"
        }`}
      >
        {authCopy["portal.signOut"]}
      </button>
    </form>
  );
}
