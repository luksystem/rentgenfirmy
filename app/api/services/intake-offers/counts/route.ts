import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-auth";
import { countUnreviewedIntakeOffersServer } from "@/lib/supabase/service-repository-server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const unreviewedCount = await countUnreviewedIntakeOffersServer();
    return NextResponse.json({ unreviewedCount, newCount: unreviewedCount });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd." },
      { status: 500 },
    );
  }
}
