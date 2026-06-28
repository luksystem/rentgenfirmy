"use client";

import { create } from "zustand";
import {
  fetchUnreadNotificationCount,
  fetchUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/repository";
import type { UserNotification } from "@/lib/notifications/types";

type NotificationStore = {
  unreadCount: number;
  items: UserNotification[];
  loading: boolean;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  refreshUnreadCount: (profileId: string) => Promise<void>;
  loadNotifications: (profileId: string) => Promise<void>;
  refreshFromRealtime: (profileId: string) => Promise<void>;
  markRead: (profileId: string, notificationId: string) => Promise<void>;
  markAllRead: (profileId: string) => Promise<void>;
};

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  unreadCount: 0,
  items: [],
  loading: false,
  panelOpen: false,

  setPanelOpen: (open) => {
    set({ panelOpen: open });
  },

  refreshUnreadCount: async (profileId) => {
    try {
      const unreadCount = await fetchUnreadNotificationCount(profileId);
      set({ unreadCount });
    } catch {
      set({ unreadCount: 0 });
    }
  },

  loadNotifications: async (profileId) => {
    set({ loading: true });
    try {
      const [items, unreadCount] = await Promise.all([
        fetchUserNotifications(profileId, 30, true),
        fetchUnreadNotificationCount(profileId),
      ]);
      set({ items, unreadCount, loading: false });
    } catch {
      set({ items: [], loading: false });
    }
  },

  refreshFromRealtime: async (profileId) => {
    try {
      const unreadCount = await fetchUnreadNotificationCount(profileId);
      set({ unreadCount });
      if (get().panelOpen) {
        const items = await fetchUserNotifications(profileId, 30, true);
        set({ items, unreadCount });
      }
    } catch {
      set({ unreadCount: 0 });
    }
  },

  markRead: async (profileId, notificationId) => {
    await markNotificationRead(notificationId, profileId);
    set((state) => ({
      unreadCount: Math.max(0, state.unreadCount - 1),
      items: state.items.filter((item) => item.id !== notificationId),
    }));
  },

  markAllRead: async (profileId) => {
    await markAllNotificationsRead(profileId);
    set({
      unreadCount: 0,
      items: [],
    });
  },
}));
