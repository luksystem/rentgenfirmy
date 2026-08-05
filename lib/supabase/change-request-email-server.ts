import { formatPartyName } from "@/lib/party/display-name";
import {
  buildChangeRequestDeliveryEmail,
  changeRequestToEmailEntry,
} from "@/lib/email/change-request-templates";
import { isEmailAudienceEnabled } from "@/lib/email/notification-routing";
import { sendTransactionalEmail } from "@/lib/email/send";
import { resolveCompanyProfileDocumentServer } from "@/lib/supabase/company-profile-server";
import { fetchEmailSettingsServer } from "@/lib/supabase/email-settings-server";
import type { ProjectChangeRequest } from "@/lib/dashboard/change-request-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  rowToChangeRequest,
  type ChangeRequestRow,
} from "@/lib/supabase/project-change-request-repository";
import { CHANGE_REQUEST_ATTACHMENTS_BUCKET } from "@/lib/supabase/project-change-request-attachments-repository";

/** Dłuższe okno niż standardowe (1h) — link ląduje w treści maila, więc musi przeżyć do momentu,
 *  gdy klient go faktycznie otworzy, nie tylko do momentu wysyłki. */
const EMAIL_PHOTO_SIGNED_URL_TTL_SEC = 60 * 60 * 24 * 7;

/** Zdjęcie robocze z budowy trafia do maila tylko z PIERWSZEJ pozycji, tylko gdy nadawca tego nie
 *  odznaczy (checkbox w podglądzie) — a nawet wtedy dopiero po sprawdzeniu, że w ogóle jest zdjęcie. */
async function fetchFirstChangeRequestPhotoUrl(changeRequestId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("project_change_request_attachments")
    .select("storage_path")
    .eq("change_request_id", changeRequestId)
    .eq("media_kind", "image")
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();

  const storagePath = (data as { storage_path?: string } | null)?.storage_path;
  if (!storagePath) {
    return null;
  }

  const { data: signed } = await supabase.storage
    .from(CHANGE_REQUEST_ATTACHMENTS_BUCKET)
    .createSignedUrl(storagePath, EMAIL_PHOTO_SIGNED_URL_TTL_SEC);

  return signed?.signedUrl ?? null;
}

/**
 * "reminder" — przypomnienie o zmianach już kiedyś ujętych w paczce/przypomnieniu (sent_at ustawiony),
 * wciąż oczekujących na klienta. "new_batch" — pierwsza wysyłka wybranych (checkboxy) zmian, które
 * jeszcze nigdy nie były w takiej paczce (sent_at puste) — po wysyłce ustawia sent_at.
 */
export type ChangeRequestEmailScope = "single" | "reminder" | "new_batch";

async function fetchProjectContext(projectId: string) {
  const supabase = getSupabaseAdmin();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, client_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    throw new Error(projectError.message);
  }
  if (!project) {
    throw new Error("Nie znaleziono projektu.");
  }

  let clientEmail = "";
  let clientName = "Klient";

  if (project.client_id) {
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("first_name, last_name, email")
      .eq("id", project.client_id)
      .maybeSingle();

    if (clientError) {
      throw new Error(clientError.message);
    }

    clientEmail = String(client?.email ?? "").trim();
    clientName =
      formatPartyName({
        firstName: String(client?.first_name ?? "").trim(),
        lastName: String(client?.last_name ?? "").trim(),
      }) || clientName;
  }

  return { projectName: String(project.name ?? "Projekt"), clientEmail, clientName };
}

async function fetchPendingChangeRequests(
  projectId: string,
  filter: { sentAt: "set" | "unset" } | { ids: string[] },
): Promise<ProjectChangeRequest[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase.from("project_change_requests").select("*").eq("project_id", projectId);

  if ("ids" in filter) {
    // Paczka może zawierać zarówno szkice (jeszcze nigdy nie wysłane klientowi wcale — wysyłka w
    // paczce jest ich pierwszym zgłoszeniem) jak i zmiany już zgłoszone pojedynczo, ale jeszcze
    // nigdy nie ujęte w paczce/przypomnieniu.
    query = query.in("id", filter.ids).in("status", ["draft", "pending_client"]);
  } else if (filter.sentAt === "set") {
    query = query.eq("status", "pending_client").not("sent_at", "is", null);
  } else {
    query = query.eq("status", "pending_client").is("sent_at", null);
  }

  const { data, error } = await query
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToChangeRequest(row as ChangeRequestRow));
}

/** Generuje (jeśli brak) publiczny token bez zmiany statusu — sama wysyłka decyduje o statusie. */
async function ensurePublicLink(changeRequest: ProjectChangeRequest): Promise<ProjectChangeRequest> {
  if (changeRequest.publicEnabled && changeRequest.publicToken) {
    return changeRequest;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_change_requests")
    .update({
      public_token: changeRequest.publicToken ?? crypto.randomUUID(),
      public_enabled: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", changeRequest.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToChangeRequest(data as ChangeRequestRow);
}

type ChangeRequestEmailTarget = {
  changeRequests: ProjectChangeRequest[];
  recipientEmail: string;
  recipientName: string;
  intro: string;
  projectName: string;
};

async function resolveChangeRequestEmailTarget(input: {
  projectId: string;
  scope: ChangeRequestEmailScope;
  changeRequestId?: string;
  changeRequestIds?: string[];
}): Promise<ChangeRequestEmailTarget> {
  const context = await fetchProjectContext(input.projectId);

  if (!context.clientEmail) {
    throw new Error("Klient nie ma adresu e-mail w systemie.");
  }

  let changeRequests: ProjectChangeRequest[];
  let intro: string;

  if (input.scope === "single") {
    if (!input.changeRequestId) {
      throw new Error("Brak identyfikatora zmiany.");
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("project_change_requests")
      .select("*")
      .eq("id", input.changeRequestId)
      .eq("project_id", input.projectId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }
    if (!data) {
      throw new Error("Nie znaleziono zmiany.");
    }

    const changeRequest = rowToChangeRequest(data as ChangeRequestRow);
    if (changeRequest.status !== "draft") {
      throw new Error("Ta zmiana nie jest już szkicem.");
    }

    changeRequests = [await ensurePublicLink(changeRequest)];
    intro =
      "Przesyłamy zmianę w projekcie do Państwa akceptacji. Poniżej znajdują się szczegóły, koszt oraz przycisk do decyzji.";
  } else if (input.scope === "new_batch") {
    const ids = input.changeRequestIds ?? [];
    if (!ids.length) {
      throw new Error("Wybierz co najmniej jedną zmianę do wysłania.");
    }

    const selected = await fetchPendingChangeRequests(input.projectId, { ids });
    if (!selected.length) {
      throw new Error("Nie znaleziono wybranych zmian oczekujących na akceptację klienta.");
    }

    changeRequests = await Promise.all(selected.map((entry) => ensurePublicLink(entry)));
    intro = `Przesyłamy ${changeRequests.length} ${
      changeRequests.length === 1 ? "zmianę" : changeRequests.length < 5 ? "zmiany" : "zmian"
    } w projekcie oczekujących na Państwa akceptację. Każdą zmianę można zaakceptować lub odrzucić osobno — poniżej przycisk do każdej z nich.`;
  } else {
    const pending = await fetchPendingChangeRequests(input.projectId, { sentAt: "set" });
    if (!pending.length) {
      throw new Error("Brak zmian do przypomnienia — żadna nie była jeszcze wysłana w paczce.");
    }

    changeRequests = await Promise.all(pending.map((entry) => ensurePublicLink(entry)));
    intro = `Przypominamy o ${changeRequests.length} ${
      changeRequests.length === 1 ? "zmianie" : changeRequests.length < 5 ? "zmianach" : "zmianach"
    } w projekcie wciąż oczekujących na Państwa akceptację. Każdą zmianę można zaakceptować lub odrzucić osobno — poniżej przycisk do każdej z nich.`;
  }

  return {
    changeRequests,
    recipientEmail: context.clientEmail,
    recipientName: context.clientName,
    intro,
    projectName: context.projectName,
  };
}

async function buildChangeRequestEmailEntries(
  changeRequests: ProjectChangeRequest[],
  includePhoto: boolean,
) {
  const entries = changeRequests.map(changeRequestToEmailEntry);
  const photoUrl = entries.length ? await fetchFirstChangeRequestPhotoUrl(changeRequests[0].id) : null;
  if (includePhoto && photoUrl) {
    entries[0] = { ...entries[0], photoUrl };
  }
  return { entries, hasPhoto: Boolean(photoUrl) };
}

/** Buduje treść maila (podgląd) bez wysyłki ani zmiany statusu — do dialogu "podgląd + notatka". */
export async function previewChangeRequestEmailServer(input: {
  projectId: string;
  scope: ChangeRequestEmailScope;
  changeRequestId?: string;
  changeRequestIds?: string[];
  note?: string | null;
  includePhoto?: boolean;
}) {
  const target = await resolveChangeRequestEmailTarget(input);
  const { entries, hasPhoto } = await buildChangeRequestEmailEntries(
    target.changeRequests,
    input.includePhoto ?? true,
  );

  const [settings, company] = await Promise.all([
    fetchEmailSettingsServer(),
    resolveCompanyProfileDocumentServer(),
  ]);

  const template = buildChangeRequestDeliveryEmail({
    recipientName: target.recipientName,
    projectName: target.projectName,
    intro: target.intro,
    entries,
    settings,
    company,
    senderNote: input.note,
  });

  return {
    subject: template.subject,
    html: template.html,
    to: target.recipientEmail,
    changeRequestCount: target.changeRequests.length,
    hasPhoto,
  };
}

export async function sendChangeRequestEmails(input: {
  projectId: string;
  scope: ChangeRequestEmailScope;
  changeRequestId?: string;
  changeRequestIds?: string[];
  note?: string | null;
  includePhoto?: boolean;
}) {
  const target = await resolveChangeRequestEmailTarget(input);
  const { entries } = await buildChangeRequestEmailEntries(
    target.changeRequests,
    input.includePhoto ?? true,
  );

  const [settings, company] = await Promise.all([
    fetchEmailSettingsServer(),
    resolveCompanyProfileDocumentServer(),
  ]);

  if (!isEmailAudienceEnabled(settings.routing, "change_request_delivery", "client")) {
    throw new Error("Wysyłka e-mail do klienta jest wyłączona w Ustawieniach e-mail → Kiedy wysyłać.");
  }

  const template = buildChangeRequestDeliveryEmail({
    recipientName: target.recipientName,
    projectName: target.projectName,
    intro: target.intro,
    entries,
    settings,
    company,
    senderNote: input.note,
  });

  const result = await sendTransactionalEmail({
    to: target.recipientEmail,
    subject: template.subject,
    html: template.html,
  });

  // Wysyłka to jednocześnie zgłoszenie zmiany do klienta — dopiero teraz przechodzi w
  // "Oczekuje na klienta", zeby podglad maila nie zobowiazywal do niczego przed potwierdzeniem.
  if (input.scope === "single" && input.changeRequestId) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("project_change_requests")
      .update({
        status: "pending_client",
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.changeRequestId)
      .eq("status", "draft");

    if (error) {
      throw new Error(error.message);
    }

    void import("@/lib/project-activity/touch-active").then(({ maybeActivateProjectFromActivity }) =>
      maybeActivateProjectFromActivity(input.projectId),
    );
  }

  // Paczka i przypomnienie oznaczają wysłane zmiany jako "ujęte w paczce" — dzięki temu kolejne
  // "Wyślij paczkę do akceptacji" nie proponuje ich ponownie, a "Przypomnij o akceptacjach" wie,
  // że już były wysłane.
  if (input.scope === "new_batch" || input.scope === "reminder") {
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();
    const ids = target.changeRequests.map((entry) => entry.id);

    // Paczka może zawierać szkice — wysyłka w niej jest ich pierwszym zgłoszeniem do klienta,
    // więc dopiero teraz przechodzą w "Oczekuje na klienta" (ten sam moment co "single").
    const draftIds = target.changeRequests
      .filter((entry) => entry.status === "draft")
      .map((entry) => entry.id);
    if (draftIds.length) {
      const { error: submitError } = await supabase
        .from("project_change_requests")
        .update({ status: "pending_client", submitted_at: now, updated_at: now })
        .in("id", draftIds)
        .eq("status", "draft");

      if (submitError) {
        throw new Error(submitError.message);
      }

      void import("@/lib/project-activity/touch-active").then(({ maybeActivateProjectFromActivity }) =>
        maybeActivateProjectFromActivity(input.projectId),
      );
    }

    const { error } = await supabase
      .from("project_change_requests")
      .update({ sent_at: now })
      .in("id", ids);

    if (error) {
      throw new Error(error.message);
    }
  }

  return {
    ok: true as const,
    recipientEmail: target.recipientEmail,
    changeRequestCount: target.changeRequests.length,
    subject: template.subject,
    emailSkipped: result.skipped,
  };
}
