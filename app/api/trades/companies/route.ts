import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-auth";
import { fetchFieldOptionsServer } from "@/lib/supabase/settings-server";
import { listTradeCompaniesFromProjects } from "@/lib/supabase/trade-companies-server";
import {
  mergeTradeCompaniesWithProjects,
  tradeCompanyItemWithProjects,
} from "@/lib/trades/company-pool";

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
      fetchFieldOptionsServer(),
      listTradeCompaniesFromProjects(),
    ]);
    const settingsPool = (fieldOptions.tradeCompanies ?? []).map(tradeCompanyItemWithProjects);
    const companies = mergeTradeCompaniesWithProjects(settingsPool, fromProjects);
    return NextResponse.json({
      companies,
      categories: fieldOptions.tradeCatalogItems,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd pobierania firm." },
      { status: 500 },
    );
  }
}
