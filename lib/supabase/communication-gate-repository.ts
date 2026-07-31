// Faza 11a (D19 §6) — bramy faz komunikacji. Ten plik jest wyłącznie transportem: pobiera fakty
// z bazy (report_communication_gate_inputs, zero logiki decyzyjnej) i przepuszcza je przez czystą
// funkcję resolveCommunicationGate (lib/communication/gate.ts), która ma własny test tablicy
// prawdy. Decyzja nie zapada dwa razy w dwóch miejscach.
import { getSupabase } from "@/lib/supabase/client";
import { COMMUNICATION_PHASES, type CommunicationPhase } from "@/lib/process/types";
import { resolveCommunicationGate, type CommunicationGateResult } from "@/lib/communication/gate";
import { fetchPolicyThresholds } from "@/lib/supabase/policy-thresholds-repository";

export type ProjectCommunicationGate = CommunicationGateResult & {
  projectId: string;
  projectName: string;
  activeStageTitle: string | null;
};

function isCommunicationPhase(value: string | null): value is CommunicationPhase {
  return value !== null && (COMMUNICATION_PHASES as readonly string[]).includes(value);
}

export async function fetchCommunicationGates(): Promise<ProjectCommunicationGate[]> {
  const supabase = getSupabase();
  const [{ data, error }, thresholds] = await Promise.all([
    supabase.rpc("report_communication_gate_inputs"),
    fetchPolicyThresholds(),
  ]);
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const gate = resolveCommunicationGate({
      flowStatus: row.flow_status,
      coverageActiveToday: row.coverage_active_today,
      hasActiveHold: row.has_active_hold,
      activeStageBasePhase: isCommunicationPhase(row.active_stage_base_phase)
        ? row.active_stage_base_phase
        : null,
      silenceThresholds: {
        inProgressDays: thresholds.silenceTimeoutInProgressDays,
        holdDays: thresholds.silenceTimeoutHoldDays,
      },
    });
    return {
      ...gate,
      projectId: row.project_id,
      projectName: row.project_name,
      activeStageTitle: row.active_stage_title,
    };
  });
}

export async function fetchCommunicationGateForProject(
  projectId: string,
): Promise<ProjectCommunicationGate | null> {
  const gates = await fetchCommunicationGates();
  return gates.find((gate) => gate.projectId === projectId) ?? null;
}
