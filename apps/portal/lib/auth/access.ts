import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { type Access, DESTINATION_PATHS, destinationFor, parseAccess } from "./route";

/** The signed-in person's access, read from the database (public.my_access), or null. */
export async function getAccess(): Promise<Access | null> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return null;
  const { data, error } = await supabase.rpc("my_access");
  if (error) return null;
  return parseAccess(data);
}

/**
 * For pages inside the signed-in area: returns the person's access, or redirects to wherever they
 * must go first (sign in, TOTP enrolment or challenge, a password sign-in, or waiting for access).
 */
export async function requireAccess(): Promise<Access> {
  const access = await getAccess();
  const destination = destinationFor(access);
  if (destination !== "portal") redirect(DESTINATION_PATHS[destination]);
  return access as Access;
}

/** For the pages on the way in (TOTP, setting a password): a live session is enough. */
export async function requireSession(): Promise<Access> {
  const access = await getAccess();
  if (access === null || !access.sessionLive) redirect("/login");
  return access;
}
