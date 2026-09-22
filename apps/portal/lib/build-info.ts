import { ENGINE_VERSION } from "@performancevp/engine";
import { INTAKE_VERSION } from "@performancevp/intake";
import { RECOMMENDATIONS_VERSION } from "@performancevp/recommendations";

import { appEnv, type AppEnv } from "./env";

export interface BuildInfo {
  appEnv: AppEnv | "unset";
  commit: string;
  packages: {
    engine: string;
    intake: string;
    recommendations: string;
  };
}

/**
 * What this deployment is built from. Proves that the workspace packages resolve in the
 * deployed build and that the environment variable path works. Carries no secrets.
 */
export function buildInfo(): BuildInfo {
  return {
    appEnv: appEnv(),
    commit: process.env.COMMIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown",
    packages: {
      engine: ENGINE_VERSION,
      intake: INTAKE_VERSION,
      recommendations: RECOMMENDATIONS_VERSION,
    },
  };
}
