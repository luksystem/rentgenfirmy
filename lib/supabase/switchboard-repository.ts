import type { ParsedSwitchboardFile } from "@/lib/import/switchboard-xlsx-parser";
import type {
  Switchboard,
  SwitchboardCircuit,
  SwitchboardCircuitHistoryEntry,
  SwitchboardCircuitStatus,
} from "@/lib/dashboard/switchboard-types";
import { getSupabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type SwitchboardRow = Database["public"]["Tables"]["switchboards"]["Row"];
type SwitchboardCircuitRow = Database["public"]["Tables"]["switchboard_circuits"]["Row"];
type SwitchboardCircuitHistoryRow = Database["public"]["Tables"]["switchboard_circuit_history"]["Row"];

export type SwitchboardWithCircuits = {
  switchboard: Switchboard;
  circuits: SwitchboardCircuit[];
};

function rowToSwitchboard(row: SwitchboardRow): Switchboard {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    position: row.position,
    lastImportedAt: row.last_imported_at,
    completedAt: row.completed_at,
    completedById: row.completed_by_id,
    completedByName: row.completed_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToSwitchboardCircuit(row: SwitchboardCircuitRow): SwitchboardCircuit {
  return {
    id: row.id,
    switchboardId: row.switchboard_id,
    projectId: row.project_id,
    rowIndex: row.row_index,
    mergeKey: row.merge_key,
    sectionName: row.section_name,
    zugNo: row.zug_no,
    zugSubNo: row.zug_sub_no,
    circuitNo: row.circuit_no,
    breakerType: row.breaker_type,
    breakerNo: row.breaker_no,
    rcdNo: row.rcd_no,
    slotNo: row.slot_no,
    connectorType: row.connector_type,
    circuitDescription: row.circuit_description,
    location: row.location,
    detail1: row.detail_1,
    detail2: row.detail_2,
    detail3: row.detail_3,
    status: row.status as SwitchboardCircuitStatus,
    note: row.note,
    isStale: row.is_stale,
    source: (row.source as "import" | "manual") ?? "import",
    employeeReportTarget: row.employee_report_target as "agreement" | "change_request" | null,
    employeeReportId: row.employee_report_id,
    updatedById: row.updated_by_id,
    updatedByName: row.updated_by_name,
    handledAt: row.handled_at,
    handledById: row.handled_by_id,
    handledByName: row.handled_by_name,
    handledNote: row.handled_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToHistoryEntry(row: SwitchboardCircuitHistoryRow): SwitchboardCircuitHistoryEntry {
  return {
    id: row.id,
    circuitId: row.circuit_id,
    previousStatus: row.previous_status as SwitchboardCircuitStatus | null,
    newStatus: row.new_status as SwitchboardCircuitStatus,
    note: row.note,
    changedById: row.changed_by_id,
    changedByName: row.changed_by_name,
    changedAt: row.changed_at,
  };
}

export async function fetchSwitchboardsWithCircuits(
  projectId: string,
): Promise<SwitchboardWithCircuits[]> {
  const supabase = getSupabase();
  const [{ data: switchboardRows, error: switchboardError }, { data: circuitRows, error: circuitError }] =
    await Promise.all([
      supabase
        .from("switchboards")
        .select("*")
        .eq("project_id", projectId)
        .order("position", { ascending: true }),
      supabase
        .from("switchboard_circuits")
        .select("*")
        .eq("project_id", projectId)
        .order("row_index", { ascending: true }),
    ]);

  if (switchboardError) throw new Error(switchboardError.message);
  if (circuitError) throw new Error(circuitError.message);

  const circuitsBySwitchboard = new Map<string, SwitchboardCircuit[]>();
  for (const row of (circuitRows ?? []) as SwitchboardCircuitRow[]) {
    const circuit = rowToSwitchboardCircuit(row);
    const list = circuitsBySwitchboard.get(circuit.switchboardId) ?? [];
    list.push(circuit);
    circuitsBySwitchboard.set(circuit.switchboardId, list);
  }

  return ((switchboardRows ?? []) as SwitchboardRow[]).map((row) => {
    const switchboard = rowToSwitchboard(row);
    return { switchboard, circuits: circuitsBySwitchboard.get(switchboard.id) ?? [] };
  });
}

/**
 * Importuje sparsowany plik: dla każdej sekcji "Rozdzielnica" znajduje lub tworzy wiersz w
 * `switchboards` (po nazwie), a pozycje scala po `merge_key` — opisowe pola z pliku nadpisują
 * poprzednie, ale `status`/`note` (ustawiane w aplikacji) NIE są częścią payloadu, więc upsert
 * ich nie rusza. Pozycje, które zniknęły z pliku, oznaczamy jako `is_stale`.
 */
export async function importParsedSwitchboards(
  projectId: string,
  parsed: ParsedSwitchboardFile,
): Promise<{ switchboardId: string; name: string; importedCount: number; staleCount: number }[]> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const results: { switchboardId: string; name: string; importedCount: number; staleCount: number }[] = [];

  const { data: existingBoards, error: existingBoardsError } = await supabase
    .from("switchboards")
    .select("id, name, position")
    .eq("project_id", projectId);
  if (existingBoardsError) throw new Error(existingBoardsError.message);

  let nextPosition = (existingBoards ?? []).reduce(
    (max, board) => Math.max(max, board.position),
    -1,
  ) + 1;

  for (const board of parsed.switchboards) {
    let switchboardId = existingBoards?.find((b) => b.name === board.name)?.id ?? null;

    if (!switchboardId) {
      const { data: created, error: createError } = await supabase
        .from("switchboards")
        .insert({
          project_id: projectId,
          name: board.name,
          position: nextPosition,
          last_imported_at: now,
        })
        .select("id")
        .single();
      if (createError) throw new Error(createError.message);
      switchboardId = created.id;
      nextPosition += 1;
    } else {
      const { error: touchError } = await supabase
        .from("switchboards")
        .update({ last_imported_at: now, updated_at: now })
        .eq("id", switchboardId);
      if (touchError) throw new Error(touchError.message);
    }

    const { data: existingCircuits, error: existingCircuitsError } = await supabase
      .from("switchboard_circuits")
      .select("id, merge_key, source")
      .eq("switchboard_id", switchboardId);
    if (existingCircuitsError) throw new Error(existingCircuitsError.message);

    const importedKeys = new Set(board.circuits.map((c) => c.mergeKey));
    const existingKeys = new Set((existingCircuits ?? []).map((row) => row.merge_key));

    const descriptiveFields = (circuit: (typeof board.circuits)[number]) => ({
      switchboard_id: switchboardId as string,
      project_id: projectId,
      row_index: circuit.rowIndex,
      merge_key: circuit.mergeKey,
      section_name: circuit.sectionName,
      zug_no: circuit.zugNo,
      zug_sub_no: circuit.zugSubNo,
      circuit_no: circuit.circuitNo,
      breaker_type: circuit.breakerType,
      breaker_no: circuit.breakerNo,
      rcd_no: circuit.rcdNo,
      slot_no: circuit.slotNo,
      connector_type: circuit.connectorType,
      circuit_description: circuit.circuitDescription,
      location: circuit.location,
      detail_1: circuit.detail1,
      detail_2: circuit.detail2,
      detail_3: circuit.detail3,
      is_stale: false,
      updated_at: now,
    });

    // Nowe pozycje: status/notatka z pliku SĄ zapisywane — dla pierwszego importu to jedyne
    // źródło prawdy (np. 129 już podłączonych i sprawdzonych zugów z realnej budowy), więc
    // pominięcie ich zmusiłoby instalatora do ręcznego powtórzenia całej dotychczasowej pracy.
    const newCircuits = board.circuits.filter((c) => !existingKeys.has(c.mergeKey));
    if (newCircuits.length > 0) {
      const { error: insertError } = await supabase.from("switchboard_circuits").insert(
        newCircuits.map((circuit) => ({
          ...descriptiveFields(circuit),
          status: circuit.status,
          note: circuit.note,
        })),
      );
      if (insertError) throw new Error(insertError.message);
    }

    // Istniejące pozycje: opisy z pliku nadpisują, ale status/notatka NIE są częścią payloadu —
    // to, co instalator już ustawił w aplikacji, ma pierwszeństwo przed tym, co jest w pliku.
    const circuitsToUpdate = board.circuits.filter((c) => existingKeys.has(c.mergeKey));
    if (circuitsToUpdate.length > 0) {
      const { error: upsertError } = await supabase
        .from("switchboard_circuits")
        .upsert(circuitsToUpdate.map(descriptiveFields), { onConflict: "switchboard_id,merge_key" });
      if (upsertError) throw new Error(upsertError.message);
    }

    // Ręcznie dodane pozycje nigdy nie mają odpowiednika w pliku (inny sposób powstania
    // merge_key), więc bez tego wyjątku KAŻDY import oznaczałby je jako "zniknęły z pliku".
    const staleIds = (existingCircuits ?? [])
      .filter((row) => row.source !== "manual" && !importedKeys.has(row.merge_key))
      .map((row) => row.id);
    if (staleIds.length > 0) {
      const { error: staleError } = await supabase
        .from("switchboard_circuits")
        .update({ is_stale: true, updated_at: now })
        .in("id", staleIds);
      if (staleError) throw new Error(staleError.message);
    }

    results.push({
      switchboardId,
      name: board.name,
      importedCount: board.circuits.length,
      staleCount: staleIds.length,
    });
  }

  return results;
}

/**
 * Dodaje pozycję ręcznie z poziomu Rentgena (nie z importu pliku) — np. coś dograne na budowie,
 * czego nie było w oryginalnym arkuszu. `merge_key` dostaje prefiks "manual:" + losowy fragment,
 * żeby NIGDY nie kolidował z kluczem wygenerowanym przez parser pliku przy późniejszym imporcie.
 */
export async function createManualSwitchboardCircuit(
  switchboardId: string,
  projectId: string,
  input: {
    sectionName?: string | null;
    zugNo?: string | null;
    circuitDescription?: string | null;
    location?: string | null;
    createdByName: string;
  },
): Promise<SwitchboardCircuit> {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const { data: maxRow } = await supabase
    .from("switchboard_circuits")
    .select("row_index")
    .eq("switchboard_id", switchboardId)
    .order("row_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextRowIndex = ((maxRow as { row_index?: number } | null)?.row_index ?? 0) + 1;

  const { data, error } = await supabase
    .from("switchboard_circuits")
    .insert({
      switchboard_id: switchboardId,
      project_id: projectId,
      row_index: nextRowIndex,
      merge_key: `manual:${crypto.randomUUID()}`,
      section_name: input.sectionName?.trim() || null,
      zug_no: input.zugNo?.trim() || null,
      circuit_description: input.circuitDescription?.trim() || null,
      location: input.location?.trim() || null,
      status: "nie_ruszone",
      source: "manual",
      updated_by_name: input.createdByName.trim() || "Instalator",
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToSwitchboardCircuit(data as SwitchboardCircuitRow);
}

export async function updateSwitchboardCircuitStatus(
  circuitId: string,
  input: {
    status: SwitchboardCircuitStatus;
    note: string | null;
    updatedById: string | null;
    updatedByName: string;
  },
): Promise<SwitchboardCircuit> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("switchboard_circuits")
    .update({
      status: input.status,
      note: input.note?.trim() || null,
      updated_by_id: input.updatedById,
      updated_by_name: input.updatedByName.trim() || "Instalator",
      updated_at: new Date().toISOString(),
    })
    .eq("id", circuitId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToSwitchboardCircuit(data as SwitchboardCircuitRow);
}

/** Zapamiętuje, że dla tej pozycji powstało już zgłoszenie D44 — żeby nie zgłaszać dwa razy. */
export async function linkSwitchboardCircuitEmployeeReport(
  circuitId: string,
  input: { target: "agreement" | "change_request"; recordId: string },
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("switchboard_circuits")
    .update({
      employee_report_target: input.target,
      employee_report_id: input.recordId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", circuitId);

  if (error) throw new Error(error.message);
}

/** "Ogarnięte" — niezależne od statusu montażu, ustawiane po zgłoszeniu do biura/zapotrzebowania
 *  albo ręcznie. Status i historia zmian statusu zostają bez zmian. */
export async function markSwitchboardCircuitHandled(
  circuitId: string,
  input: { note: string; actorId: string | null; actorName: string },
): Promise<SwitchboardCircuit> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("switchboard_circuits")
    .update({
      handled_at: new Date().toISOString(),
      handled_by_id: input.actorId,
      handled_by_name: input.actorName.trim() || "Zespół",
      handled_note: input.note.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", circuitId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToSwitchboardCircuit(data as SwitchboardCircuitRow);
}

/** Pełna historia zmian statusu/notatki tej pozycji — zapisywana automatycznie przez trigger. */
export async function fetchSwitchboardCircuitHistory(
  circuitId: string,
): Promise<SwitchboardCircuitHistoryEntry[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("switchboard_circuit_history")
    .select("*")
    .eq("circuit_id", circuitId)
    .order("changed_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as SwitchboardCircuitHistoryRow[]).map(rowToHistoryEntry);
}

/**
 * Archiwizuje zakończenie (lub cofnięcie) wpinania całej rozdzielnicy i — przy zakończeniu —
 * powiadamia osobę odpowiedzialną za etap. Idzie przez API (nie zapis bezpośredni z przeglądarki),
 * żeby "kto zakończył" pochodziło z sesji serwera, a nie z danych podanych przez klienta, i żeby
 * dało się w tym samym wywołaniu wysłać push administracyjnym klientem Supabase.
 */
export async function setSwitchboardCompletion(
  projectId: string,
  switchboardId: string,
  input: { reopen?: boolean } = {},
): Promise<Switchboard> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/switchboards/${encodeURIComponent(switchboardId)}/complete`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reopen: Boolean(input.reopen) }),
    },
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error ?? "Nie udało się zapisać statusu zakończenia.");
  }
  return {
    id: payload.switchboard.id,
    projectId: payload.switchboard.project_id,
    name: payload.switchboard.name,
    position: payload.switchboard.position,
    lastImportedAt: payload.switchboard.last_imported_at,
    completedAt: payload.switchboard.completed_at,
    completedById: payload.switchboard.completed_by_id,
    completedByName: payload.switchboard.completed_by_name,
    createdAt: payload.switchboard.created_at,
    updatedAt: payload.switchboard.updated_at,
  };
}
