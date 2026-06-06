"use client";

import { create } from "zustand";
import { calculateServiceCost } from "@/lib/service/calculate-service-cost";
import { DEFAULT_SERVICE_SETTINGS } from "@/lib/service/defaults";
import {
  bootstrapServiceModule,
  deleteServiceRecord,
  ensureServiceUuid,
  saveServiceSettings,
  upsertServiceRecord,
} from "@/lib/supabase/service-repository";
import {
  emptyLineItems,
  type ServiceGlobalSettings,
  type ServiceRecord,
} from "@/lib/service/types";

type ServiceStore = {
  services: ServiceRecord[];
  settings: ServiceGlobalSettings;
  hydrated: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  upsertService: (service: ServiceRecord) => Promise<ServiceRecord>;
  deleteService: (id: string) => Promise<void>;
  getServiceById: (id: string) => ServiceRecord | undefined;
  replaceService: (service: ServiceRecord) => void;
  updateSettings: (settings: ServiceGlobalSettings) => Promise<void>;
  createEmptyService: () => ServiceRecord;
};

export function buildServiceCosts(service: ServiceRecord) {
  const estimate = calculateServiceCost(
    service.estimate,
    service.rates,
    service.zoneSettings,
    service.estimateDiscounts,
  );

  const actual = calculateServiceCost(
    service.actual,
    service.rates,
    service.zoneSettings,
    service.actualDiscounts,
  );

  return { estimate, actual };
}

export const useServiceStore = create<ServiceStore>((set, get) => ({
  services: [],
  settings: DEFAULT_SERVICE_SETTINGS,
  hydrated: false,
  isLoading: false,
  isSaving: false,
  error: null,

  hydrate: async () => {
    if (get().hydrated || get().isLoading) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const { services, settings } = await bootstrapServiceModule();
      set({
        services,
        settings,
        hydrated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się pobrać danych serwisu",
        isLoading: false,
      });
    }
  },

  upsertService: async (service) => {
    set({ isSaving: true, error: null });

    try {
      const saved = await upsertServiceRecord(service);
      const services = get().services;
      const index = services.findIndex((item) => item.id === service.id);
      const next =
        index >= 0
          ? services.map((item) => (item.id === service.id ? saved : item))
          : [saved, ...services];

      set({ services: next, isSaving: false });
      return saved;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się zapisać serwisu",
        isSaving: false,
      });
      throw error;
    }
  },

  deleteService: async (id) => {
    set({ isSaving: true, error: null });

    try {
      await deleteServiceRecord(id);
      set({
        services: get().services.filter((item) => item.id !== id),
        isSaving: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się usunąć serwisu",
        isSaving: false,
      });
      throw error;
    }
  },

  getServiceById: (id) => get().services.find((item) => item.id === id),

  replaceService: (service) => {
    const services = get().services;
    const index = services.findIndex((item) => item.id === service.id);

    if (index < 0) {
      return;
    }

    set({
      services: services.map((item) => (item.id === service.id ? service : item)),
    });
  },

  updateSettings: async (settings) => {
    set({ isSaving: true, error: null });

    try {
      const saved = await saveServiceSettings(settings);
      set({ settings: saved, isSaving: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się zapisać ustawień",
        isSaving: false,
      });
      throw error;
    }
  },

  createEmptyService: () => {
    const settings = get().settings;
    const now = new Date().toISOString();

    return {
      id: ensureServiceUuid(crypto.randomUUID()),
      createdAt: now,
      updatedAt: now,
      status: "Wycena",
      projectId: null,
      clientId: null,
      client: {
        fullName: "",
        location: "",
        email: "",
        phone: "",
      },
      title: "",
      serviceType: "Pogwarancyjny",
      rates: { ...settings.rates },
      estimateDiscounts: { ...settings.defaultDiscounts },
      actualDiscounts: { ...settings.defaultDiscounts },
      zoneSettings: { ...settings.zoneSettings },
      detailedSettlement: false,
      estimate: emptyLineItems(),
      actual: emptyLineItems(),
      clientOffer: {
        token: null,
        expiresAt: null,
        status: null,
        message: null,
        respondedAt: null,
        lastClientMessage: null,
      },
      clientOfferHistory: [],
      clientOfferAcceptedDocument: null,
    };
  },
}));
