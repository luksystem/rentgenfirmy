"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * Maile Supabase Auth (reset hasła / zaproszenie) czasem trafiają na Site URL zamiast
 * /auth/callback i niosą sesję jako fragment #access_token=... zamiast ?code=... — fragment
 * nigdy nie dociera do serwera, więc trzeba go obsłużyć po stronie klienta, gdziekolwiek
 * wyląduje (stąd montowanie w layoucie głównym, nie tylko na /auth/callback).
 */
export function HashSessionHandler() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined" || !isSupabaseConfigured()) {
      return;
    }

    const hash = window.location.hash;
    if (!hash || !hash.includes("access_token")) {
      return;
    }

    const params = new URLSearchParams(hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    if (!accessToken || !refreshToken) {
      return;
    }

    const supabase = getSupabase();
    void supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        if (error) {
          router.replace("/logowanie?error=auth_callback");
          return;
        }
        router.replace(type === "recovery" || type === "invite" ? "/konto/haslo" : "/");
      });
  }, [router]);

  return null;
}
