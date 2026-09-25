"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Saves one report's ratings through save_manager_ratings, as the signed-in manager (Milestone 5
 * plan, 3.4). The database decides everything: the session is theirs and open, the report is
 * theirs, the skill or domain is in the frozen framework, and a 5 (or a band of 5 or 1) carries
 * its evidence. Only the kind of refusal comes back, never the database's words.
 */

export interface RatingsToSave {
  skills?: Array<{ id: string; value: number; note: string | null }>;
  knowledge?: Array<{ id: string; value: number; note: string | null }>;
  band?: { value: number; note: string | null };
}

export type SaveResult = { ok: true } | { ok: false; error: "evidence" | "closed" | "save" };

const ID = /^[0-9a-f-]{36}$/;

function valid(entry: { value: number; note: string | null }, withId?: string): boolean {
  return (
    Number.isInteger(entry.value) &&
    entry.value >= 1 &&
    entry.value <= 5 &&
    (entry.note === null || (typeof entry.note === "string" && entry.note.length <= 500)) &&
    (withId === undefined || ID.test(withId))
  );
}

export async function saveRatings(
  sessionId: string,
  subject: string,
  ratings: RatingsToSave,
): Promise<SaveResult> {
  if (
    !ID.test(sessionId) ||
    !ID.test(subject) ||
    !(ratings.skills ?? []).every((r) => valid(r, r.id)) ||
    !(ratings.knowledge ?? []).every((r) => valid(r, r.id)) ||
    (ratings.band !== undefined && !valid(ratings.band))
  ) {
    return { ok: false, error: "save" };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_manager_ratings", {
    p_session_id: sessionId,
    p_subject_snapshot_member_id: subject,
    p_ratings: ratings as never,
  });
  if (!error) return { ok: true };
  if (error.code === "23514") return { ok: false, error: "evidence" };
  if (error.code === "42501") return { ok: false, error: "closed" };
  return { ok: false, error: "save" };
}
