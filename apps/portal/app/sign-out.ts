"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/** Ends the session (the database treats it as dead from the next query) and returns to sign in. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login?notice=signed-out");
}
