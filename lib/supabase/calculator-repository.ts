import type { CalculatorOffer } from "@/lib/calculator/types";
import { getSupabase } from "@/lib/supabase/client";
import { calculatorOfferToInsert, rowToCalculatorOffer } from "@/lib/supabase/calculator-mappers";

export async function fetchCalculatorOffers(): Promise<CalculatorOffer[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("calculator_offers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToCalculatorOffer);
}

export async function upsertCalculatorOffer(offer: CalculatorOffer): Promise<CalculatorOffer> {
  const supabase = getSupabase();
  const payload = calculatorOfferToInsert({ ...offer, updatedAt: new Date().toISOString() });

  const { data, error } = await supabase
    .from("calculator_offers")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToCalculatorOffer(data);
}

export async function deleteCalculatorOffer(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("calculator_offers").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
