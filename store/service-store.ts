"use client";

import { create } from "zustand";
import { calculateServiceCost } from "@/lib/service/calculate-service-cost";
import { DEFAULT_SERVICE_SETTINGS } from "@/lib/service/defaults";
import { defaultClientOfferExpiry } from "@/lib/service/offer-validity";
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

let servicesRefreshGeneration = 0;

type ServiceStore = {
  services: ServiceRecord[];
  settings: ServiceGlobalSettings;
  hydrated: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  upsertService: (service: ServiceRecord) => Promise<ServiceRecord>;
  deleteService: (id: string) => Promise<void>;
  getServiceById: (id: string) => ServiceRecord | undefined;
  replaceService: (service: ServiceRecord) => void;
  duplicateServiceForClient: (sourceId: string, client: ServiceRecord["client"]) => Promise<ServiceRecord>;
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

  refresh: async () => {
    if (get().isSaving) {
      return;
    }

    const generation = ++servicesRefreshGeneration;

    try {
      const { services, settings } = await bootstrapServiceModule();
      if (generation !== servicesRefreshGeneration) {
        return;
      }

      set({
        services,
        settings,
        hydrated: true,
        error: null,
      });
    } catch (error) {
      if (generation !== servicesRefreshGeneration) {
        return;
      }

      set({
        error: error instanceof Error ? error.message : "Nie udało się odświeżyć ofert",
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
      servicesRefreshGeneration += 1;
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
      servicesRefreshGeneration += 1;
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

  duplicateServiceForClient: async (sourceId, client) => {
    const source = get().getServiceById(sourceId);
    if (!source) {
      throw new Error("Nie znaleziono rozliczenia do skopiowania.");
    }

    const now = new Date().toISOString();
    const clone: ServiceRecord = {
      ...source,
      id: ensureServiceUuid(crypto.randomUUID()),
      createdAt: now,
      updatedAt: now,
      client,
      clientId: null,
      projectId: null,
      title: source.title.trim() ? `${source.title.trim()} (kopia)` : "Rozliczenie (kopia)",
      status: source.status === "Rozliczony" ? "Do rozliczenia" : "Wycena",
      clientOffer: {
        token: null,
        expiresAt: defaultClientOfferExpiry(),
        status: null,
        message: null,
        respondedAt: null,
        lastClientMessage: null,
      },
      clientOfferHistory: [],
      clientOfferAcceptedDocument: null,
      aiEstimate: null,
      optionalItems: source.optionalItems.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
        clientSelected: false,
        billable: false,
      })),
    };

    return get().upsertService(clone);
  },

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
      contactId: null,
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
      showEstimateComparison: true,
      estimate: emptyLineItems(),
      actual: emptyLineItems(),
      optionalItems: [],
      clientOffer: {
        token: null,
        expiresAt: defaultClientOfferExpiry(),
        status: null,
        message: null,
        respondedAt: null,
        lastClientMessage: null,
      },
      clientOfferHistory: [],
      clientOfferAcceptedDocument: null,
      aiEstimate: null,
    };
  },
}));
