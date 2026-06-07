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
    } = supabase.auth.onAuthStateChange(() => {
      void initialize();
    });

    return () => subscription.unsubscribe();
  }, [initialize]);

  return <>{children}</>;
}
