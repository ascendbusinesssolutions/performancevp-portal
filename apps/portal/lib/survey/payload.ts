import type { RoleKey, SurveyAudience } from "./content";

/**
 * The shape of a submission, checked before it reaches the database (Milestone 5 plan, 4.2 and
 * 4.3). The database checks it again against the campaign unit's frozen deployment; this only
 * refuses what could never be valid, so nothing malformed or oversized is sent on.
 */

export interface Payload {
  team?: string | null;
  items?: Record<string, number>;
  processes?: Array<{ process: string; items: Record<string, number> }>;
  decisions?: Array<{
    decisionType: string;
    roles?: Partial<Record<RoleKey, string[]>>;
    clarity?: number;
  }>;
}

const AUDIENCES: readonly SurveyAudience[] = [
  "members_part_a",
  "members_part_b",
  "team_leaders",
  "leadership_team",
];
const ROLES: readonly RoleKey[] = ["recommend", "agree", "perform", "input", "decides"];
const CODE = /^[A-Z0-9]{2,5}-\d{2}$/;
const ID = /^[0-9a-f-]{36}$/;

export function isAudience(value: unknown): value is SurveyAudience {
  return AUDIENCES.some((a) => a === value);
}

function isScore(value: unknown): value is number {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

function scores(value: unknown, max: number): Record<string, number> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (entries.length > max) return null;
  if (!entries.every(([k, v]) => CODE.test(k) && isScore(v))) return null;
  return Object.fromEntries(entries) as Record<string, number>;
}

function onlyKeys(value: object, keys: readonly string[]): boolean {
  return Object.keys(value).every((k) => keys.includes(k));
}

/** The payload, or null where its shape could never be valid. */
export function parsePayload(value: unknown): Payload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!onlyKeys(value, ["team", "items", "processes", "decisions"])) return null;
  const input = value as Record<string, unknown>;
  const payload: Payload = {};
  if (input.team !== undefined && input.team !== null) {
    if (typeof input.team !== "string" || !ID.test(input.team)) return null;
    payload.team = input.team;
  }
  if (input.items !== undefined) {
    const items = scores(input.items, 100);
    if (!items) return null;
    payload.items = items;
  }
  if (input.processes !== undefined) {
    if (!Array.isArray(input.processes) || input.processes.length > 10) return null;
    const processes: NonNullable<Payload["processes"]> = [];
    for (const p of input.processes as unknown[]) {
      if (!p || typeof p !== "object" || !onlyKeys(p, ["process", "items"])) return null;
      const { process, items } = p as Record<string, unknown>;
      const parsed = scores(items, 10);
      if (typeof process !== "string" || !ID.test(process) || !parsed) return null;
      processes.push({ process, items: parsed });
    }
    payload.processes = processes;
  }
  if (input.decisions !== undefined) {
    if (!Array.isArray(input.decisions) || input.decisions.length > 20) return null;
    const decisions: NonNullable<Payload["decisions"]> = [];
    for (const d of input.decisions as unknown[]) {
      if (!d || typeof d !== "object" || !onlyKeys(d, ["decisionType", "roles", "clarity"])) {
        return null;
      }
      const { decisionType, roles, clarity } = d as Record<string, unknown>;
      if (typeof decisionType !== "string" || !ID.test(decisionType)) return null;
      if (clarity !== undefined && !isScore(clarity)) return null;
      const parsedRoles: Partial<Record<RoleKey, string[]>> = {};
      if (roles !== undefined) {
        if (!roles || typeof roles !== "object" || !onlyKeys(roles, ROLES)) return null;
        for (const [key, list] of Object.entries(roles)) {
          if (
            !Array.isArray(list) ||
            list.length > 50 ||
            !list.every((v) => typeof v === "string" && (v === "unclear" || ID.test(v)))
          ) {
            return null;
          }
          parsedRoles[key as RoleKey] = [...new Set(list as string[])];
        }
      }
      decisions.push({
        decisionType,
        ...(roles !== undefined ? { roles: parsedRoles } : {}),
        ...(clarity !== undefined ? { clarity: clarity as number } : {}),
      });
    }
    payload.decisions = decisions;
  }
  return payload;
}
