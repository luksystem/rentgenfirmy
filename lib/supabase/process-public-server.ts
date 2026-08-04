import type { InternalAcceptanceState } from "@/lib/internal-acceptance/types";
import { formatPartyName } from "@/lib/party/display-name";
import type { ChecklistItemPayload, ProcessItemKind } from "@/lib/process/types";
import type {
  Switchboard,
  SwitchboardCircuit,
  SwitchboardCircuitStatus,
} from "@/lib/dashboard/switchboard-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { rowToProjectProcessItem } from "@/lib/supabase/process-item-mappers";
import { fetchProcessPublicAccessByToken } from "@/lib/supabase/process-public-access-repository";

export type PublicSwitchboardWithCircuits = {
  switchboard: Switchboard;
  circuits: SwitchboardCircuit[];
};

export type PublicProcessItemPayload = {
  title: string;
  kind: ProcessItemKind;
  isInternalAcceptance: boolean;
  checklist?: ChecklistItemPayload;
  internalAcceptance?: InternalAcceptanceState | null;
  switchboards?: PublicSwitchboardWithCircuits[];
  projectId: string;
  templateItemId: string;
  projectProcessItemId: string;
  assigneeId: string | null;
  assigneeName: string | null;
  clientName: string | null;
};

/**
 * Publiczny link jest tokenem współdzielonym świadomie (docs/CLAUDE.md — atrybut "widoczne dla
 * klienta" gates the AUTHENTICATED dashboard, not a direct link) — kto ma token, widzi treść,
 * niezależnie od `visible_to_client` w szablonie procesu (dokładnie ten sam mechanizm co checklisty
 * publiczne, patrz `fetchPublicProcessItemByToken` niżej — te też nie sprawdzają visible_to_client).
 * Osobny fetch (nie `fetchSwitchboardsWithCircuits` z switchboard-repository.ts — ten używa
 * `getSupabase()`, klienta z sesją, niedostępnego na tej ścieżce bez zalogowania).
 */
async function fetchPublicSwitchboards(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  projectId: string,
): Promise<PublicSwitchboardWithCircuits[]> {
  const [{ data: switchboardRows, error: switchboardError }, { data: circuitRows, error: circuitError }] =
    await Promise.all([
      supabase.from("switchboards").select("*").eq("project_id", projectId).order("position", { ascending: true }),
      supabase
        .from("switchboard_circuits")
        .select("*")
        .eq("project_id", projectId)
        .order("row_index", { ascending: true }),
    ]);

  if (switchboardError) throw new Error(switchboardError.message);
  if (circuitError) throw new Error(circuitError.message);

  const circuitsBySwitchboard = new Map<string, SwitchboardCircuit[]>();
  for (const row of circuitRows ?? []) {
    const circuit: SwitchboardCircuit = {
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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    const list = circuitsBySwitchboard.get(circuit.switchboardId) ?? [];
    list.push(circuit);
    circuitsBySwitchboard.set(circuit.switchboardId, list);
  }

  return (switchboardRows ?? []).map((row) => ({
    switchboard: {
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
    },
    circuits: circuitsBySwitchboard.get(row.id) ?? [],
  }));
}

export async function fetchPublicProcessItemByToken(
  token: string,
): Promise<PublicProcessItemPayload | null> {
  const supabase = getSupabaseAdmin();
  const access = await fetchProcessPublicAccessByToken(supabase, token);
  if (!access?.publicEnabled) {
    return null;
  }

  const { data, error } = await supabase
    .from("project_process_items")
    .select("*")
    .eq("id", access.projectProcessItemId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const instance = rowToProjectProcessItem(data);

  const { data: templateItem } = await supabase
    .from("process_items")
    .select("title")
    .eq("id", instance.templateItemId)
    .maybeSingle();

  const title = (templateItem?.title as string | undefined) ?? "Element procesu";

  const { data: project } = await supabase
    .from("projects")
    .select("client_id")
    .eq("id", instance.projectId)
    .maybeSingle();

  let clientName: string | null = null;
  const clientId = project?.client_id as string | undefined;
  if (clientId) {
    const { data: client } = await supabase
      .from("clients")
      .select("first_name, last_name")
      .eq("id", clientId)
      .maybeSingle();

    clientName = client
      ? formatPartyName({
          firstName: client.first_name?.trim() ?? "",
          lastName: client.last_name?.trim() ?? "",
        }) || null
      : null;
  }

  const switchboards =
    instance.kind === "arkusz_dokumentacji"
      ? await fetchPublicSwitchboards(supabase, instance.projectId)
      : undefined;

  return {
    title,
    kind: instance.kind,
    isInternalAcceptance: Boolean(instance.isInternalAcceptance),
    checklist: instance.isInternalAcceptance ? undefined : instance.payload,
    internalAcceptance: instance.internalAcceptanceState,
    switchboards,
    projectId: instance.projectId,
    templateItemId: instance.templateItemId,
    projectProcessItemId: instance.id,
    assigneeId: instance.assigneeId,
    assigneeName: instance.assigneeName,
    clientName,
  };
}
