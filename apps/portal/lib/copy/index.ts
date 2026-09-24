import { authCopy } from "./auth";
import { campaignsCopy } from "./campaigns";
import { commonCopy } from "./common";
import { consoleCopy } from "./console";
import { contextCopy } from "./context";
import { directoryCopy } from "./directory";
import { ratingsMapCopy } from "./ratings-map";
import { readinessCopy } from "./readiness";
import { setupCopy } from "./setup";
import { shellCopy } from "./shell";
import { unitsCopy } from "./units";

/**
 * Every copy table, by module name. The copy check (copy.test.ts) lints each one and requires a
 * fixture for every templated key, so a module added here is covered without further wiring. The
 * methodology footer module, the one place sub-dimension codes may appear, joins in Milestone 6
 * with `footer: true`.
 */
export const COPY_TABLES: Readonly<
  Record<string, { table: Readonly<Record<string, string>>; footer?: boolean }>
> = {
  auth: { table: authCopy },
  campaigns: { table: campaignsCopy },
  common: { table: commonCopy },
  console: { table: consoleCopy },
  context: { table: contextCopy },
  directory: { table: directoryCopy },
  "ratings-map": { table: ratingsMapCopy },
  readiness: { table: readinessCopy },
  setup: { table: setupCopy },
  shell: { table: shellCopy },
  units: { table: unitsCopy },
};
