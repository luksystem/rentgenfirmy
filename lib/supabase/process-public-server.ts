import type { InternalAcceptanceState } from "@/lib/internal-acceptance/types";
import type { ChecklistItemPayload, ProcessItemKind } from "@/lib/process/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { rowToProjectProcessItem } from "@/lib/supabase/process-item-mappers";
import { fetchProcessPublicAccessByToken } from "@/lib/supabase/process-public-access-repository";

export type PublicProcessItemPayload = {
  title: string;
  kind: ProcessItemKind;
  isInternalAcceptance: boolean;
  checklist?: ChecklistItemPayload;
  internalAcceptance?: InternalAcceptanceState | null;
  projectId: string;
  templateItemId: string;
  projectProcessItemId: string;
  assigneeId: string | null;
  assigneeName: string | null;
};

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

  return {
    title,
    kind: instance.kind,
    isInternalAcceptance: Boolean(instance.isInternalAcceptance),
    checklist: instance.isInternalAcceptance ? undefined : instance.payload,
    internalAcceptance: instance.internalAcceptanceState,
    projectId: instance.projectId,
    templateItemId: instance.templateItemId,
    projectProcessItemId: instance.id,
    assigneeId: instance.assigneeId,
    assigneeName: instance.assigneeName,
  };
}
