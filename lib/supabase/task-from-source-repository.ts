// D43 — zadanie z ustalenia albo ze zmiany projektowej.
//
// Cztery decyzje właściciela, które ten plik realizuje:
//  1. manager wybiera tablicę — priorytetowo z etapu bieżącego, ale może z innego;
//  2. właściciel zadania wynika z ETAPU WYBRANEJ TABLICY (nie z `acceptance_deadline_stage_id`,
//     który mówi „do kiedy”, a nie „gdzie”);
//  3. link to kolumna, nie tabela łącząca — wiele prac z jednego ustalenia to PODZADANIA;
//  4. ustalenia i zmiany projektowe traktowane identycznie.
import { getSupabase } from "@/lib/supabase/client";
import { createKanbanTask, ensureKanbanBoard } from "@/lib/supabase/kanban-repository";
import { normalizeKanbanTemplatePayload } from "@/lib/process/kanban-payload";

export type TaskTarget = {
  projectProcessItemId: string;
  itemTitle: string;
  stageId: string | null;
  stageTitle: string | null;
  stagePosition: number | null;
  /** Etap bieżący projektu — picker stawia te cele na górze i preselekcjonuje pierwszy z nich. */
  isActiveStage: boolean;
  /** null = tablica jeszcze nie istnieje. Normalny stan: tablice powstają leniwie. */
  boardId: string | null;
  payload: unknown;
};

export type BoardTaskOwner = {
  boardId: string;
  projectId: string;
  stageId: string | null;
  stageTitle: string | null;
  roleCode: string | null;
  roleName: string | null;
  responsibleUserId: string | null;
  responsibleName: string | null;
  slotSource: string | null;
};

export async function fetchTaskTargets(projectId: string): Promise<TaskTarget[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("report_task_targets", { p_project_id: projectId });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => ({
    projectProcessItemId: row.project_process_item_id,
    itemTitle: row.item_title,
    stageId: row.stage_id,
    stageTitle: row.stage_title,
    stagePosition: row.stage_position,
    isActiveStage: row.is_active_stage,
    boardId: row.board_id,
    payload: row.payload,
  }));
}

export async function fetchBoardTaskOwner(boardId: string): Promise<BoardTaskOwner | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("report_board_task_owner", { p_board_id: boardId });
  if (error) {
    throw new Error(error.message);
  }
  const row = (data ?? [])[0];
  if (!row) {
    return null;
  }
  return {
    boardId: row.board_id,
    projectId: row.project_id,
    stageId: row.stage_id,
    stageTitle: row.stage_title,
    roleCode: row.role_code,
    roleName: row.role_name,
    responsibleUserId: row.responsible_user_id,
    responsibleName: row.responsible_name,
    slotSource: row.slot_source,
  };
}

export type TaskFromSourceInput = {
  target: TaskTarget;
  title: string;
  description?: string;
  dueDate?: string | null;
  authorName: string;
  /** Dokładnie jedno z dwóch — baza pilnuje checkiem, tu tylko przekazujemy dalej. */
  sourceAgreementId?: string | null;
  sourceChangeRequestId?: string | null;
};

/**
 * Tworzy kartę na wskazanym celu. Tablica jest materializowana, jeśli jeszcze nie istnieje —
 * 107 projektów ma element kanbanowy, a tablic istnieje kilkanaście, więc „brak tablicy” to
 * najczęstszy przypadek, nie wyjątek.
 *
 * Kolumna docelowa: pierwsza od lewej (decyzja właściciela). Właściciel karty wyliczany z etapu
 * tablicy — jeśli etap nie ma obsady, karta powstaje BEZ przypisania, zamiast blokować tworzenie.
 * Dziura w obsadzie jest widoczna gdzie indziej (widok procesu) i nie ma zatrzymywać pracy.
 */
export async function createTaskFromSource(input: TaskFromSourceInput) {
  const boardId =
    input.target.boardId ??
    (await ensureKanbanBoard(
      input.target.projectProcessItemId,
      normalizeKanbanTemplatePayload(input.target.payload),
    )).id;

  const supabase = getSupabase();
  const { data: columns, error: columnsError } = await supabase
    .from("process_kanban_columns")
    .select("id, position")
    .eq("board_id", boardId)
    .order("position", { ascending: true })
    .limit(1);

  if (columnsError) {
    throw new Error(columnsError.message);
  }

  const columnId = (columns ?? [])[0]?.id as string | undefined;
  if (!columnId) {
    throw new Error("Tablica nie ma żadnej kolumny — nie ma gdzie umieścić zadania.");
  }

  const owner = await fetchBoardTaskOwner(boardId);

  return createKanbanTask({
    columnId,
    title: input.title,
    description: input.description,
    dueDate: input.dueDate ?? null,
    authorSide: "team",
    authorName: input.authorName,
    sourceAgreementId: input.sourceAgreementId ?? null,
    sourceChangeRequestId: input.sourceChangeRequestId ?? null,
    assigneeId: owner?.responsibleUserId ?? null,
    assigneeName: owner?.responsibleName ?? null,
  });
}
