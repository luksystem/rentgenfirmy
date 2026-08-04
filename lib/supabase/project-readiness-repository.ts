// Test gotowości projektu (docs/09) — report_project_readiness() istniał od migracji 219
// wyłącznie jako funkcja SQL, uruchamialna ręcznie z SQL Editora. Ten plik jest pierwszym
// wywołaniem z poziomu aplikacji (naprawa audytu bramy).
import { getSupabase } from "@/lib/supabase/client";

export const PROJECT_READINESS_STATUSES = ["spełnione", "nie_spełnione", "niedostępne"] as const;
export type ProjectReadinessStatus = (typeof PROJECT_READINESS_STATUSES)[number];

export type ProjectReadinessRow = {
  projectId: string;
  projectName: string;
  flowStatus: string;
  etapAktualny: ProjectReadinessStatus;
  slotyObsadzone: ProjectReadinessStatus;
  profilKlienta: ProjectReadinessStatus;
  kanalKomunikacji: ProjectReadinessStatus;
  rotPrzeniesioneZWlascicielemIDataKontroli: ProjectReadinessStatus;
  podmiotyZewnetrzneKtoZatrudnia: ProjectReadinessStatus;
  liderEtapu: ProjectReadinessStatus;
  dataOstatniegoKontaktu: ProjectReadinessStatus;
};

export async function fetchProjectReadiness(): Promise<ProjectReadinessRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("report_project_readiness");
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => ({
    projectId: row.project_id,
    projectName: row.project_name,
    flowStatus: row.flow_status,
    etapAktualny: row.etap_aktualny as ProjectReadinessStatus,
    slotyObsadzone: row.sloty_obsadzone as ProjectReadinessStatus,
    profilKlienta: row.profil_klienta as ProjectReadinessStatus,
    kanalKomunikacji: row.kanal_komunikacji as ProjectReadinessStatus,
    rotPrzeniesioneZWlascicielemIDataKontroli:
      row.rot_przeniesione_z_wlascicielem_i_data_kontroli as ProjectReadinessStatus,
    podmiotyZewnetrzneKtoZatrudnia: row.podmioty_zewnetrzne_kto_zatrudnia as ProjectReadinessStatus,
    liderEtapu: row.lider_etapu as ProjectReadinessStatus,
    dataOstatniegoKontaktu: row.data_ostatniego_kontaktu as ProjectReadinessStatus,
  }));
}
