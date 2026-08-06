// D44 — zapis zgłoszenia pracownika.
//
// Zgłoszenie nie jest osobnym bytem: ląduje jako SZKIC wprost w Ustaleniach albo Zmianach
// projektowych, zależnie od odpowiedzi „czy może mieć wpływ na rozliczenie”. Żadna ścieżka nie
// tworzy zadania — o tym decyduje manager przy klasyfikacji.
import { getSupabase } from "@/lib/supabase/client";
import {
  routeEmployeeReport,
  UNCERTAIN_BILLING_IMPACT_NOTE,
  type BillingImpactAnswer,
  type EmployeeReportTarget,
} from "@/lib/process/employee-report-routing";
import { uploadAgreementAttachmentWithClient } from "@/lib/supabase/project-agreement-attachments-repository";
import { uploadChangeRequestAttachment } from "@/lib/supabase/project-change-request-attachments-repository";
import { fetchStageResponsible } from "@/lib/supabase/stage-responsible-repository";

export type EmployeeReportInput = {
  projectId: string;
  /** Miękkie odniesienie po tekstowym id etapu — patrz komentarz w migracji 270. */
  stageId: string | null;
  title: string;
  body?: string;
  billingImpact: BillingImpactAnswer;
  isUrgent: boolean;
  createdById: string | null;
  createdByName: string;
  photos?: File[];
};

export type EmployeeReportResult = {
  target: EmployeeReportTarget;
  recordId: string;
  /** Ile zdjec faktycznie doszlo. */
  photosUploaded: number;
  /** Powod nieudanego wgrania zdjecia. Zgloszenie i tak powstalo — ale uzytkownik ma sie o tym
   *  dowiedziec, zamiast myslec, ze zdjecie doszlo. Cisza tutaj kosztowala juz jeden test. */
  photoError: string | null;
};

export async function createEmployeeReport(
  input: EmployeeReportInput,
): Promise<EmployeeReportResult> {
  const supabase = getSupabase();
  const routing = routeEmployeeReport(input.billingImpact);

  const title = input.title.trim();
  if (!title) {
    throw new Error("Opis jest wymagany — bez niego zgłoszenie nie niesie żadnej informacji.");
  }

  // Ślad niepewności dopisujemy do treści, a nie do osobnej kolumny: „nie” i „nie wiem” lądują
  // w tym samym module, więc bez tego manager nie odróżniłby ich przy klasyfikacji.
  const bodyParts = [input.body?.trim(), routing.markUncertain ? UNCERTAIN_BILLING_IMPACT_NOTE : null]
    .filter((part): part is string => Boolean(part));

  const shared = {
    project_id: input.projectId,
    title,
    body: bodyParts.join("\n\n"),
    stage_id: input.stageId,
    is_urgent: input.isUrgent,
    created_by_id: input.createdById,
    created_by_name: input.createdByName.trim() || "Pracownik",
    created_by_side: "team",
    // status zostawiamy domyślny ('draft') — szkic czeka na klasyfikację managera.
  };

  const table =
    routing.target === "change_request" ? "project_change_requests" : "project_client_agreements";

  // Ustalenia maja pole "odpowiedzialny" (project_client_agreements.responsible_user_id) — zmiany
  // projektowe go nie maja. Zgloszenie z budowy nie pyta o wlasciciela (pracownik go nie zna),
  // wiec wynika z etapu przez macierz rol — jedno zrodlo prawdy z fetchStageResponsible, to samo,
  // ktore pokazuje "Odpowiedzialny za etap" w widoku procesu. Bez tego ustalenie zostawaloby bez
  // odpowiedzialnego, dopoki ktos recznie by go nie uzupelnil w edycji.
  let responsibleUserId: string | null = null;
  if (routing.target === "agreement" && input.stageId) {
    try {
      const stageResponsible = await fetchStageResponsible(input.projectId);
      responsibleUserId =
        stageResponsible.find((row) => row.stageId === input.stageId)?.responsibleUserId ?? null;
    } catch {
      responsibleUserId = null;
    }
  }

  const insertPayload =
    routing.target === "agreement"
      ? { ...shared, responsible_user_id: responsibleUserId }
      : shared;

  const { data, error } = await supabase.from(table).insert(insertPayload).select("id").single();
  if (error) {
    throw new Error(error.message);
  }

  const recordId = (data as { id: string }).id;

  // Zdjęcia są opcjonalne i NIE mogą wywalić zgłoszenia. Człowiek stoi na budowie i zdążył już
  // opisać problem — utrata tego opisu przez błąd uploadu byłaby gorsza niż brak zdjęcia.
  // Wgrywamy po kolei i liczymy sukcesy: jedno uszkodzone zdjęcie nie może przekreślić reszty.
  let photosUploaded = 0;
  let photoError: string | null = null;
  for (const photo of input.photos ?? []) {
    try {
      if (routing.target === "change_request") {
        await uploadChangeRequestAttachment({
          changeRequestId: recordId,
          file: photo,
          authorName: shared.created_by_name,
          authorSource: "team",
        });
      } else {
        await uploadAgreementAttachmentWithClient({
          agreementId: recordId,
          file: photo,
          authorName: shared.created_by_name,
          authorSource: "team",
          supabase,
        });
      }
      photosUploaded += 1;
    } catch (err) {
      photoError = err instanceof Error ? err.message : "Nie udało się wgrać zdjęcia.";
    }
  }

  return { target: routing.target, recordId, photosUploaded, photoError };
}
