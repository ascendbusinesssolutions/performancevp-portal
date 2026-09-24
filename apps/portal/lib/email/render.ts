import { dayLabel, timeLabel } from "@/lib/campaigns/calendar";
import { cadenceName } from "@/lib/campaigns/display";
import { asCadence } from "@/lib/campaigns/cadence";
import { commonCopy } from "@/lib/copy/common";
import { emailCopy } from "@/lib/copy/email";
import { fill, listOf } from "@/lib/copy/template";
import { minutesFor, type SurveyAudience } from "@/lib/survey/content";

/**
 * Campaign mail, rendered at send time from the copy module and never stored (Milestone 5 plan,
 * 5.2). Pure: the survey links are passed in, already derived. Every value is escaped for the HTML
 * part; the text part carries the same words.
 */

export interface ClaimedEmail {
  id: string;
  kind:
    | "survey_invitation"
    | "survey_reminder"
    | "manager_invitation"
    | "manager_reminder"
    | "checklist_reminder"
    | "schedule_notice"
    | "launch_refused"
    | "scores_ready";
  organisationId: string;
  organisationName: string;
  campaign: {
    id: string;
    name: string | null;
    cadence: string;
    eventTrigger: string | null;
    closesAt: string | null;
    status: string;
  } | null;
  email: string | null;
  invitations: Array<{
    id: string;
    salt: string;
    audience: SurveyAudience;
    unitName: string;
    itemCount: number;
  }>;
  units: string[];
}

export interface Rendered {
  subject: string;
  text: string;
  html: string;
}

/** A paragraph, or a line followed by a link. */
type Block = string | { line: string; href: string };

const LIST_WORDS = {
  and: commonCopy["list.and"],
  more: (n: number) => fill(commonCopy["list.more"], { n }),
};

function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function compose(subject: string, blocks: Block[]): Rendered {
  const text = blocks.map((b) => (typeof b === "string" ? b : `${b.line}\n${b.href}`)).join("\n\n");
  const paragraph = "margin:0 0 16px;font:15px/1.5 Arial,Helvetica,sans-serif;color:#1f3a52";
  const html = [
    '<!doctype html><html lang="en-AU"><body style="margin:0;padding:24px;background:#ffffff">',
    '<div style="max-width:560px">',
    ...blocks.map((b) =>
      typeof b === "string"
        ? `<p style="${paragraph}">${escape(b)}</p>`
        : `<p style="${paragraph}">${escape(b.line)}<br><a href="${escape(b.href)}" style="color:#1f3a52">${escape(b.href)}</a></p>`,
    ),
    "</div></body></html>",
  ].join("");
  return { subject, text, html };
}

function campaignName(row: ClaimedEmail): string {
  const campaign = row.campaign;
  if (!campaign) return "";
  return (
    campaign.name ?? cadenceName(asCadence(campaign.cadence) ?? "baseline", campaign.eventTrigger)
  );
}

function closing(row: ClaimedEmail, now: Date): { date: string; time: string } {
  const closesAt = row.campaign?.closesAt ?? now.toISOString();
  return { date: dayLabel(closesAt, now), time: timeLabel(closesAt) };
}

/**
 * The email for a claimed outbox row, or null where it cannot be sent (no address). `links` gives
 * each survey invitation's link; `base` is the portal's address.
 */
export function renderEmail(
  row: ClaimedEmail,
  base: string,
  links: ReadonlyMap<string, string>,
  now: Date = new Date(),
): Rendered | null {
  if (!row.email) return null;
  const organisation = row.organisationName;
  const footer = fill(emailCopy.footer, { organisation });
  switch (row.kind) {
    case "survey_invitation": {
      const small = row.invitations.some(
        (i) => i.audience === "team_leaders" || i.audience === "leadership_team",
      );
      return compose(fill(emailCopy["survey.subject"], { organisation }), [
        fill(emailCopy["survey.intro"], { organisation }),
        emailCopy["survey.anonymous"],
        ...(small ? [emailCopy["survey.small"]] : []),
        ...row.invitations.map((i) => ({
          line: fill(emailCopy[`survey.link.${i.audience}`], {
            unit: i.unitName,
            minutes: minutesFor(i.audience, i.itemCount),
          }),
          href: links.get(i.id) ?? `${base}/s`,
        })),
        emailCopy["survey.once"],
        fill(emailCopy["survey.closes"], closing(row, now)),
        fill(emailCopy["survey.behalf"], { organisation }),
      ]);
    }
    case "manager_invitation":
      return compose(fill(emailCopy["manager.subject"], { organisation }), [
        fill(emailCopy["manager.intro"], {
          organisation,
          units: listOf(
            [...row.units].sort((a, b) => a.localeCompare(b, "en-AU")),
            LIST_WORDS,
          ),
        }),
        emailCopy["manager.identified"],
        { line: emailCopy["manager.signIn"], href: `${base}/login/code` },
        fill(emailCopy["manager.closes"], closing(row, now)),
        footer,
      ]);
    case "launch_refused":
      return compose(fill(emailCopy["refused.subject"], { campaign: campaignName(row) }), [
        fill(emailCopy["refused.body"], { campaign: campaignName(row) }),
        {
          line: emailCopy["refused.link"],
          href: `${base}/org/${row.organisationId}/campaigns/${row.campaign?.id ?? ""}`,
        },
        footer,
      ]);
    case "scores_ready":
      return compose(fill(emailCopy["scores.subject"], { campaign: campaignName(row) }), [
        fill(emailCopy["scores.body"], { campaign: campaignName(row) }),
        {
          line: emailCopy["scores.link"],
          href: `${base}/org/${row.organisationId}/campaigns/${row.campaign?.id ?? ""}`,
        },
        footer,
      ]);
    default:
      // Reminders and schedule notices join in step 7.
      return null;
  }
}
