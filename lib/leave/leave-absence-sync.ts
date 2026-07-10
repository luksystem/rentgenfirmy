import type { getSupabaseAdmin } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

/**
 * Utrzymuje `user_absences` w zgodzie ze statusem wniosku urlopowego z modułu „Moja praca”.
 * Ta tabela jest jedynym sygnałem, jaki silnik podpowiedzi przydziału w Planie Zasobów
 * (`lib/resource-plan/suggestions.ts`) sprawdza, żeby nie podsuwać do zadania osoby będącej
 * na urlopie — bez tej synchronizacji zaakceptowane urlopy byłyby dla niego niewidoczne.
 */
export async function syncApprovedLeaveAbsence(
  admin: AdminClient,
  item: { id: string; profileId: string; startDate: string; endDate: string },
  leaveTypeName: string,
): Promise<void> {
  const { error } = await admin.from("user_absences").upsert(
    {
      user_id: item.profileId,
      leave_request_id: item.id,
      start_date: item.startDate,
      end_date: item.endDate,
      note: leaveTypeName ? `Urlop: ${leaveTypeName} (moduł Moja praca)` : "Urlop (moduł Moja praca)",
      status: "confirmed",
      absence_type_item_id: null,
    },
    { onConflict: "leave_request_id" },
  );
  if (error) {
    throw new Error(error.message);
  }
}

/** Usuwa wpis nieobecności powiązany z wnioskiem — przy cofnięciu decyzji lub wyczyszczeniu podpisu. */
export async function removeLeaveAbsence(admin: AdminClient, leaveRequestId: string): Promise<void> {
  const { error } = await admin.from("user_absences").delete().eq("leave_request_id", leaveRequestId);
  if (error) {
    throw new Error(error.message);
  }
}
