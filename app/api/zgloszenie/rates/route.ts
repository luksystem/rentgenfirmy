import { NextResponse } from "next/server";
import { getPublicServiceRates } from "@/lib/supabase/service-intake-server";

export async function GET() {
  try {
    const rates = await getPublicServiceRates();
    return NextResponse.json({ rates });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się pobrać stawek." },
      { status: 500 },
    );
  }
}
