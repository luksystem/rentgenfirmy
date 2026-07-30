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
  photo?: File | null;
};

export type EmployeeReportResult = {
  target: EmployeeReportTarget;
  recordId: string;
  photoUploaded: boolean;
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

  const { data, error } = await supabase.from(table).insert(shared).select("id").single();
  if (error) {
    throw new Error(error.message);
  }

  const recordId = (data as { id: string }).id;

  // Zdjęcie jest opcjonalne i NIE może wywalić zgłoszenia. Człowiek stoi na budowie i zdążył już
  // opisać problem — utrata tego opisu przez błąd uploadu byłaby gorsza niż brak zdjęcia.
  let photoUploaded = false;
  if (input.photo) {
    try {
      if (routing.target === "change_request") {
        await uploadChangeRequestAttachment({
          changeRequestId: recordId,
          file: input.photo,
          authorName: shared.created_by_name,
          authorSource: "team",
        });
      } else {
        await uploadAgreementAttachmentWithClient({
          agreementId: recordId,
          file: input.photo,
          authorName: shared.created_by_name,
          authorSource: "team",
          supabase,
        });
      }
      photoUploaded = true;
    } catch {
      photoUploaded = false;
    }
  }

  return { target: routing.target, recordId, photoUploaded };
}
