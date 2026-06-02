import { createSampleServices, DEFAULT_SERVICE_SETTINGS } from "@/lib/service/defaults";
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

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadServiceSettings(): ServiceGlobalSettings {
  return readJson<ServiceGlobalSettings>(SETTINGS_KEY) ?? DEFAULT_SERVICE_SETTINGS;
}

export function saveServiceSettings(settings: ServiceGlobalSettings) {
  writeJson(SETTINGS_KEY, settings);
}

export function loadServices(): ServiceRecord[] {
  const stored = readJson<ServiceRecord[]>(SERVICES_KEY);
  if (stored && stored.length > 0) {
    return stored;
  }

  const samples = createSampleServices();
  writeJson(SERVICES_KEY, samples);
  return samples;
}

export function saveServices(services: ServiceRecord[]) {
  writeJson(SERVICES_KEY, services);
}
