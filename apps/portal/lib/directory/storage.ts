import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export const DIRECTORY_BUCKET = "directory-uploads";
export const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Removes an upload's file from the private bucket once the upload is decided, and records that it
 * is gone; the hash and metadata stay. Through the Storage API, because deleting the row in SQL
 * would leave the file behind. The daily job catches anything this misses.
 */
export async function removeUploadFile(uploadId: string, storagePath: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.storage.from(DIRECTORY_BUCKET).remove([storagePath]);
  if (!error) await admin.rpc("mark_upload_file_removed", { p_upload_id: uploadId });
}
