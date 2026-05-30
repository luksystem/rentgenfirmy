"use client";

import { useEffect } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function DataProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAppStore((state) => state.initialize);
  const seedDemoData = useAppStore((state) => state.seedDemoData);
  const isLoading = useAppStore((state) => state.isLoading);
  const isInitialized = useAppStore((state) => state.isInitialized);
  const isSaving = useAppStore((state) => state.isSaving);
  const error = useAppStore((state) => state.error);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      void initialize();
    }
  }, [initialize]);

  if (!isSupabaseConfigured()) {
    return (
      <Card className="mx-auto mt-10 max-w-2xl">
        <CardContent className="grid gap-4 py-8">
          <h2 className="text-xl font-semibold">Brak połączenia z Supabase</h2>
          <p className="text-sm leading-6 text-slate-600">
            Aplikacja nie widzi kluczy Supabase. Lokalnie dodaj je do{" "}
            <code className="rounded bg-slate-100 px-1">.env.local</code>, a na Vercel
            w <strong>Settings → Environment Variables</strong>.
          </p>
          <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
{`NEXT_PUBLIC_SUPABASE_URL=https://twoj-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=twoj-anon-key`}
          </pre>
          <p className="text-sm text-slate-600">
            Po dodaniu zmiennych na Vercel kliknij <strong>Redeploy</strong> — klucze
            NEXT_PUBLIC_ są wczytywane przy buildzie, nie wystarczy samo odświeżenie strony.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading && !isInitialized) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
        Ładowanie danych z Supabase...
      </div>
    );
  }

  if (error && !isInitialized) {
    return (
      <Card className="mx-auto mt-10 max-w-2xl border-rose-200">
        <CardContent className="grid gap-4 py-8">
          <h2 className="text-xl font-semibold text-rose-700">Błąd połączenia</h2>
          <p className="text-sm text-slate-600">{error}</p>
          <p className="text-sm text-slate-600">
            Upewnij się, że uruchomiłeś skrypt SQL z{" "}
            <code className="rounded bg-slate-100 px-1">supabase/schema.sql</code>.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => void initialize()}>Spróbuj ponownie</Button>
            <Button variant="secondary" disabled={isSaving} onClick={() => void seedDemoData()}>
              Załaduj dane demo
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      {children}
    </>
  );
}
