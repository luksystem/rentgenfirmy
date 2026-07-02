import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-auth";
import { fetchFieldOptions } from "@/lib/supabase/settings-repository";
import { listTradeCompaniesFromProjects } from "@/lib/supabase/trade-companies-server";
import { mergeTradeCompanyPools } from "@/lib/trades/company-pool";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [fieldOptions, fromProjects] = await Promise.all([
      fetchFieldOptions(),
      listTradeCompaniesFromProjects(),
    ]);
    const companies = mergeTradeCompanyPools(fieldOptions.tradeCompanies ?? [], fromProjects);
    return NextResponse.json({ companies });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania firm." },
      { status: 500 },
    );
  }
}
