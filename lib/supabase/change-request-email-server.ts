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

export type ChangeRequestEmailScope = "single" | "client_all_pending";

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

async function fetchPendingChangeRequests(projectId: string): Promise<ProjectChangeRequest[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_change_requests")
    .select("*")
    .eq("project_id", projectId)
    .eq("status", "pending_client")
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
  } else {
    const pending = await fetchPendingChangeRequests(input.projectId);
    if (!pending.length) {
      throw new Error("Brak zmian oczekujących na akceptację klienta.");
    }

    changeRequests = await Promise.all(pending.map((entry) => ensurePublicLink(entry)));
    intro = `Przesyłamy ${changeRequests.length} ${
      changeRequests.length === 1 ? "zmianę" : changeRequests.length < 5 ? "zmiany" : "zmian"
    } w projekcie oczekujących na Państwa akceptację. Każdą zmianę można zaakceptować lub odrzucić osobno — poniżej przycisk do każdej z nich.`;
  }

  return {
    changeRequests,
    recipientEmail: context.clientEmail,
    recipientName: context.clientName,
    intro,
    projectName: context.projectName,
  };
}

/** Buduje treść maila (podgląd) bez wysyłki ani zmiany statusu — do dialogu "podgląd + notatka". */
export async function previewChangeRequestEmailServer(input: {
  projectId: string;
  scope: ChangeRequestEmailScope;
  changeRequestId?: string;
  note?: string | null;
}) {
  const target = await resolveChangeRequestEmailTarget(input);
  const entries = target.changeRequests.map(changeRequestToEmailEntry);

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
  };
}

export async function sendChangeRequestEmails(input: {
  projectId: string;
  scope: ChangeRequestEmailScope;
  changeRequestId?: string;
  note?: string | null;
}) {
  const target = await resolveChangeRequestEmailTarget(input);
  const entries = target.changeRequests.map(changeRequestToEmailEntry);

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

  return {
    ok: true as const,
    recipientEmail: target.recipientEmail,
    changeRequestCount: target.changeRequests.length,
    subject: template.subject,
    emailSkipped: result.skipped,
  };
}
