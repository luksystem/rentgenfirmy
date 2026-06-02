import { createSampleServices, DEFAULT_SERVICE_SETTINGS } from "@/lib/service/defaults";
import {
  clearLocalServiceData,
  defaultSettingsFromLocal,
  readLocalServiceData,
  remapServiceIds,
} from "@/lib/service/migrate-local-storage";
import type { ServiceGlobalSettings, ServiceRecord } from "@/lib/service/types";
import { getSupabase } from "@/lib/supabase/client";
import {
  normalizeServiceGlobalSettings,
  rowToService,
  serviceToInsert,
} from "@/lib/supabase/service-mappers";

const SETTINGS_ID = "service_global_settings";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ensureServiceUuid(id: string) {
  return UUID_RE.test(id) ? id : crypto.randomUUID();
}

export async function fetchServices(): Promise<ServiceRecord[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToService);
}

export async function fetchServiceSettings(): Promise<ServiceGlobalSettings> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("app_settings")
    .select("data")
    .eq("id", SETTINGS_ID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.data) {
    return DEFAULT_SERVICE_SETTINGS;
  }

  return normalizeServiceGlobalSettings(data.data);
}

export async function saveServiceSettings(
  settings: ServiceGlobalSettings,
): Promise<ServiceGlobalSettings> {
  const supabase = getSupabase();
  const normalized = normalizeServiceGlobalSettings(settings);
  const { data, error } = await supabase
    .from("app_settings")
    .upsert(
      {
        id: SETTINGS_ID,
        data: normalized,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("data")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeServiceGlobalSettings(data.data);
}

export async function upsertServiceRecord(service: ServiceRecord): Promise<ServiceRecord> {
  const supabase = getSupabase();
  const payload = serviceToInsert({
    ...service,
    id: ensureServiceUuid(service.id),
    updatedAt: new Date().toISOString(),
  });

  const { data, error } = await supabase
    .from("services")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return rowToService(data);
}

export async function deleteServiceRecord(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("services").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function insertServices(services: ServiceRecord[]): Promise<ServiceRecord[]> {
  if (services.length === 0) {
    return [];
  }

  const supabase = getSupabase();
  const rows = services.map((service) => serviceToInsert(service));
  const { data, error } = await supabase.from("services").insert(rows).select("*");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToService);
}

export async function seedSampleServices(): Promise<ServiceRecord[]> {
  const samples = createSampleServices().map((service) => ({
    ...service,
    id: ensureServiceUuid(service.id),
  }));

  return insertServices(samples);
}

export async function bootstrapServiceModule(): Promise<{
  services: ServiceRecord[];
  settings: ServiceGlobalSettings;
}> {
  let services = await fetchServices();
  let settings = await fetchServiceSettings();

  if (services.length === 0) {
    const local = readLocalServiceData();

    if (local) {
      settings = await saveServiceSettings(defaultSettingsFromLocal(local.settings));

      if (local.services.length > 0) {
        services = await insertServices(remapServiceIds(local.services));
      }

      clearLocalServiceData();
    }
  }

  if (services.length === 0) {
    services = await seedSampleServices();
  }

  return { services, settings };
}
