import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-auth";
import { countInspectionAlerts } from "@/lib/supabase/inspection-server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const counts = await countInspectionAlerts(user.id);
    return NextResponse.json(counts);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd." },
      { status: 500 },
    );
  }
}
