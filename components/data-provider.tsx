"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { isPublicAppRoute } from "@/lib/auth/routes";
import { ensureWarrantyExpiringNotifications } from "@/lib/notifications/warranty-expiry";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { useNotificationStore } from "@/store/notification-store";
import { ProjectEditProvider } from "@/components/project-edit-provider";
import { ProcessHydrator } from "@/components/process/process-hydrator";
import { KanbanCacheHydrator } from "@/components/process/kanban-cache-hydrator";
import { DashboardHydrator } from "@/components/dashboard/dashboard-hydrator";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function DataProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const initialize = useAppStore((state) => state.initialize);
  const isLoading = useAppStore((state) => state.isLoading);
  const isInitialized = useAppStore((state) => state.isInitialized);
  const projects = useAppStore((state) => state.projects);
  const error = useAppStore((state) => state.error);
  const skipData = isPublicAppRoute(pathname);

  useEffect(() => {
    if (!skipData && isSupabaseConfigured()) {
      void initialize();
    }
  }, [initialize, skipData]);

  useEffect(() => {
    if (!isInitialized || skipData) {
      return;
    }
    void ensureWarrantyExpiringNotifications(projects)
      .then(() => {
        const profileId = useAuthStore.getState().profile?.id;
        if (profileId) {
          void useNotificationStore.getState().refreshFromRealtime(profileId);
        }
      })
      .catch(() => undefined);
  }, [isInitialized, projects, skipData]);

  if (skipData) {
    return <>{children}</>;
  }

  if (!isSupabaseConfigured()) {
    return (
      <Card className="mx-auto mt-10 max-w-2xl">
        <CardContent className="grid gap-4 py-8">
          <h2 className="text-xl font-semibold">Brak połączenia z Supabase</h2>
          <p className="text-sm leading-6 text-muted">
            Aplikacja nie widzi kluczy Supabase. Lokalnie dodaj je do{" "}
            <code className="rounded bg-surface-muted px-1.5 py-0.5 text-foreground">.env.local</code>, a na Vercel
            w <strong>Settings → Environment Variables</strong>.
          </p>
          <pre className="overflow-x-auto rounded-xl border border-border bg-black/50 p-4 text-xs text-foreground">
{`NEXT_PUBLIC_SUPABASE_URL=https://twoj-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=twoj-anon-key`}
          </pre>
          <p className="text-sm text-muted">
            Po dodaniu zmiennych na Vercel kliknij <strong>Redeploy</strong> — klucze
            NEXT_PUBLIC_ są wczytywane przy buildzie, nie wystarczy samo odświeżenie strony.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading && !isInitialized) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted">
        Ładowanie danych z Supabase...
      </div>
    );
  }

  if (error && !isInitialized) {
    return (
      <Card className="mx-auto mt-10 max-w-2xl border-rose-500/30">
        <CardContent className="grid gap-4 py-8">
          <h2 className="text-xl font-semibold text-rose-300">Błąd połączenia</h2>
          <p className="text-sm text-muted">{error}</p>
          <p className="text-sm text-muted">
            Upewnij się, że uruchomiłeś skrypt SQL z{" "}
            <code className="rounded bg-surface-muted px-1.5 py-0.5 text-foreground">supabase/schema.sql</code>.
          </p>
          <Button onClick={() => void initialize()}>Spróbuj ponownie</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <ProcessHydrator>
      <KanbanCacheHydrator>
        <DashboardHydrator>
          <>
            {error ? (
              <div className="panel-danger mb-4 rounded-xl border px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            ) : null}
            <ProjectEditProvider>{children}</ProjectEditProvider>
          </>
        </DashboardHydrator>
      </KanbanCacheHydrator>
    </ProcessHydrator>
  );
}
