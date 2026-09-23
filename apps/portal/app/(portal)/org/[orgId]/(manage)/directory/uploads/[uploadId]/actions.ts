"use server";

import { redirect } from "next/navigation";

import type { FormState } from "@/lib/auth/form-state";
import { authCopy } from "@/lib/copy/auth";
import { directoryCopy } from "@/lib/copy/directory";
import { removeUploadFile } from "@/lib/directory/storage";
import { createClient } from "@/lib/supabase/server";

// Both actions run as the signed-in person; the database decides whether they may manage this
// organisation's directory and writes the audit entry. Once the upload is decided its file is
// removed from the bucket; the daily job removes any that this misses.

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function failure(message: string | undefined): FormState {
  if (message?.includes("has changed since")) return { error: directoryCopy["preview.stale"] };
  if (message?.includes("confirm the leavers"))
    return { error: directoryCopy["preview.leaversWarning"] };
  if (message?.includes("no longer awaiting"))
    return { error: directoryCopy["preview.noLongerStaged"] };
  return { error: authCopy["error.generic"] };
}

async function storagePath(uploadId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("directory_uploads")
    .select("storage_path")
    .eq("id", uploadId)
    .maybeSingle();
  return data?.storage_path ?? null;
}

export async function applyUpload(_previous: FormState, formData: FormData): Promise<FormState> {
  const organisationId = text(formData, "organisationId");
  const uploadId = text(formData, "uploadId");
  const supabase = await createClient();
  const { error } = await supabase.rpc("apply_directory_upload", {
    p_upload_id: uploadId,
    p_preview_hash: text(formData, "previewHash"),
    p_confirm_leavers: formData.get("confirmLeavers") === "on",
  });
  if (error) return failure(error.message);
  const path = await storagePath(uploadId);
  if (path) await removeUploadFile(uploadId, path);
  redirect(`/org/${organisationId}/directory?notice=applied`);
}

export async function discardUpload(_previous: FormState, formData: FormData): Promise<FormState> {
  const organisationId = text(formData, "organisationId");
  const uploadId = text(formData, "uploadId");
  const supabase = await createClient();
  const { error } = await supabase.rpc("discard_directory_upload", { p_upload_id: uploadId });
  if (error) return failure(error.message);
  const path = await storagePath(uploadId);
  if (path) await removeUploadFile(uploadId, path);
  redirect(`/org/${organisationId}/directory?notice=discarded`);
}
