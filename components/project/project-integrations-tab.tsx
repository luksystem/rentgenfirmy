"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Cable,
  Loader2,
  Pencil,
  PlayCircle,
  Plus,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import {
  CONNECTION_METHOD_LABELS,
  CONNECTION_METHODS,
  INTEGRATION_TYPE_LABELS,
  INTEGRATION_TYPES,
  type ConnectionMethod,
  type IntegrationInput,
  type IntegrationMeta,
  type IntegrationType,
  type IntegrationUpdateInput,
  type LoxoneIntegrationConfig,
  type ProjectTelemetrySnapshot,
} from "@/lib/integrations/types";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useIntegrationsStore } from "@/store/integrations-store";
import { isIntegrationOperator } from "@/lib/auth/types";

function emptyLoxoneConfig(): LoxoneIntegrationConfig {
  return {
    serialNumber: "",
    useTls: false,
    tlsInsecure: false,
    virtualInputName: "",
    locationLabel: "",
  };
}

function emptyInput(): IntegrationInput {
  return {
    integrationType: "loxone",
    name: "",
    connectionMethod: "local_gateway",
    apiUrl: "",
    port: 80,
    loginUsername: "admin",
    password: "",
    isActive: true,
    technicalNotes: "",
    configJson: emptyLoxoneConfig(),
  };
}

function getLoxoneConfig(integration: IntegrationMeta): LoxoneIntegrationConfig {
  const config = integration.configJson as LoxoneIntegrationConfig;
  return {
    serialNumber: config.serialNumber ?? "",
    useTls: config.useTls ?? false,
    tlsInsecure: config.tlsInsecure ?? false,
    virtualInputName: config.virtualInputName ?? "",
    locationLabel: config.locationLabel ?? "",
  };
}

function formatMeasuredAt(value: string | null | undefined) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function IntegrationFormFields({
  form,
  onChange,
  includePassword,
  passwordRequired,
  editing,
}: {
  form: IntegrationInput;
  onChange: (next: IntegrationInput) => void;
  includePassword: boolean;
  passwordRequired: boolean;
  editing: boolean;
}) {
  const loxoneConfig = (form.configJson ?? emptyLoxoneConfig()) as LoxoneIntegrationConfig;
  const isCloud =
    form.connectionMethod === "remote_connect" || form.connectionMethod === "cloud";

  function updateLoxoneConfig(patch: Partial<LoxoneIntegrationConfig>) {
    onChange({
      ...form,
      configJson: { ...loxoneConfig, ...patch },
    });
  }

  return (
    <div className="grid gap-3">
      <Field label="Typ integracji *">
        <Select
          value={form.integrationType}
          onChange={(event) =>
            onChange({
              ...form,
              integrationType: event.target.value as IntegrationType,
              configJson: event.target.value === "loxone" ? emptyLoxoneConfig() : {},
            })
          }
        >
          {INTEGRATION_TYPES.map((type) => (
            <option key={type} value={type}>
              {INTEGRATION_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Nazwa integracji *">
        <Input
          value={form.name}
          placeholder="np. Miniserver — dom główny"
          onChange={(event) => onChange({ ...form, name: event.target.value })}
        />
      </Field>

      <Field label="Metoda połączenia *">
        <Select
          value={form.connectionMethod}
          onChange={(event) =>
            onChange({ ...form, connectionMethod: event.target.value as ConnectionMethod })
          }
        >
          {CONNECTION_METHODS.map((method) => (
            <option key={method} value={method}>
              {CONNECTION_METHOD_LABELS[method]}
            </option>
          ))}
        </Select>
      </Field>

      {!isCloud ? (
        <>
          <Field label="Adres IP / URL *">
            <Input
              value={form.apiUrl ?? ""}
              placeholder="192.168.1.77"
              onChange={(event) => onChange({ ...form, apiUrl: event.target.value })}
            />
          </Field>
          <Field label="Port">
            <Input
              type="number"
              value={form.port ?? ""}
              placeholder="80"
              onChange={(event) =>
                onChange({
                  ...form,
                  port: event.target.value ? Number(event.target.value) : null,
                })
              }
            />
          </Field>
        </>
      ) : null}

      <Field label="Login">
        <Input
          value={form.loginUsername ?? ""}
          placeholder="admin"
          autoComplete="off"
          onChange={(event) => onChange({ ...form, loginUsername: event.target.value })}
        />
      </Field>

      {includePassword ? (
        <Field label={passwordRequired ? "Hasło *" : "Nowe hasło (opcjonalnie)"}>
          {editing && !passwordRequired ? (
            <p className="rounded-xl border border-border/70 bg-surface-muted/50 px-3 py-2 text-sm text-muted">
              Dane dostępowe zapisane. Wpisz nowe hasło tylko jeśli chcesz je zmienić.
            </p>
          ) : null}
          <Input
            type="password"
            value={form.password}
            placeholder={passwordRequired ? "Hasło Miniservera" : "Zostaw puste, aby nie zmieniać"}
            autoComplete="new-password"
            onChange={(event) => onChange({ ...form, password: event.target.value })}
          />
        </Field>
      ) : null}

      {form.integrationType === "loxone" ? (
        <div className="grid gap-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300">
            Konfiguracja Loxone
          </p>

          {isCloud ? (
            <Field label="Numer seryjny Miniservera *">
              <Input
                value={loxoneConfig.serialNumber ?? ""}
                placeholder="504F94A1B2C3"
                onChange={(event) => updateLoxoneConfig({ serialNumber: event.target.value })}
              />
            </Field>
          ) : null}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={loxoneConfig.useTls ?? false}
              onChange={(event) => updateLoxoneConfig({ useTls: event.target.checked })}
            />
            HTTPS (Miniserver Gen 2+)
          </label>

          <Field label="Nazwa Virtual Input (temperatura) *">
            <Input
              value={loxoneConfig.virtualInputName ?? ""}
              placeholder="np. TempSalon"
              onChange={(event) => updateLoxoneConfig({ virtualInputName: event.target.value })}
            />
          </Field>

          <Field label="Lokalizacja w budynku *">
            <Input
              value={loxoneConfig.locationLabel ?? ""}
              placeholder="np. Parter — salon"
              onChange={(event) => updateLoxoneConfig({ locationLabel: event.target.value })}
            />
          </Field>
        </div>
      ) : null}

      <Field label="Notatki techniczne">
        <Textarea
          value={form.technicalNotes ?? ""}
          rows={2}
          placeholder="VPN, brama, uwagi serwisowe…"
          onChange={(event) => onChange({ ...form, technicalNotes: event.target.value })}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.isActive ?? true}
          onChange={(event) => onChange({ ...form, isActive: event.target.checked })}
        />
        Integracja aktywna (cykliczny odczyt raz dziennie)
      </label>
    </div>
  );
}

function TelemetryBadge({ snapshot }: { snapshot: ProjectTelemetrySnapshot | undefined }) {
  if (!snapshot) {
    return <span className="text-xs text-muted">Brak odczytu</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
          snapshot.onlineStatus
            ? "bg-emerald-500/15 text-emerald-300"
            : "bg-zinc-500/15 text-muted",
        )}
      >
        {snapshot.onlineStatus ? (
          <Wifi className="h-3 w-3" />
        ) : (
          <WifiOff className="h-3 w-3" />
        )}
        {snapshot.onlineStatus ? "Online" : "Offline"}
      </span>
      {snapshot.temperature != null ? (
        snapshot.temperature === 0 || snapshot.temperature === 1 ? (
          <span className="font-semibold text-foreground">Stan: {snapshot.temperature}</span>
        ) : (
          <span className="font-semibold text-foreground">{snapshot.temperature.toFixed(1)}°C</span>
        )
      ) : null}
      <span className="text-muted">{formatMeasuredAt(snapshot.measuredAt)}</span>
    </div>
  );
}

function IntegrationCard({
  integration,
  telemetry,
  canManage,
  canTest,
  onChanged,
}: {
  integration: IntegrationMeta;
  telemetry?: ProjectTelemetrySnapshot;
  canManage: boolean;
  canTest: boolean;
  onChanged: () => Promise<void>;
}) {
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [form, setForm] = useState<IntegrationInput>(() => ({
    integrationType: integration.integrationType,
    name: integration.name,
    connectionMethod: integration.connectionMethod,
    apiUrl: integration.apiUrl ?? "",
    port: integration.port,
    loginUsername: integration.loginUsername ?? "",
    password: "",
    isActive: integration.isActive,
    technicalNotes: integration.technicalNotes ?? "",
    configJson:
      integration.integrationType === "loxone"
        ? getLoxoneConfig(integration)
        : integration.configJson,
  }));

  async function handleTest() {
    setTesting(true);
    setError(null);
    setTestMessage(null);
    try {
      const response = await fetch(
        `/api/integrations/${encodeURIComponent(integration.id)}/test`,
        { method: "POST", credentials: "include" },
      );
      const payload = (await response.json()) as {
      message?: string;
      error?: string;
      ok?: boolean;
    };
    if (!response.ok) {
      throw new Error(payload.error ?? "Test połączenia nie powiódł się.");
    }
    if (payload.ok === false) {
      throw new Error(payload.message ?? "Test połączenia nie powiódł się.");
    }
    setTestMessage(payload.message ?? "Połączenie OK.");
      await onChanged();
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : "Błąd testu.");
    } finally {
      setTesting(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Usunąć integrację „${integration.name}”?`)) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/integrations/${encodeURIComponent(integration.id)}`,
        { method: "DELETE", credentials: "include" },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się usunąć integracji.");
      }
      await onChanged();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Błąd usuwania.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleSaveEdit() {
    setError(null);
    const payload: IntegrationUpdateInput = {
      integrationType: form.integrationType,
      name: form.name,
      connectionMethod: form.connectionMethod,
      apiUrl: form.apiUrl || null,
      port: form.port ?? null,
      loginUsername: form.loginUsername || null,
      isActive: form.isActive,
      technicalNotes: form.technicalNotes || null,
      configJson: form.configJson,
      ...(form.password.trim() ? { password: form.password } : {}),
    };

    const response = await fetch(`/api/integrations/${encodeURIComponent(integration.id)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(result.error ?? "Błąd zapisu.");
    }
    setEditOpen(false);
    await onChanged();
  }

  const loxoneConfig =
    integration.integrationType === "loxone" ? getLoxoneConfig(integration) : null;

  return (
    <>
      <div className="rounded-2xl border border-border/80 bg-surface-muted/40 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Cable className="h-4 w-4 text-indigo-400" />
              <p className="font-semibold text-foreground">{integration.name}</p>
              <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-muted">
                {INTEGRATION_TYPE_LABELS[integration.integrationType]}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">
              {CONNECTION_METHOD_LABELS[integration.connectionMethod]}
              {integration.apiUrl ? ` · ${integration.apiUrl}` : ""}
              {integration.port ? `:${integration.port}` : ""}
            </p>
            {loxoneConfig ? (
              <p className="mt-1 text-xs text-muted">
                Punkt: {loxoneConfig.virtualInputName} · {loxoneConfig.locationLabel}
              </p>
            ) : null}
            <div className="mt-2">
              <TelemetryBadge snapshot={telemetry} />
            </div>
            {integration.lastError ? (
              <p className="mt-2 text-xs text-amber-300">{integration.lastError}</p>
            ) : null}
            {testMessage ? <p className="mt-2 text-xs text-emerald-300">{testMessage}</p> : null}
            {error ? <p className="mt-2 text-xs text-rose-400">{error}</p> : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {canTest ? (
              <Button type="button" size="sm" variant="outline" disabled={testing} onClick={() => void handleTest()}>
                {testing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="mr-1.5 h-3.5 w-3.5" />}
                Test
              </Button>
            ) : null}
            {canManage ? (
              <>
                <Button type="button" size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Edytuj
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={deleting}
                  onClick={() => void handleDelete()}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Usuń
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edytuj integrację</DialogTitle>
            <DialogDescription>
              Zmiany zapisują się w dzienniku audytu. Hasło podawaj tylko przy zmianie.
            </DialogDescription>
          </DialogHeader>
          <IntegrationFormFields
            form={form}
            editing
            includePassword
            passwordRequired={false}
            onChange={setForm}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Anuluj
            </Button>
            <Button type="button" onClick={() => void handleSaveEdit().catch((saveError) => setError(saveError instanceof Error ? saveError.message : "Błąd zapisu."))}>
              Zapisz
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ProjectIntegrationsTab({ projectId }: { projectId: string }) {
  const profile = useAuthStore((state) => state.profile);
  const isAdministrator = useAuthStore((state) => state.isAdministrator);
  const bundle = useIntegrationsStore((state) => state.byProjectId[projectId]);
  const isLoading = useIntegrationsStore((state) => state.loadingProjectIds.has(projectId));
  const ensureProjectIntegrations = useIntegrationsStore((state) => state.ensureProjectIntegrations);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<IntegrationInput>(emptyInput);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = isAdministrator;
  const canTest = profile ? isIntegrationOperator(profile.role) : false;

  const refresh = useCallback(async () => {
    await ensureProjectIntegrations(projectId, { force: true, includeAudit: isAdministrator });
  }, [ensureProjectIntegrations, isAdministrator, projectId]);

  useEffect(() => {
    void ensureProjectIntegrations(projectId, { includeAudit: isAdministrator });
  }, [ensureProjectIntegrations, isAdministrator, projectId]);

  const telemetryByIntegration = useMemo(() => {
    const map = new Map<string, ProjectTelemetrySnapshot>();
    for (const entry of bundle?.telemetry ?? []) {
      map.set(entry.integrationId, entry);
    }
    return map;
  }, [bundle?.telemetry]);

  async function handleCreate() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/integrations`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się dodać integracji.");
      }
      setCreateOpen(false);
      setCreateForm(emptyInput());
      await refresh();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Błąd zapisu.");
    } finally {
      setSaving(false);
    }
  }

  const integrations = bundle?.integrations ?? [];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Activity className="h-4 w-4 text-indigo-400" />
            Połączenia techniczne
          </p>
          <p className="mt-1 text-xs text-muted">
            Loxone: odczyt Virtual Input (cyfrowe 0/1; analogowe — temperatura — wkrótce). Cron raz
            dziennie. Hasła nie są zwracane do
            przeglądarki po zapisie.
          </p>
        </div>
        {canManage ? (
          <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Dodaj integrację
          </Button>
        ) : null}
      </div>

      {isLoading && !bundle ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Ładowanie integracji…
        </p>
      ) : null}

      {integrations.length === 0 && bundle ? (
        <div className="rounded-2xl border border-dashed border-border/80 px-4 py-8 text-center text-sm text-muted">
          Brak integracji. {canManage ? "Dodaj pierwsze połączenie z systemem BMS." : ""}
        </div>
      ) : null}

      <div className="grid gap-3">
        {integrations.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            telemetry={telemetryByIntegration.get(integration.id)}
            canManage={canManage}
            canTest={canTest}
            onChanged={refresh}
          />
        ))}
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nowa integracja</DialogTitle>
            <DialogDescription>
              Skonfiguruj połączenie z Miniserverem Loxone i wskaż Virtual Input z temperaturą.
            </DialogDescription>
          </DialogHeader>
          <IntegrationFormFields
            form={createForm}
            editing={false}
            includePassword
            passwordRequired
            onChange={setCreateForm}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Anuluj
            </Button>
            <Button type="button" disabled={saving} onClick={() => void handleCreate()}>
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Zapisz integrację
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
