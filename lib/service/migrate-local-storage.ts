import { DEFAULT_SERVICE_SETTINGS } from "@/lib/service/defaults";
import type { ServiceGlobalSettings, ServiceRecord } from "@/lib/service/types";

const SERVICES_KEY = "rentgen-services";
const SETTINGS_KEY = "rentgen-service-settings";

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function clearKeys() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SERVICES_KEY);
  window.localStorage.removeItem(SETTINGS_KEY);
}

export function readLocalServiceData(): {
  services: ServiceRecord[];
  settings: ServiceGlobalSettings | null;
} | null {
  const services = readJson<ServiceRecord[]>(SERVICES_KEY);
  const settings = readJson<ServiceGlobalSettings>(SETTINGS_KEY);

  if ((!services || services.length === 0) && !settings) {
    return null;
  }

  return {
    services: services ?? [],
    settings: settings ?? null,
  };
}

export function clearLocalServiceData() {
  clearKeys();
}

export function remapServiceIds(services: ServiceRecord[]): ServiceRecord[] {
  return services.map((service) => ({
    ...service,
    id: crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
  }));
}

export function defaultSettingsFromLocal(
  settings: ServiceGlobalSettings | null,
): ServiceGlobalSettings {
  return settings ?? DEFAULT_SERVICE_SETTINGS;
}
