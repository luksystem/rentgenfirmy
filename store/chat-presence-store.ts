"use client";

import { create } from "zustand";

const TYPING_TTL_MS = 5000;

type ChatPresenceState = {
  typingByRoom: Record<string, Record<string, number>>;
  setTyping: (roomId: string, profileId: string) => void;
  clearStale: () => void;
};

export const useChatPresenceStore = create<ChatPresenceState>((set) => ({
  typingByRoom: {},

  setTyping: (roomId, profileId) => {
    set((state) => ({
      typingByRoom: {
        ...state.typingByRoom,
        [roomId]: { ...(state.typingByRoom[roomId] ?? {}), [profileId]: Date.now() },
      },
    }));
  },

  clearStale: () => {
    const now = Date.now();
    set((state) => {
      const next: Record<string, Record<string, number>> = {};
      for (const [roomId, entries] of Object.entries(state.typingByRoom)) {
        const filtered = Object.fromEntries(
          Object.entries(entries).filter(([, ts]) => now - ts < TYPING_TTL_MS),
        );
        if (Object.keys(filtered).length) {
          next[roomId] = filtered;
        }
      }
      return { typingByRoom: next };
    });
  },
}));

export function getTypingProfileIds(
  typingByRoom: Record<string, Record<string, number>>,
  roomId: string,
  excludeProfileId?: string,
): string[] {
  const entries = typingByRoom[roomId] ?? {};
  const now = Date.now();
  return Object.entries(entries)
    .filter(([profileId, ts]) => now - ts < TYPING_TTL_MS && profileId !== excludeProfileId)
    .map(([profileId]) => profileId);
}
