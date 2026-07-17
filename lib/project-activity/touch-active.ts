import { isClosedFlowStatus, normalizeFieldOptions } from "@/lib/field-options";
import { getSupabase } from "@/lib/supabase/client";
import { fetchProjectActivitySettings } from "@/lib/supabase/project-activity-settings-repository";

/**
 * Po zapisie sygnału aktywności (zmiana, ustalenie, dokument, czas…) —
 * jeśli auto-wykrywanie jest włączone, ustawia projekt jako aktywny.
 * Dezaktywacja tylko w cronie / pełnym przeliczeniu (histereza).
 */
export async function maybeActivateProjectFromActivity(
  projectId: string | null | undefined,
): Promise<void> {
  if (!projectId) {
    return;
  }

  try {
    const settings = await fetchProjectActivitySettings();
    if (!settings.autoDetectActiveProjects) {
      return;
    }

    const supabase = getSupabase();
    const [{ data: project }, { data: fieldOptionsRow }] = await Promise.all([
      supabase.from("projects").select("id, is_active, flow_status").eq("id", projectId).maybeSingle(),
      supabase.from("app_settings").select("data").eq("id", "field_options").maybeSingle(),
    ]);

    if (!project || project.is_active) {
      return;
    }

    const fieldOptions = normalizeFieldOptions(fieldOptionsRow?.data ?? undefined);
    if (isClosedFlowStatus(project.flow_status, fieldOptions)) {
      return;
    }

    const { error } = await supabase
      .from("projects")
      .update({ is_active: true })
      .eq("id", projectId)
      .eq("is_active", false);

    if (!error) {
      const { useAppStore } = await import("@/store/app-store");
      useAppStore.getState().patchProjectFields(projectId, { isActive: true });
    }
  } catch {
    // Nie blokuj głównego zapisu.
  }
}
