import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserDisplayName } from "@/lib/auth/types";
import { mapProfileRow } from "@/lib/supabase/profile-mappers";
import { getSupabaseServer } from "@/lib/supabase/server";
import { fetchEmployeeXpSummaryServer } from "@/lib/supabase/xp-server";
import { XP_SETTINGS_ID, normalizeXpSettings, type XpSettings } from "@/lib/xp/settings";
import type { XpEmployeeAdminDetail, XpRedemption } from "@/lib/xp/types";

type AdminClient = SupabaseClient;

type XpRedemptionRow = {
  id: string;
  employee_id: string;
  points_redeemed: number;
  point_weight_at_time: number;
  amount: number;
  note: string;
  is_paid: boolean;
  paid_at: string | null;
  decided_by: string | null;
  created_at: string;
};

function mapRedemption(row: XpRedemptionRow): XpRedemption {
  return {
    id: row.id,
    employeeId: row.employee_id,
    pointsRedeemed: row.points_redeemed,
    pointWeightAtTime: row.point_weight_at_time,
    amount: row.amount,
    note: row.note,
    isPaid: row.is_paid,
    paidAt: row.paid_at,
    decidedBy: row.decided_by,
    createdAt: row.created_at,
  };
}

export async function updateXpCriterionServer(
  admin: AdminClient,
  criterionId: string,
  input: { points: number; isActive: boolean },
): Promise<void> {
  const { error } = await admin
    .from("xp_criteria")
    .update({ points: input.points, is_active: input.isActive, updated_at: new Date().toISOString() })
    .eq("id", criterionId);
  if (error) {
    throw new Error(error.message);
  }
}

/** `xp_settings` w `app_settings` ma otwarte RLS (jak inne ustawienia) — anon klient wystarczy. */
export async function fetchXpSettingsServer(): Promise<XpSettings> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("app_settings")
    .select("data")
    .eq("id", XP_SETTINGS_ID)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return normalizeXpSettings(data?.data);
}

export async function saveXpSettingsServer(settings: XpSettings): Promise<XpSettings> {
  const supabase = getSupabaseServer();
  const normalized = normalizeXpSettings(settings);
  const { data, error } = await supabase
    .from("app_settings")
    .upsert(
      { id: XP_SETTINGS_ID, data: normalized, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    )
    .select("data")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return normalizeXpSettings(data.data);
}

export async function fetchXpEmployeeDetailForAdminServer(
  admin: AdminClient,
  employeeId: string,
): Promise<XpEmployeeAdminDetail> {
  const [summary, profileResult, { data: redemptionRows, error }] = await Promise.all([
    fetchEmployeeXpSummaryServer(admin, employeeId),
    admin.from("profiles").select("*").eq("id", employeeId).maybeSingle(),
    admin
      .from("xp_redemptions")
      .select("*")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false }),
  ]);
  if (error) {
    throw new Error(error.message);
  }

  return {
    employeeId,
    employeeName: profileResult.data ? getUserDisplayName(mapProfileRow(profileResult.data)) : "—",
    totalPoints: summary.totalPoints,
    history: summary.history,
    redemptions: ((redemptionRows ?? []) as XpRedemptionRow[]).map(mapRedemption),
  };
}

export async function createXpRedemptionServer(
  admin: AdminClient,
  input: { employeeId: string; pointsRedeemed: number; pointWeightAtTime: number; amount: number; note: string },
  decidedBy: string,
): Promise<XpRedemption> {
  const now = new Date().toISOString();
  const { data: redemption, error: redemptionError } = await admin
    .from("xp_redemptions")
    .insert({
      employee_id: input.employeeId,
      points_redeemed: input.pointsRedeemed,
      point_weight_at_time: input.pointWeightAtTime,
      amount: input.amount,
      note: input.note,
      decided_by: decidedBy,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();
  if (redemptionError) {
    throw new Error(redemptionError.message);
  }

  const { error: ledgerError } = await admin.from("xp_ledger_entries").insert({
    employee_id: input.employeeId,
    points: -input.pointsRedeemed,
    reason: input.note ? `Wymiana na premię: ${input.note}` : "Wymiana na premię",
    source_type: "redemption",
    source_id: redemption.id,
  });
  if (ledgerError) {
    throw new Error(ledgerError.message);
  }

  return mapRedemption(redemption as XpRedemptionRow);
}

export async function markXpRedemptionPaidServer(admin: AdminClient, redemptionId: string): Promise<void> {
  const { error } = await admin
    .from("xp_redemptions")
    .update({ is_paid: true, paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", redemptionId);
  if (error) {
    throw new Error(error.message);
  }
}
