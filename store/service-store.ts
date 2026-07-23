"use client";

import { create } from "zustand";
import { calculateServiceCost } from "@/lib/service/calculate-service-cost";
import {
  calculateFixedPriceBreakdown,
  fixedPriceBreakdownToServiceCost,
} from "@/lib/service/fixed-price";
import { clearClientOfferWaitingIfNeeded } from "@/lib/service/client-offer";
import { DEFAULT_SERVICE_SETTINGS } from "@/lib/service/defaults";
import { defaultClientOfferExpiry } from "@/lib/service/offer-validity";
import { getActivityActor } from "@/lib/activity-log/actor";
import { serviceActivityHref } from "@/lib/activity-log/hrefs";
import {
  bootstrapServiceModule,
  deleteServiceRecord,
  ensureServiceUuid,
  saveServiceSettings,
  upsertServiceRecord,
} from "@/lib/supabase/service-repository";
import { logActivity } from "@/lib/supabase/activity-log-repository";
import {
  emptyLineItems,
  type ServiceGlobalSettings,
  type ServiceRecord,
} from "@/lib/service/types";
import { isUnreviewedIntakeOffer } from "@/lib/service/intake-offer";

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
  markIntakeOfferReviewed: (serviceId: string) => Promise<ServiceRecord | null>;
};

export function buildServiceCosts(service: ServiceRecord) {
  if (service.pricingModel === "fixed_price") {
    const estimateBreakdown = calculateFixedPriceBreakdown(
      service.fixedPriceTables,
      service.estimateDiscounts,
    );
    const estimate = fixedPriceBreakdownToServiceCost(estimateBreakdown);

    return { estimate, actual: estimate };
  }

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
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("services-intake-count-changed"));
      }
    } catch (error) {
      if (generation !== servicesRefreshGeneration) {
        return;
      }

      set({
        error: error instanceof Error ? error.message : "Nie udało się odświeżyć ofert",
      });
    }
  },

  markIntakeOfferReviewed: async (serviceId) => {
    const existing = get().services.find((item) => item.id === serviceId);
    if (existing && !isUnreviewedIntakeOffer(existing)) {
      return existing;
    }

    try {
      const response = await fetch(`/api/services/${serviceId}/review`, {
        method: "POST",
        credentials: "include",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się oznaczyć oferty jako obejrzanej.");
      }

      const service = payload.service as ServiceRecord;
      set((state) => ({
        services: state.services.map((item) => (item.id === service.id ? service : item)),
        error: null,
      }));

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("services-intake-count-changed"));
      }

      return service;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Nie udało się oznaczyć oferty jako obejrzanej",
      });
      throw error;
    }
  },

  upsertService: async (service) => {
    set({ isSaving: true, error: null });

    try {
      const normalized = clearClientOfferWaitingIfNeeded(service);
      const existed = get().services.some((item) => item.id === service.id);
      const saved = await upsertServiceRecord(normalized);
      const services = get().services;
      const index = services.findIndex((item) => item.id === service.id);
      const next =
        index >= 0
          ? services.map((item) => (item.id === service.id ? saved : item))
          : [saved, ...services];

      set({ services: next, isSaving: false });
      servicesRefreshGeneration += 1;

      const actor = getActivityActor();
      void logActivity({
        actorUserId: actor.userId,
        actorName: actor.name,
        action: existed ? "updated" : "created",
        entityType: "service",
        entityId: saved.id,
        entityLabel: saved.title || "Oferta",
        summary: existed ? "Zaktualizował ofertę" : "Dodał ofertę",
        href: serviceActivityHref(saved.id),
      });

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
      const existing = get().services.find((item) => item.id === id);
      await deleteServiceRecord(id);
      servicesRefreshGeneration += 1;
      set({
        services: get().services.filter((item) => item.id !== id),
        isSaving: false,
      });

      const actor = getActivityActor();
      void logActivity({
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "deleted",
        entityType: "service",
        entityId: id,
        entityLabel: existing?.title || id,
        summary: "Usunął ofertę",
        href: "/oferty",
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
      settlementOffer: {
        token: null,
        expiresAt: defaultClientOfferExpiry(),
        status: null,
        message: null,
        respondedAt: null,
        lastClientMessage: null,
      },
      settlementOfferHistory: [],
      settlementOfferAcceptedDocument: null,
      estimateApproval: { status: null, requestedBy: null, assignedAdminId: null, note: "", history: [] },
      settlementApproval: { status: null, requestedBy: null, assignedAdminId: null, note: "", history: [] },
      pricingModel: "hourly",
      fixedPriceTables: [],
      aiEstimate: null,
      intakeReference: null,
      reviewedAt: null,
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
    set({ isSaving: true, error: null, settings });

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
      settlementOffer: {
        token: null,
        expiresAt: defaultClientOfferExpiry(),
        status: null,
        message: null,
        respondedAt: null,
        lastClientMessage: null,
      },
      settlementOfferHistory: [],
      settlementOfferAcceptedDocument: null,
      estimateApproval: { status: null, requestedBy: null, assignedAdminId: null, note: "", history: [] },
      settlementApproval: { status: null, requestedBy: null, assignedAdminId: null, note: "", history: [] },
      pricingModel: "hourly",
      fixedPriceTables: [],
      aiEstimate: null,
      intakeReference: null,
      reviewedAt: null,
    };
  },
}));
