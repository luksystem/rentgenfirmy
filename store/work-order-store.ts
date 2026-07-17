"use client";

import { create } from "zustand";
import { getActivityActor } from "@/lib/activity-log/actor";
import { workOrderActivityHref } from "@/lib/activity-log/hrefs";
import { createEmptyWorkOrder } from "@/lib/work-order/defaults";
import type { WorkOrderRecord } from "@/lib/work-order/types";
import { logActivity } from "@/lib/supabase/activity-log-repository";
import {
  deleteWorkOrderRecord,
  fetchWorkOrders,
  upsertWorkOrderRecord,
} from "@/lib/supabase/work-order-repository";

type WorkOrderStore = {
  orders: WorkOrderRecord[];
  hydrated: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  upsertOrder: (order: WorkOrderRecord) => Promise<WorkOrderRecord>;
  deleteOrder: (id: string) => Promise<void>;
  getOrderById: (id: string) => WorkOrderRecord | undefined;
  getOrderByServiceId: (serviceId: string) => WorkOrderRecord | undefined;
  replaceOrder: (order: WorkOrderRecord) => void;
  createEmptyOrder: () => WorkOrderRecord;
};

export const useWorkOrderStore = create<WorkOrderStore>((set, get) => ({
  orders: [],
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
      const orders = await fetchWorkOrders();
      set({ orders, hydrated: true, isLoading: false, error: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się pobrać zleceń",
        isLoading: false,
      });
    }
  },

  refresh: async () => {
    try {
      const orders = await fetchWorkOrders();
      set({ orders, hydrated: true, error: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się odświeżyć zleceń",
      });
    }
  },

  upsertOrder: async (order) => {
    set({ isSaving: true, error: null });

    try {
      const existed = get().orders.some((item) => item.id === order.id);
      const saved = await upsertWorkOrderRecord(order);
      const orders = get().orders;
      const index = orders.findIndex((item) => item.id === order.id);
      const next =
        index >= 0
          ? orders.map((item) => (item.id === order.id ? saved : item))
          : [saved, ...orders];

      set({ orders: next, isSaving: false });

      const actor = getActivityActor();
      void logActivity({
        actorUserId: actor.userId,
        actorName: actor.name,
        action: existed ? "updated" : "created",
        entityType: "work_order",
        entityId: saved.id,
        entityLabel: saved.title || "Zlecenie",
        summary: existed ? "Zaktualizował zlecenie" : "Dodał zlecenie",
        href: workOrderActivityHref(),
      });

      return saved;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się zapisać zlecenia",
        isSaving: false,
      });
      throw error;
    }
  },

  deleteOrder: async (id) => {
    set({ isSaving: true, error: null });

    try {
      const existing = get().orders.find((item) => item.id === id);
      await deleteWorkOrderRecord(id);
      set({
        orders: get().orders.filter((item) => item.id !== id),
        isSaving: false,
      });

      const actor = getActivityActor();
      void logActivity({
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "deleted",
        entityType: "work_order",
        entityId: id,
        entityLabel: existing?.title || id,
        summary: "Usunął zlecenie",
        href: workOrderActivityHref(),
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Nie udało się usunąć zlecenia",
        isSaving: false,
      });
      throw error;
    }
  },

  getOrderById: (id) => get().orders.find((item) => item.id === id),

  getOrderByServiceId: (serviceId) =>
    get().orders.find((item) => item.serviceId === serviceId),

  replaceOrder: (order) => {
    const orders = get().orders;
    const index = orders.findIndex((item) => item.id === order.id);

    if (index < 0) {
      set({ orders: [order, ...orders] });
      return;
    }

    set({
      orders: orders.map((item) => (item.id === order.id ? order : item)),
    });
  },

  createEmptyOrder: () => createEmptyWorkOrder(),
}));
