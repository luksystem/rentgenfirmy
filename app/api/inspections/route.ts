import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-auth";
import { INSPECTION_STATUSES, type InspectionStatus } from "@/lib/inspections/types";
import { listInspections } from "@/lib/supabase/inspection-server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const statusParam = url.searchParams.get("status");
    const status =
      statusParam && INSPECTION_STATUSES.includes(statusParam as InspectionStatus)
        ? (statusParam as InspectionStatus)
        : undefined;

    const items = await listInspections(status);
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania przeglądów." },
      { status: 500 },
    );
  }
}
