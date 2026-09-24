"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

import { shellCopy, type ShellCopyKey } from "@/lib/copy/shell";

// The organisation areas, in the order of the setup sequence, then campaigns and access. Each path
// is relative to /org/[orgId].
const ITEMS: ReadonlyArray<{ path: string; label: ShellCopyKey }> = [
  { path: "setup", label: "nav.setup" },
  { path: "units", label: "nav.units" },
  { path: "directory", label: "nav.directory" },
  { path: "context", label: "nav.context" },
  { path: "formal-ratings", label: "nav.formalRatings" },
  { path: "readiness", label: "nav.readiness" },
  { path: "campaigns", label: "nav.campaigns" },
  { path: "access", label: "nav.access" },
];

/**
 * The organisation navigation in the header bar, shown on an organisation's pages to the people who
 * manage it (the server passes their organisation ids; the database still decides every read). The
 * active item is underlined in gold.
 */
export function OrgNav({ manageable }: { manageable: string[] }) {
  const params = useParams<{ orgId?: string }>();
  const pathname = usePathname();
  const orgId = typeof params.orgId === "string" ? params.orgId : undefined;
  if (!orgId || !manageable.includes(orgId)) return null;

  return (
    <nav aria-label={shellCopy["nav.label"]} className="-mb-px overflow-x-auto">
      <ul className="flex h-16 items-stretch gap-7">
        {ITEMS.map((item) => {
          const href = `/org/${orgId}/${item.path}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={item.path} className="flex">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center border-b-2 text-sm whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white ${
                  active
                    ? "border-gold text-white"
                    : "border-transparent text-slate-20 hover:text-white"
                }`}
              >
                {shellCopy[item.label]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
