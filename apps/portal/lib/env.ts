const APP_ENVS = ["local", "staging", "production"] as const;

export type AppEnv = (typeof APP_ENVS)[number];

function isAppEnv(value: string | undefined): value is AppEnv {
  return APP_ENVS.some((candidate) => candidate === value);
}

/**
 * Which environment this deployment is, from APP_ENV. The application reads this and never a
 * hosting platform's own environment name, so how staging and production are arranged on the
 * platform (VERCEL_ENV_SPLIT) never touches code. "unset" means the variable is missing or
 * carries a value outside the three known ones.
 */
export function appEnv(): AppEnv | "unset" {
  const value = process.env.APP_ENV;
  return isAppEnv(value) ? value : "unset";
}
