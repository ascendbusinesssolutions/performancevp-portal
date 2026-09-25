import { type NextRequest, NextResponse } from "next/server";

import { DIRECTORY_BUCKET } from "@/lib/directory/storage";
import { cronAuthorised } from "@/lib/jobs";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The daily job (Milestone 3 plan, Section 5.6), called by Vercel Cron with the CRON_SECRET bearer
 * token. It expires undecided uploads, removes decided uploads' files from the bucket, purges
 * directory records deactivated 30 or more days ago, and records the run, so a missed run shows as
 * a gap. Milestones 5, 8 and 9 add their jobs here.
 */

export async function GET(request: NextRequest) {
  if (!cronAuthorised(request)) return new NextResponse(null, { status: 401 });
  const admin = createAdminClient();

  const expired = await admin.rpc("expire_directory_uploads");
  const awaiting = await admin.rpc("uploads_awaiting_file_removal");
  let filesRemoved = 0;
  for (const upload of awaiting.data ?? []) {
    const removed = await admin.storage.from(DIRECTORY_BUCKET).remove([upload.storage_path]);
    if (!removed.error) {
      await admin.rpc("mark_upload_file_removed", { p_upload_id: upload.upload_id });
      filesRemoved += 1;
    }
  }
  const purged = await admin.rpc("purge_deactivated_employees", {});

  const detail = {
    uploads_expired: expired.data ?? null,
    files_removed: filesRemoved,
    purge: purged.data ?? null,
    errors: [expired.error, awaiting.error, purged.error].filter(Boolean).map((e) => e!.code),
  };
  await admin.rpc("record_job_run", { p_job: "daily", p_detail: detail });
  return NextResponse.json(detail, { status: detail.errors.length ? 500 : 200 });
}
