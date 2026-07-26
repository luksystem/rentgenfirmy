"use client";

import { useEffect } from "react";
import { isSupabaseConfigured, getSupabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth-store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    void initialize();

    const supabase = getSupabase();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      // TOKEN_REFRESHED odpala się cyklicznie w tle (odświeżenie tokenu, powrót na kartę) —
      // nie zmienia użytkownika/profilu, a przeładowanie stanu (isLoading) resetowało formularze
      // w komponentach zależnych od isLoading/isAdministrator (np. ustawienia e-mail).
      if (event === "TOKEN_REFRESHED") {
        return;
      }
      void initialize();
    });

    return () => subscription.unsubscribe();
  }, [initialize]);

  return <>{children}</>;
}
