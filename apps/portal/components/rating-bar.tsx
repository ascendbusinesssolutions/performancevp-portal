import { SignOutButton } from "@/components/sign-out-button";
import { shellCopy } from "@/lib/copy/shell";

/** The manager form's bar: the wordmark, the organisation, the manager's name and sign out. */
export function RatingBar({ organisation, person }: { organisation: string; person: string }) {
  return (
    <header className="bg-slate">
      <div className="mx-auto flex h-16 max-w-[1160px] items-center gap-8 px-6">
        <p className="shrink-0 font-display text-[22px] leading-none font-medium">
          <span className="text-white">{shellCopy["wordmark.first"]}</span>
          <span className="text-gold">{shellCopy["wordmark.second"]}</span>
        </p>
        <p className="min-w-0 flex-1 truncate text-sm text-slate-20">{organisation}</p>
        <div className="flex shrink-0 items-center gap-6 text-sm">
          <span className="hidden text-slate-20 sm:inline">{person}</span>
          <SignOutButton onDark />
        </div>
      </div>
    </header>
  );
}
