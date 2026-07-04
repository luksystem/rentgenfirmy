"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FileUp, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { getUserDisplayName, type UserProfile } from "@/lib/auth/types";
import type {
  InspectionGlobalSettings,
  InspectionProtocolTemplate,
  InspectionSystemDefinition,
} from "@/lib/inspections/types";
import { fetchTeamProfiles } from "@/lib/supabase/profile-repository";

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 border-t border-border/60 pt-6 first:border-t-0 first:pt-0">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function InspectionSettingsView() {
  const [settings, setSettings] = useState<InspectionGlobalSettings | null>(null);
  const [templates, setTemplates] = useState<InspectionProtocolTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateSystemCode, setTemplateSystemCode] = useState("");
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [teamProfiles, setTeamProfiles] = useState<UserProfile[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [settingsResponse, templatesResponse] = await Promise.all([
        fetch("/api/inspections/settings", { credentials: "include" }),
        fetch("/api/inspections/templates", { credentials: "include" }),
      ]);
      const settingsPayload = await settingsResponse.json();
      const templatesPayload = await templatesResponse.json();
      if (!settingsResponse.ok) {
        throw new Error(settingsPayload.error ?? "Nie udało się wczytać ustawień.");
      }
      setSettings(settingsPayload.settings as InspectionGlobalSettings);
      if (templatesResponse.ok) {
        setTemplates(templatesPayload.templates ?? []);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    void fetchTeamProfiles()
      .then(setTeamProfiles)
      .catch(() => setTeamProfiles([]));
  }, [loadData]);

  function updateSystem(index: number, patch: Partial<InspectionSystemDefinition>) {
    if (!settings) {
      return;
    }
    setSettings({
      ...settings,
      systems: settings.systems.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...patch } : entry,
      ),
    });
    setSaved(false);
  }

  function addSystem() {
    if (!settings) {
      return;
    }
    setSettings({
      ...settings,
      systems: [
        ...settings.systems,
        { code: `system_${settings.systems.length + 1}`, label: "Nowy system", active: true },
      ],
    });
    setSaved(false);
  }

  function removeSystem(index: number) {
    if (!settings || settings.systems.length <= 1) {
      return;
    }
    setSettings({
      ...settings,
      systems: settings.systems.filter((_, entryIndex) => entryIndex !== index),
    });
    setSaved(false);
  }

  async function handleSaveSettings() {
    if (!settings) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/inspections/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się zapisać.");
      }
      setSettings(payload.settings as InspectionGlobalSettings);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Błąd.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddTemplate() {
    if (!templateName.trim() || !templateSystemCode) {
      setError("Podaj nazwę i system dla wzoru protokołu.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("name", templateName.trim());
      formData.set("systemCode", templateSystemCode);
      if (templateFile) {
        formData.set("file", templateFile);
      }

      const response = await fetch("/api/inspections/templates", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się dodać wzoru.");
      }

      setTemplateName("");
      setTemplateSystemCode("");
      setTemplateFile(null);
      await loadData();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Błąd.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Wczytywanie ustawień przeglądów…
      </div>
    );
  }

  return (
    <>
      {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}
      {saved ? <p className="mb-4 text-sm text-emerald-300">Zapisano ustawienia.</p> : null}

      <Card>
        <CardContent className="grid gap-2 py-5">
          <SettingsSection
            title="Rozliczenia"
            description="Osoba otrzymująca powiadomienie, gdy zrealizowany przegląd trafi do kolumny „Do rozliczenia”."
          >
            <Field label="Osoba odpowiedzialna za rozliczenie">
              <select
                value={settings?.billingResponsibleProfileId ?? ""}
                onChange={(event) => {
                  setSaved(false);
                  setSettings((current) =>
                    current
                      ? {
                          ...current,
                          billingResponsibleProfileId: event.target.value || null,
                        }
                      : current,
                  );
                }}
                className="h-10 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm"
              >
                <option value="">— wybierz —</option>
                {teamProfiles.map((member) => (
                  <option key={member.id} value={member.id}>
                    {getUserDisplayName(member)}
                  </option>
                ))}
              </select>
            </Field>
          </SettingsSection>

          <SettingsSection
            title="Systemy do przeglądu"
            description="Definicje systemów (SSP, SSWiN, CCTV itd.) dostępne w kreatorze planowania."
          >
            <div className="grid gap-3">
              {(settings?.systems ?? []).map((system, index) => (
                <div
                  key={`${system.code}-${index}`}
                  className="grid gap-3 rounded-xl border border-border/70 p-3 sm:grid-cols-[1fr_2fr_auto_auto]"
                >
                  <Field label="Kod">
                    <Input
                      value={system.code}
                      onChange={(event) =>
                        updateSystem(index, { code: event.target.value.trim().toLowerCase() })
                      }
                    />
                  </Field>
                  <Field label="Etykieta">
                    <Input
                      value={system.label}
                      onChange={(event) => updateSystem(index, { label: event.target.value })}
                    />
                  </Field>
                  <label className="flex items-end gap-2 pb-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={system.active}
                      onChange={(event) => updateSystem(index, { active: event.target.checked })}
                    />
                    Aktywny
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={(settings?.systems.length ?? 0) <= 1}
                    onClick={() => removeSystem(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addSystem}>
                <Plus className="mr-2 h-4 w-4" />
                Dodaj system
              </Button>
            </div>
          </SettingsSection>

          <SettingsSection
            title="Wzory protokołów"
            description="Globalne szablony protokołów serwisowych. Wzory per klient można dodać z poziomu planowania."
          >
            <div className="grid gap-3 rounded-xl border border-border/70 p-3 sm:grid-cols-2">
              <Field label="Nazwa wzoru">
                <Input
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  placeholder="np. Protokół SSP — wzór standardowy"
                />
              </Field>
              <Field label="System">
                <select
                  value={templateSystemCode}
                  onChange={(event) => setTemplateSystemCode(event.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-surface-muted px-3 text-sm"
                >
                  <option value="">— wybierz —</option>
                  {(settings?.systems ?? [])
                    .filter((entry) => entry.active)
                    .map((system) => (
                      <option key={system.code} value={system.code}>
                        {system.label}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Plik (PDF / DOCX)">
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf"
                  onChange={(event) => setTemplateFile(event.target.files?.[0] ?? null)}
                />
              </Field>
              <div className="flex items-end">
                <Button type="button" size="sm" disabled={busy} onClick={() => void handleAddTemplate()}>
                  <FileUp className="mr-2 h-4 w-4" />
                  Dodaj wzór
                </Button>
              </div>
            </div>

            {templates.length > 0 ? (
              <ul className="mt-4 grid gap-2">
                {templates.map((template) => (
                  <li
                    key={template.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
                  >
                    <span>
                      <span className="font-medium text-foreground">{template.name}</span>
                      <span className="text-muted"> · {template.systemCode.toUpperCase()}</span>
                    </span>
                    {template.fileUrl ? (
                      <Link
                        href={template.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-accent hover:underline"
                      >
                        Pobierz plik
                      </Link>
                    ) : (
                      <span className="text-xs text-muted">Bez pliku</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">Brak wzorów protokołów.</p>
            )}
          </SettingsSection>

          <div className="border-t border-border/60 pt-6">
            <Button disabled={busy} onClick={() => void handleSaveSettings()}>
              {busy ? "Zapisywanie…" : "Zapisz ustawienia systemów"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
