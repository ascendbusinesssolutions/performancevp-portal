"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { buttonClass } from "@/components/button";
import { Notice } from "@/components/ui";
import { directoryCopy } from "@/lib/copy/directory";
import { DIRECTORY_UPLOAD_MAX_BYTES } from "@/lib/directory/columns";
import type { UploadError } from "@/lib/directory/errors";

/**
 * Sends the chosen file as the request body to the upload route. The file name goes in a header,
 * never in the URL. A staged upload opens its preview; a rejected one lists its problems by row
 * and column.
 */
export function UploadForm({ organisationId }: { organisationId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<UploadError[]>([]);
  const [rejected, setRejected] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = new FormData(event.currentTarget).get("file");
    setErrors([]);
    setRejected(false);
    if (!(file instanceof File) || file.size === 0) {
      setErrors([{ row: 0, column: "", message: directoryCopy["page.fileFirst"] }]);
      return;
    }
    if (file.size > DIRECTORY_UPLOAD_MAX_BYTES) {
      setErrors([{ row: 0, column: "", message: directoryCopy["error.fileTooLarge"] }]);
      return;
    }
    setPending(true);
    try {
      const response = await fetch(`/org/${organisationId}/directory/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "X-File-Name": encodeURIComponent(file.name),
        },
        body: file,
      });
      const outcome = (await response.json().catch(() => null)) as {
        uploadId?: string;
        status?: string;
        errors?: UploadError[];
      } | null;
      if (outcome?.status === "staged" && outcome.uploadId) {
        router.push(`/org/${organisationId}/directory/uploads/${outcome.uploadId}`);
        return;
      }
      setRejected(outcome?.status === "rejected" && (outcome.errors ?? []).some((e) => e.row > 0));
      setErrors(
        outcome?.errors?.length
          ? outcome.errors
          : [{ row: 0, column: "", message: directoryCopy["error.serverFailed"] }],
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-md">
      {rejected ? <Notice tone="problem">{directoryCopy["page.rejected"]}</Notice> : null}
      {errors.length > 0 ? (
        <ul
          role="alert"
          className="mb-6 space-y-1 border-l-2 border-gold-deep bg-gold-10 px-4 py-2 text-sm text-slate"
        >
          {errors.map((e, index) => (
            <li key={index}>
              {e.row > 0 ? (
                <span className="font-mono text-grey">
                  {directoryCopy["page.errorRow"]} {e.row}
                  {e.column ? `, ${e.column}` : ""}:{" "}
                </span>
              ) : null}
              {e.message}
            </li>
          ))}
        </ul>
      ) : null}
      <label className="block">
        <span className="block text-sm text-grey">{directoryCopy["page.choose"]}</span>
        <input
          type="file"
          name="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="mt-1 block text-sm text-slate"
        />
      </label>
      <p className="mt-1 text-xs text-grey">{directoryCopy["page.fileLimit"]}</p>
      <button type="submit" disabled={pending} className={`mt-4 ${buttonClass("primary")}`}>
        {pending ? directoryCopy["page.uploading"] : directoryCopy["page.upload"]}
      </button>
    </form>
  );
}
