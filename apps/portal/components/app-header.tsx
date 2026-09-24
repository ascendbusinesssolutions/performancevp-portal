import Link from "next/link";

import { SignOutButton } from "@/components/sign-out-button";
import { shellCopy } from "@/lib/copy/shell";

import { OrgNav } from "./org-nav";

/**
 * The header bar from the setup mockups: slate, with the wordmark in Spectral ("Performance" in
 * white, "VP" in Strategic Gold, 4.57:1 on slate), the organisation navigation in 14px Plex Sans,
 * and the signed-in person with sign out on the right.
 */
export function AppHeader({ person, manageable }: { person: string; manageable: string[] }) {
  return (
    <header className="bg-slate">
      <div className="mx-auto flex h-16 max-w-[1160px] items-center gap-10 px-6">
        <Link
          href="/"
          className="shrink-0 font-display text-[22px] leading-none font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          <span className="text-white">{shellCopy["wordmark.first"]}</span>
          <span className="text-gold">{shellCopy["wordmark.second"]}</span>
        </Link>
        <div className="min-w-0 flex-1">
          <OrgNav manageable={manageable} />
        </div>
        <div className="flex shrink-0 items-center gap-6 text-sm">
          {/* Shown only on the widest screens since Campaigns joined the navigation, which
              otherwise scrolls at 1280 pixels. */}
          <span className="hidden max-w-56 truncate text-slate-20 2xl:inline" title={person}>
            {person}
          </span>
          <SignOutButton onDark />
        </div>
      </div>
    </header>
  );
}
