"use client";

import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import {
  getUserDisplayName,
  isAdministratorRole,
  type UserProfile,
} from "@/lib/auth/types";
import { mapProfileRow } from "@/lib/supabase/profile-mappers";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

type AuthState = {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isAdministrator: boolean;
  displayName: string;
  initialize: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: false,
  isInitialized: false,
  error: null,
  isAuthenticated: false,
  isAdministrator: false,
  displayName: "",

  initialize: async () => {
    if (!isSupabaseConfigured()) {
      set({ isInitialized: true });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const supabase = getSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        set({
          user: null,
          profile: null,
          isAuthenticated: false,
          isAdministrator: false,
          displayName: "",
          isLoading: false,
          isInitialized: true,
        });
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      const profile = data ? mapProfileRow(data) : null;

      set({
        user,
        profile,
        isAuthenticated: Boolean(profile?.isActive),
        isAdministrator: profile ? isAdministratorRole(profile.role) : false,
        displayName: profile ? getUserDisplayName(profile) : user.email ?? "",
        isLoading: false,
        isInitialized: true,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Błąd ładowania sesji.",
        isLoading: false,
        isInitialized: true,
      });
    }
  },

  refreshProfile: async () => {
    await get().initialize();
  },

  signOut: async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    set({
      user: null,
      profile: null,
      isAuthenticated: false,
      isAdministrator: false,
      displayName: "",
    });
  },
}));
