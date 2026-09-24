import type { Metadata } from "next";

import { surveyCopy } from "@/lib/copy/survey";

import { SurveyApp } from "./survey-app";

/**
 * The public survey route (Milestone 5 plan, 4.2). Static apart from the nonce: everything a
 * respondent sees comes from /api/survey/open once the page has read the token from the link's
 * fragment. Never indexed and never sent on with a referrer.
 */
export const metadata: Metadata = {
  title: surveyCopy["page.title"],
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function SurveyPage() {
  return <SurveyApp />;
}
