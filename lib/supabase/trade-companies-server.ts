import type { TradeCompanyItem } from "@/lib/trades/company-types";
import { mergeTradeCompanyPools, projectTradeToCompanyItem } from "@/lib/trades/company-pool";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function listTradeCompaniesFromProjects(): Promise<TradeCompanyItem[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_trades")
    .select("name, company, contact_name, email, phone, description")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const pool: TradeCompanyItem[] = [];
  for (const row of data ?? []) {
    const item = projectTradeToCompanyItem({
      name: String(row.name),
      company: String(row.company ?? ""),
      contactName: row.contact_name ? String(row.contact_name) : undefined,
      email: row.email ? String(row.email) : undefined,
      phone: row.phone ? String(row.phone) : undefined,
      description: row.description ? String(row.description) : undefined,
    });
    if (item) {
      pool.push(item);
    }
  }

  return mergeTradeCompanyPools(pool);
}
