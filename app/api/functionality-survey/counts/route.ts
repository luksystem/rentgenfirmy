import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth/api-auth";
import { countPendingFunctionalitySurveyReviews } from "@/lib/supabase/project-functionality-survey-server";

export async function GET() {
  const session = await getSessionProfile();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const counts = await countPendingFunctionalitySurveyReviews(session.profile);
    return NextResponse.json(counts);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd." },
      { status: 500 },
    );
  }
}
