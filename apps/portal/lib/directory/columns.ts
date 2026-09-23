/**
 * The directory template, defined once (Online Measurement Specification 6.1). The template writer,
 * the reader's header check and the validator all read this list, so the file a client downloads and
 * the file the portal accepts cannot drift apart. The row keys are the columns of
 * public.directory_upload_rows.
 */

export const TEMPLATE_VERSION = "1";
export const DIRECTORY_SHEET = "Directory";
export const GUIDANCE_SHEET = "Guidance";

/** Under Vercel's 4.5 MB request ceiling; the storage bucket enforces the same limit. */
export const DIRECTORY_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;
/** Revisited when EMPLOYEE_BANDS is settled. */
export const DIRECTORY_MAX_ROWS = 20_000;

export type ColumnKind = "id" | "text" | "email" | "code" | "date" | "fte" | "flag";

export type RowKey =
  | "employee_ref"
  | "first_name"
  | "last_name"
  | "work_email"
  | "unit_code"
  | "unit_name"
  | "team_name"
  | "manager_ref"
  | "role_title"
  | "role_family_name"
  | "start_date"
  | "fte"
  | "is_team_leader"
  | "is_leadership_team"
  | "employment_status"
  | "formal_rating_label"
  | "formal_rating_date";

export interface Column {
  key: RowKey;
  kind: ColumnKind;
  required: boolean;
  maxLength?: number;
  /** Column width in the template, in characters. */
  width: number;
}

export const COLUMNS: readonly Column[] = [
  { key: "employee_ref", kind: "id", required: true, maxLength: 64, width: 14 },
  { key: "first_name", kind: "text", required: true, maxLength: 100, width: 16 },
  { key: "last_name", kind: "text", required: true, maxLength: 100, width: 16 },
  { key: "work_email", kind: "email", required: false, maxLength: 320, width: 28 },
  { key: "unit_code", kind: "code", required: true, maxLength: 40, width: 12 },
  { key: "unit_name", kind: "text", required: true, maxLength: 200, width: 22 },
  { key: "team_name", kind: "text", required: false, maxLength: 200, width: 18 },
  { key: "manager_ref", kind: "id", required: false, maxLength: 64, width: 18 },
  { key: "role_title", kind: "text", required: false, maxLength: 200, width: 22 },
  { key: "role_family_name", kind: "text", required: false, maxLength: 200, width: 18 },
  { key: "start_date", kind: "date", required: false, width: 12 },
  { key: "fte", kind: "fte", required: true, width: 10 },
  { key: "is_team_leader", kind: "flag", required: false, width: 12 },
  { key: "is_leadership_team", kind: "flag", required: false, width: 14 },
  { key: "employment_status", kind: "text", required: false, maxLength: 100, width: 18 },
  { key: "formal_rating_label", kind: "text", required: false, maxLength: 100, width: 22 },
  { key: "formal_rating_date", kind: "date", required: false, width: 16 },
];
