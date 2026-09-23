import { type NextRequest, NextResponse } from "next/server";

import { XLSX_TYPE } from "@/lib/directory/storage";
import { writeTemplate } from "@/lib/directory/xlsx-write";
import { createClient } from "@/lib/supabase/server";

/** The directory template, generated on request for those who may manage the directory. */
export async function GET(
  _request: NextRequest,
  { params }: RouteContext<"/org/[orgId]/directory/template">,
) {
  const { orgId } = await params;
  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("can_manage_directory", {
    p_organisation_id: orgId,
  });
  if (allowed !== true) return new NextResponse(null, { status: 403 });
  return new NextResponse(Buffer.from(writeTemplate()), {
    headers: {
      "Content-Type": XLSX_TYPE,
      "Content-Disposition": 'attachment; filename="PerformanceVP directory template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
