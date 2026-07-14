"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  VIZ_ACCESS_ROLES,
  VIZ_ACCESS_ROLE_LABELS,
  type VizAccessRole,
  type VizDashboardAccess,
} from "@/lib/viz/types";

const selectClassName =
  "h-10 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm";

type AccessProfileOption = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type VizDashboardAccessConfigProps = {
  dashboardId: string;
};

export function VizDashboardAccessConfig({ dashboardId }: VizDashboardAccessConfigProps) {
  const [access, setAccess] = useState<VizDashboardAccess[]>([]);
  const [profiles, setProfiles] = useState<AccessProfileOption[]>([]);
  const [profileId, setProfileId] = useState("");
  const [accessRole, setAccessRole] = useState<VizAccessRole>("client_readonly");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [accessRes, profilesRes] = await Promise.all([
        fetch(`/api/viz/dashboards/${dashboardId}/config?section=access`),
        fetch("/api/viz/access-profiles"),
      ]);

      if (!accessRes.ok || !profilesRes.ok) {
        throw new Error("Nie udało się pobrać dostępu do dashboardu.");
      }

      const accessData = (await accessRes.json()) as { access: VizDashboardAccess[] };
      const profilesData = (await profilesRes.json()) as { profiles: AccessProfileOption[] };
      setAccess(accessData.access);
      setProfiles(profilesData.profiles);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd ładowania.");
    } finally {
      setIsLoading(false);
    }
  }, [dashboardId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleAddAccess() {
    if (!profileId) {
      setError("Wybierz użytkownika.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/viz/dashboards/${dashboardId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "access",
          access: { profileId, accessRole },
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Błąd zapisu dostępu.");
      }

      const data = (await response.json()) as { access: VizDashboardAccess };
      setAccess((prev) => {
        const without = prev.filter((item) => item.profileId !== data.access.profileId);
        return [...without, data.access];
      });
      setProfileId("");
      setMessage("Dodano dostęp użytkownika.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Błąd zapisu.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteAccess(accessId: string) {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/viz/dashboards/${dashboardId}/config?section=access&id=${encodeURIComponent(accessId)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error("Nie udało się usunąć dostępu.");
      }
      setAccess((prev) => prev.filter((item) => item.id !== accessId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Błąd usuwania.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <Card className="flex items-center gap-2 p-6 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Ładowanie dostępu…
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <h2 className="mb-1 text-base font-semibold">Dostęp użytkowników</h2>
      <p className="mb-4 text-sm text-muted">
        Przypisz użytkowników klienta lub partnerów do dashboardu. Rola określa uprawnienia (odczyt,
        energia, sterowanie setpointem).
      </p>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-medium">Użytkownik</label>
          <select
            className={selectClassName}
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
          >
            <option value="">— wybierz —</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name} ({profile.email}) · {profile.role}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Rola dashboardu</label>
          <select
            className={selectClassName}
            value={accessRole}
            onChange={(e) => setAccessRole(e.target.value as VizAccessRole)}
          >
            {VIZ_ACCESS_ROLES.map((role) => (
              <option key={role} value={role}>
                {VIZ_ACCESS_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button type="button" disabled={isSaving} onClick={() => void handleAddAccess()}>
          {isSaving ? "Zapisywanie…" : "Dodaj dostęp"}
        </Button>
        {message ? <span className="text-sm text-emerald-300">{message}</span> : null}
        {error ? <span className="text-sm text-rose-300">{error}</span> : null}
      </div>

      <div className="mt-6 space-y-2">
        {!access.length ? (
          <p className="text-sm text-muted">Brak przypisanych użytkowników poza administracją.</p>
        ) : (
          access.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted/40 px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{item.profileName ?? item.profileId}</p>
                <p className="text-muted">{VIZ_ACCESS_ROLE_LABELS[item.accessRole]}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isSaving}
                onClick={() => void handleDeleteAccess(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
