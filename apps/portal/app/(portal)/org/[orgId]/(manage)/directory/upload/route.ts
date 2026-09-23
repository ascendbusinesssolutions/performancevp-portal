import { createHash, randomUUID } from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";

import { directoryCopy } from "@/lib/copy/directory";
import { sydneyToday } from "@/lib/dates";
import { DIRECTORY_UPLOAD_MAX_BYTES } from "@/lib/directory/columns";
import { DIRECTORY_BUCKET, removeUploadFile, XLSX_TYPE } from "@/lib/directory/storage";
import { parseErrors, type UploadError } from "@/lib/directory/errors";
import { validateDirectory } from "@/lib/directory/validate";
import { readWorkbook, WorkbookError, type WorkbookErrorCode } from "@/lib/directory/xlsx-read";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

/**
 * Receives a directory file (Milestone 3 plan, Section 5.2). The body is the file itself; its name
 * travels in a header, never in the URL. In order: the signed-in person must be able to manage this
 * organisation's directory; the file must be at most 4 MiB, checked from the declared length and
 * again while reading; it must be a plain .xlsx that the narrow reader accepts; it is hashed and
 * stored in the private bucket; its rows are validated; and it is staged by the service role for
 * that person, which checks their right again and records the upload whatever the outcome.
 */

const READ_ERRORS: Record<WorkbookErrorCode, keyof typeof directoryCopy> = {
  not_xlsx: "error.notXlsx",
  encrypted: "error.encrypted",
  unsafe: "error.unsafe",
  malformed: "error.malformed",
};

function refuse(status: number, message: string) {
  const errors: UploadError[] = [{ row: 0, column: "", message }];
  return NextResponse.json({ status: "rejected", errors }, { status });
}

async function readCapped(request: NextRequest, limit: number): Promise<Uint8Array | null> {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/** The name the person gave the file, for their list of uploads only; never a storage path. */
function uploadName(header: string | null): string {
  let name = "";
  try {
    name = decodeURIComponent(header ?? "");
  } catch {
    // A malformed header is not worth refusing the upload over.
  }
  name = name
    .replace(/[\u0000-\u001f\u007f/\\]/g, "")
    .trim()
    .slice(0, 255);
  return name || "directory.xlsx";
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext<"/org/[orgId]/directory/upload">,
) {
  const { orgId } = await params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return new NextResponse(null, { status: 401 });
  const { data: allowed } = await supabase.rpc("can_manage_directory", {
    p_organisation_id: orgId,
  });
  if (allowed !== true) return new NextResponse(null, { status: 403 });

  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > DIRECTORY_UPLOAD_MAX_BYTES) {
    return refuse(413, directoryCopy["error.fileTooLarge"]);
  }
  const bytes = await readCapped(request, DIRECTORY_UPLOAD_MAX_BYTES);
  if (bytes === null) return refuse(413, directoryCopy["error.fileTooLarge"]);

  let result;
  try {
    result = validateDirectory(readWorkbook(bytes), sydneyToday());
  } catch (error) {
    if (error instanceof WorkbookError) return refuse(422, directoryCopy[READ_ERRORS[error.code]]);
    throw error;
  }

  const fileName = uploadName(request.headers.get("x-file-name"));
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const uploadId = randomUUID();
  const storagePath = `org/${orgId}/directory/${uploadId}.xlsx`;

  const admin = createAdminClient();
  const stored = await admin.storage.from(DIRECTORY_BUCKET).upload(storagePath, bytes, {
    contentType: XLSX_TYPE,
    upsert: false,
  });
  if (stored.error) return refuse(500, directoryCopy["error.serverFailed"]);

  const { data: staged, error } = await admin.rpc("stage_directory_upload", {
    p_actor_user_id: userId,
    p_organisation_id: orgId,
    p_upload_id: uploadId,
    p_file_name: fileName,
    p_byte_size: bytes.byteLength,
    p_sha256: sha256,
    p_storage_path: storagePath,
    p_template_version: result.templateVersion ?? "unknown",
    p_rows: result.rows as unknown as Json,
    p_errors: result.errors as unknown as Json,
  });
  if (error || !staged) {
    await admin.storage.from(DIRECTORY_BUCKET).remove([storagePath]);
    return refuse(500, directoryCopy["error.serverFailed"]);
  }
  const outcome = staged as { status: string; errors: unknown };
  if (outcome.status !== "staged") await removeUploadFile(uploadId, storagePath);
  return NextResponse.json({
    uploadId,
    status: outcome.status,
    errors: parseErrors(outcome.errors),
  });
}
