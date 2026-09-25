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

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`${name} is not set. See apps/portal/.env.example.`);
  }
  return value;
}

/** Whether the Supabase variables are present, so the proxy can refuse cleanly when they are not. */
export function supabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY);
}

/** The Supabase project URL. Server-only; every Supabase call is made on the server. */
export function supabaseUrl(): string {
  return required("SUPABASE_URL");
}

/** The publishable key: requests made with it run as the signed-in user, under row level security. */
export function supabasePublishableKey(): string {
  return required("SUPABASE_PUBLISHABLE_KEY");
}

/** The absolute base URL of this deployment, for links in email and auth redirects. */
export function appBaseUrl(): string {
  return required("APP_BASE_URL").replace(/\/+$/, "");
}

/**
 * The secret survey tokens are derived with and start stamps signed with, under separate labels
 * (Milestone 5 plan, 4.1). Server-only; the database never holds it. Rotate only between campaigns:
 * an open campaign's links depend on it.
 */
export function surveyTokenSecret(): string {
  return required("SURVEY_TOKEN_SECRET");
}

/** Resend's API key: survey and campaign mail on staging and production. */
export function resendApiKey(): string {
  return required("RESEND_API_KEY");
}

/** The local stack's mail catcher, which stands in for Resend when APP_ENV is local. */
export function mailpitUrl(): string {
  return (process.env.MAILPIT_URL ?? "http://127.0.0.1:55324").replace(/\/+$/, "");
}
