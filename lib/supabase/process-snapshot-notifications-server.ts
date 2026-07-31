import "server-only";

import { formatPartyName } from "@/lib/party/display-name";
import {
  flattenProcessItems,
  isSnapshotTemplatePayload,
  type ProcessTemplate,
  type ProjectProcessSnapshot,
} from "@/lib/process/types";
import { sendNotificationChannels } from "@/lib/notifications/dispatch";
import { sendPushToUser } from "@/lib/push/send-push";
import { escapeEmailHtml } from "@/lib/email/layout";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { rowToProjectProcess } from "@/lib/supabase/process-mappers";
import { fetchProcessTemplateByProjectTypeServer } from "@/lib/supabase/process-server";

/** Znajduje element w szablonie (snapshot projektu jeśli zakotwiczony, inaczej żywy szablon typu
 *  projektu) razem z etapem, do którego należy — potrzebne do wiadomości klienta i odpowiedzialnego. */
async function resolveSnapshotItemContext(projectId: string, templateItemId: string) {
  const supabase = getSupabaseAdmin();

  const [{ data: project, error: projectError }, { data: processRow, error: processError }] =
    await Promise.all([
      supabase.from("projects").select("id, name, type, client_id").eq("id", projectId).maybeSingle(),
      supabase.from("project_processes").select("*").eq("project_id", projectId).maybeSingle(),
    ]);

  if (projectError) throw new Error(projectError.message);
  if (!project) throw new Error("Nie znaleziono projektu.");
  if (processError) throw new Error(processError.message);

  const process = processRow ? rowToProjectProcess(processRow) : null;
  const liveTemplate = process?.templateSnapshot
    ? null
    : await fetchProcessTemplateByProjectTypeServer(project.type, supabase);
  const template: ProcessTemplate | null = process?.templateSnapshot ?? liveTemplate;

  if (!template) {
    throw new Error("Brak szablonu procesu dla tego projektu.");
  }

  const flatItem = flattenProcessItems(template).find((entry) => entry.id === templateItemId);
  if (!flatItem) {
    throw new Error("Nie znaleziono elementu w szablonie procesu.");
  }

  const stage = template.stages.find((entry) =>
    entry.milestones.some((milestone) => milestone.id === flatItem.milestoneId),
  );

  let clientEmail = "";
  let clientPhone = "";
  let clientName = "Klient";
  if (project.client_id) {
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("first_name, last_name, email, phone")
      .eq("id", project.client_id)
      .maybeSingle();
    if (clientError) throw new Error(clientError.message);
    clientEmail = String(client?.email ?? "").trim();
    clientPhone = String(client?.phone ?? "").trim();
    clientName =
      formatPartyName({
        firstName: String(client?.first_name ?? "").trim(),
        lastName: String(client?.last_name ?? "").trim(),
      }) || clientName;
  }

  return {
    projectName: String(project.name ?? "Projekt"),
    stageId: stage?.id ?? null,
    itemTitle: flatItem.title,
    clientMessage: isSnapshotTemplatePayload(flatItem.defaultPayload)
      ? flatItem.defaultPayload.clientMessage.trim()
      : "",
    clientEmail,
    clientPhone,
    clientName,
  };
}

export async function resolveStageResponsibleUserId(projectId: string, stageId: string | null) {
  if (!stageId) {
    return null;
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("report_stage_responsible", { p_project_id: projectId });
  if (error) {
    console.warn("[process-snapshot] report_stage_responsible failed:", error.message);
    return null;
  }
  const row = (data ?? []).find((entry: { stage_id: string }) => entry.stage_id === stageId);
  return (row?.responsible_user_id as string | null | undefined) ?? null;
}

/** Wysyłka do klienta (SMS + mail ze zdjęciem) i push do odpowiedzialnego za etap, po wgraniu
 *  zdjęcia dla elementu procesu typu "snapshot". Błędy poszczególnych kanałów nie przerywają się
 *  nawzajem — brak telefonu klienta nie ma blokować maila, brak subskrypcji push nie ma wywalać SMS-a. */
export async function sendProcessSnapshotNotifications(input: {
  projectId: string;
  templateItemId: string;
  snapshot: ProjectProcessSnapshot;
}) {
  const context = await resolveSnapshotItemContext(input.projectId, input.templateItemId);

  const employeeNoteHtml = input.snapshot.employeeNote?.trim()
    ? `<p style="margin:0 0 16px;padding:12px 14px;background:#f8fafc;border-left:3px solid #0f172a;border-radius:6px;font-size:14px;line-height:1.6;color:#111827;white-space:pre-wrap;">${escapeEmailHtml(input.snapshot.employeeNote.trim())}</p>`
    : "";
  const photoBlockHtml = `<p style="margin:0 0 8px;"><img src="${escapeEmailHtml(input.snapshot.url)}" alt="Zdjęcie" style="max-width:100%;border-radius:12px;display:block;" /></p>`;

  if (context.clientEmail || context.clientPhone) {
    await sendNotificationChannels({
      actionId: "process_snapshot_delivered",
      variables: {
        project_name: context.projectName,
        item_title: context.itemTitle,
        client_message: context.clientMessage,
        photo_url: input.snapshot.url,
      },
      emailHtmlVariables: {
        greeting: `<p style="margin:0 0 12px;font-size:16px;color:#111827;">Dzień dobry ${escapeEmailHtml(context.clientName)},</p>`,
        employee_note: employeeNoteHtml,
        photo_block: photoBlockHtml,
      },
      emailRecipients: context.clientEmail ? [{ audience: "client", to: context.clientEmail }] : [],
      smsPhone: context.clientPhone || null,
    });
  }

  const responsibleUserId = await resolveStageResponsibleUserId(input.projectId, context.stageId);
  if (responsibleUserId) {
    const supabase = getSupabaseAdmin();
    const title = `Wysłano zdjęcie: ${context.itemTitle}`;
    const body = `${context.projectName} — zdjęcie wysłane klientowi (${input.snapshot.uploadedByName}).`;
    const linkUrl = `/projekty/${input.projectId}/proces`;
    const sourceId = `process_snapshot:${input.snapshot.id}`;

    await supabase
      .from("user_notifications")
      .insert({
        id: crypto.randomUUID(),
        profile_id: responsibleUserId,
        kind: "process_snapshot_uploaded",
        title,
        body,
        link_url: linkUrl,
        source_id: sourceId,
        created_at: new Date().toISOString(),
      })
      .then(({ error }) => {
        if (error) console.warn("[process-snapshot] user_notifications insert:", error.message);
      });

    try {
      await sendPushToUser(responsibleUserId, { title, body, url: linkUrl, tag: sourceId });
    } catch (pushError) {
      console.warn("[process-snapshot] push failed:", pushError);
    }
  }
}
