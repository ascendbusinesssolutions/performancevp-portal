import { requireAccess } from "@/lib/auth/access";

/**
 * The manager's rating form (Milestone 5 plan, 3.4). Signed in like the rest of the portal, with a
 * one-time code, but with its own bar: the wordmark, the organisation, the manager and sign out,
 * and no navigation (layout notes of 24 September 2026). Each page draws the bar.
 */
export default async function RatingLayout({ children }: LayoutProps<"/">) {
  await requireAccess();
  return <>{children}</>;
}
