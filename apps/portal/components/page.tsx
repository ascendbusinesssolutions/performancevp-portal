import Link from "next/link";
import type { ReactNode } from "react";

import { shellCopy } from "@/lib/copy/shell";

/**
 * Page furniture from the setup mockups (Milestone 4 plan, Section 2): a 13px breadcrumb above a
 * 44px Spectral title and a 14px grey meta line below it; sections separated by 1px rules with
 * about 32px above and below.
 */

export interface Crumb {
  label: string;
  href?: string;
}

export function PageHeader({
  crumbs = [],
  title,
  meta,
  children,
}: {
  crumbs?: Crumb[];
  title: string;
  meta?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="pt-10 pb-8">
      {crumbs.length > 0 ? (
        <nav aria-label={shellCopy["crumb.label"]} className="text-crumb text-grey">
          <ol className="flex flex-wrap items-center gap-x-2">
            {crumbs.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-x-2">
                {index > 0 ? (
                  <span aria-hidden="true" className="text-grey-80">
                    /
                  </span>
                ) : null}
                {crumb.href ? (
                  <Link className="hover:text-gold-deep hover:underline" href={crumb.href}>
                    {crumb.label}
                  </Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      <h1 className="mt-2 font-display text-title font-medium text-slate">{title}</h1>
      {meta ? <div className="mt-3 text-sm text-grey">{meta}</div> : null}
      {children ? <div className="mt-5 max-w-3xl text-slate">{children}</div> : null}
    </div>
  );
}

/** A section below a 1px rule. The heading is optional; the id lets other screens link here. */
export function Section({
  title,
  intro,
  id,
  children,
  aside,
}: {
  title?: string;
  intro?: ReactNode;
  id?: string;
  children?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-grey-20 py-8">
      {title || aside ? (
        <div className="flex items-baseline justify-between gap-6">
          {title ? <h2 className="font-display text-2xl font-medium text-slate">{title}</h2> : null}
          {aside ? <div className="text-sm">{aside}</div> : null}
        </div>
      ) : null}
      {intro ? <div className="mt-2 max-w-3xl text-grey">{intro}</div> : null}
      {children ? <div className={title || intro ? "mt-6" : undefined}>{children}</div> : null}
    </section>
  );
}

/** The home crumb every page starts from. */
export function homeCrumb(): Crumb {
  return { label: shellCopy["crumb.home"], href: "/" };
}
