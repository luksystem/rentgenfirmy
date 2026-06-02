"use client";

import { create } from "zustand";
import { calculateServiceCost } from "@/lib/service/calculate-service-cost";
import { DEFAULT_SERVICE_SETTINGS } from "@/lib/service/defaults";
import { loadServiceSettings, loadServices, saveServices, saveServiceSettings } from "@/lib/service/storage";
import {
  emptyLineItems,
  type ServiceGlobalSettings,
  type ServiceRecord,
} from "@/lib/service/types";

type ServiceStore = {
  services: ServiceRecord[];
  settings: ServiceGlobalSettings;
  hydrated: boolean;
  hydrate: () => void;
  upsertService: (service: ServiceRecord) => void;
  deleteService: (id: string) => void;
  getServiceById: (id: string) => ServiceRecord | undefined;
  updateSettings: (settings: ServiceGlobalSettings) => void;
  createEmptyService: () => ServiceRecord;
};

function newId() {
  return `service-${crypto.randomUUID()}`;
}

export function buildServiceCosts(service: ServiceRecord) {
  const estimate = calculateServiceCost(
    service.estimate,
    service.rates,
    service.zoneSettings,
    service.discounts,
  );

  const actual = calculateServiceCost(
    service.actual,
    service.rates,
    service.zoneSettings,
    service.discounts,
  );

  return { estimate, actual };
}

export const useServiceStore = create<ServiceStore>((set, get) => ({
  services: [],
  settings: DEFAULT_SERVICE_SETTINGS,
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) {
      return;
    }

    set({
      services: loadServices(),
      settings: loadServiceSettings(),
      hydrated: true,
    });
  },

  upsertService: (service) => {
    const services = get().services;
    const index = services.findIndex((item) => item.id === service.id);
    const next =
      index >= 0
        ? services.map((item) => (item.id === service.id ? service : item))
        : [service, ...services];

    saveServices(next);
    set({ services: next });
  },

  deleteService: (id) => {
    const next = get().services.filter((item) => item.id !== id);
    saveServices(next);
    set({ services: next });
  },

  getServiceById: (id) => get().services.find((item) => item.id === id),

  updateSettings: (settings) => {
    saveServiceSettings(settings);
    set({ settings });
  },

  createEmptyService: () => {
    const settings = get().settings;
    const now = new Date().toISOString();

    return {
      id: newId(),
      createdAt: now,
      updatedAt: now,
      status: "Wycena",
      projectId: null,
      client: {
        fullName: "",
        location: "",
        email: "",
        phone: "",
      },
      title: "",
      serviceType: "Pogwarancyjny",
      rates: { ...settings.rates },
      discounts: { ...settings.defaultDiscounts },
      zoneSettings: { ...settings.zoneSettings },
      estimate: emptyLineItems(),
      actual: emptyLineItems(),
    };
  },
}));
