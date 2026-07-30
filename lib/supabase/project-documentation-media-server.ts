import "server-only";

import type { DocumentationMediaItem } from "@/lib/dashboard/documentation-media-types";
import { getChecklistSections, normalizeChecklistPayload } from "@/lib/process/item-payload";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const SIGNED_URL_TTL_SEC = 60 * 60;

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

async function signedUrl(admin: AdminClient, bucket: string, path: string): Promise<string | null> {
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL_SEC);
  return error || !data?.signedUrl ? null : data.signedUrl;
}

function isImageMime(mimeType: string | null | undefined) {
  return Boolean(mimeType && mimeType.startsWith("image/"));
}

/**
 * Zbiera wszystkie pliki i zdjęcia wysłane gdziekolwiek w projekcie (dokumenty, załączniki
 * checklisty, tablicy wdrożeniowej, ustaleń, zmian projektu, zdjęcia procesowe typu "snapshot") do
 * jednej listy pod zakładkę Dokumentacja klienta.
 */
export async function fetchProjectDocumentationMedia(projectId: string): Promise<DocumentationMediaItem[]> {
  const admin = getSupabaseAdmin();
  const items: DocumentationMediaItem[] = [];

  const [{ data: documents }, { data: processItems }, { data: agreements }, { data: changeRequests }] =
    await Promise.all([
      admin
        .from("project_documents")
        .select("id, title, storage_path, mime_type, category, created_at")
        .eq("project_id", projectId),
      admin
        .from("project_process_items")
        .select("id, kind, payload, last_known_title")
        .eq("project_id", projectId),
      admin.from("project_client_agreements").select("id, title").eq("project_id", projectId),
      admin.from("project_change_requests").select("id, title").eq("project_id", projectId),
    ]);

  await Promise.all(
    (documents ?? []).map(async (doc) => {
      const path = doc.storage_path as string;
      const mimeType = doc.mime_type as string | null;
      const url = await signedUrl(admin, "project-documents", path);
      items.push({
        id: `document:${doc.id}`,
        kind: isImageMime(mimeType) || doc.category === "photo" ? "photo" : "document",
        source: "documents",
        title: (doc.title as string) || "Dokument",
        sourceLabel: "Dokumentacja projektowa",
        url,
        mimeType,
        createdAt: doc.created_at as string,
      });
    }),
  );

  const checklistItems = (processItems ?? []).filter((row) => row.kind === "checklist");
  await Promise.all(
    checklistItems.map(async (row) => {
      const payload = normalizeChecklistPayload(row.payload);
      const sections = getChecklistSections(payload);
      const itemTitle = (row.last_known_title as string | null) ?? "";
      await Promise.all(
        sections.flatMap((section) =>
          section.lines.flatMap((line) =>
            (line.attachments ?? []).map(async (attachment) => {
              const url = await signedUrl(admin, "checklist-attachments", attachment.storagePath);
              items.push({
                id: `checklist:${attachment.id}`,
                kind: attachment.mediaKind === "image" ? "photo" : "document",
                source: "checklist",
                title: attachment.fileName,
                sourceLabel: `Checklista: ${itemTitle || line.text}`,
                url,
                mimeType: attachment.mimeType,
                createdAt: attachment.uploadedAt,
              });
            }),
          ),
        ),
      );
    }),
  );

  const kanbanItemIds = (processItems ?? [])
    .filter((row) => row.kind === "kanban")
    .map((row) => row.id as string);
  if (kanbanItemIds.length) {
    const { data: boards } = await admin
      .from("process_kanban_boards")
      .select("id, project_process_item_id")
      .in("project_process_item_id", kanbanItemIds);
    const boardIds = (boards ?? []).map((board) => board.id as string);

    if (boardIds.length) {
      const { data: columns } = await admin
        .from("process_kanban_columns")
        .select("id, board_id")
        .in("board_id", boardIds);
      const columnIds = (columns ?? []).map((column) => column.id as string);

      if (columnIds.length) {
        const { data: tasks } = await admin
          .from("process_kanban_tasks")
          .select("id, title, column_id")
          .in("column_id", columnIds);
        const taskIds = (tasks ?? []).map((task) => task.id as string);
        const taskTitleById = new Map((tasks ?? []).map((task) => [task.id as string, task.title as string]));

        if (taskIds.length) {
          const { data: attachments } = await admin
            .from("process_kanban_task_attachments")
            .select("id, task_id, storage_path, file_name, mime_type, media_kind, created_at")
            .in("task_id", taskIds);

          await Promise.all(
            (attachments ?? []).map(async (attachment) => {
              const url = await signedUrl(admin, "kanban-attachments", attachment.storage_path as string);
              items.push({
                id: `kanban:${attachment.id}`,
                kind: attachment.media_kind === "image" ? "photo" : "document",
                source: "kanban",
                title: attachment.file_name as string,
                sourceLabel: `Tablica wdrożeniowa: ${
                  taskTitleById.get(attachment.task_id as string) ?? "Zadanie"
                }`,
                url,
                mimeType: attachment.mime_type as string | null,
                createdAt: attachment.created_at as string,
              });
            }),
          );
        }
      }
    }
  }

  const agreementIds = (agreements ?? []).map((agreement) => agreement.id as string);
  const agreementTitleById = new Map(
    (agreements ?? []).map((agreement) => [agreement.id as string, agreement.title as string]),
  );
  if (agreementIds.length) {
    const { data: attachments } = await admin
      .from("project_agreement_attachments")
      .select("id, agreement_id, storage_path, file_name, mime_type, media_kind, created_at")
      .in("agreement_id", agreementIds);

    await Promise.all(
      (attachments ?? []).map(async (attachment) => {
        const url = await signedUrl(admin, "agreement-attachments", attachment.storage_path as string);
        items.push({
          id: `agreement:${attachment.id}`,
          kind: attachment.media_kind === "image" ? "photo" : "document",
          source: "agreement",
          title: attachment.file_name as string,
          sourceLabel: `Ustalenie: ${agreementTitleById.get(attachment.agreement_id as string) ?? ""}`,
          url,
          mimeType: attachment.mime_type as string | null,
          createdAt: attachment.created_at as string,
        });
      }),
    );
  }

  const changeRequestIds = (changeRequests ?? []).map((entry) => entry.id as string);
  const changeRequestTitleById = new Map(
    (changeRequests ?? []).map((entry) => [entry.id as string, entry.title as string]),
  );
  if (changeRequestIds.length) {
    const { data: attachments } = await admin
      .from("project_change_request_attachments")
      .select("id, change_request_id, storage_path, file_name, mime_type, media_kind, created_at")
      .in("change_request_id", changeRequestIds);

    await Promise.all(
      (attachments ?? []).map(async (attachment) => {
        const url = await signedUrl(admin, "change-request-attachments", attachment.storage_path as string);
        items.push({
          id: `change_request:${attachment.id}`,
          kind: attachment.media_kind === "image" ? "photo" : "document",
          source: "change_request",
          title: attachment.file_name as string,
          sourceLabel: `Zmiana projektu: ${
            changeRequestTitleById.get(attachment.change_request_id as string) ?? ""
          }`,
          url,
          mimeType: attachment.mime_type as string | null,
          createdAt: attachment.created_at as string,
        });
      }),
    );
  }

  const snapshotItemIds = (processItems ?? [])
    .filter((row) => row.kind === "snapshot")
    .map((row) => row.id as string);
  const titleByItemId = new Map(
    (processItems ?? []).map((row) => [row.id as string, row.last_known_title as string | null]),
  );
  if (snapshotItemIds.length) {
    const { data: snapshots } = await admin
      .from("project_process_snapshots")
      .select("id, project_process_item_id, storage_path, file_name, mime_type, created_at")
      .in("project_process_item_id", snapshotItemIds);

    for (const snapshot of snapshots ?? []) {
      const { data } = admin.storage
        .from("process-snapshot-photos")
        .getPublicUrl(snapshot.storage_path as string);
      items.push({
        id: `snapshot:${snapshot.id}`,
        kind: "photo",
        source: "snapshot",
        title: snapshot.file_name as string,
        sourceLabel: `Zdjęcie do klienta: ${
          titleByItemId.get(snapshot.project_process_item_id as string) ?? ""
        }`,
        url: data.publicUrl,
        mimeType: snapshot.mime_type as string | null,
        createdAt: snapshot.created_at as string,
      });
    }
  }

  items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return items;
}
