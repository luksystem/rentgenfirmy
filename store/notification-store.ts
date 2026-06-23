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
  refreshUnreadCount: (profileId: string) => Promise<void>;
  loadNotifications: (profileId: string) => Promise<void>;
  markRead: (profileId: string, notificationId: string) => Promise<void>;
  markAllRead: (profileId: string) => Promise<void>;
};

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  unreadCount: 0,
  items: [],
  loading: false,

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
        fetchUserNotifications(profileId),
        fetchUnreadNotificationCount(profileId),
      ]);
      set({ items, unreadCount, loading: false });
    } catch {
      set({ items: [], loading: false });
    }
  },

  markRead: async (profileId, notificationId) => {
    await markNotificationRead(notificationId, profileId);
    set((state) => ({
      unreadCount: Math.max(0, state.unreadCount - 1),
      items: state.items.map((item) =>
        item.id === notificationId ? { ...item, readAt: new Date().toISOString() } : item,
      ),
    }));
  },

  markAllRead: async (profileId) => {
    await markAllNotificationsRead(profileId);
    const now = new Date().toISOString();
    set((state) => ({
      unreadCount: 0,
      items: state.items.map((item) => ({ ...item, readAt: item.readAt ?? now })),
    }));
  },
}));
