"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Eye, EyeOff, KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import type {
  SystemCredentialInput,
  SystemCredentialMeta,
  SystemCredentialUpdateInput,
} from "@/lib/dashboard/system-credentials-types";
import { cn } from "@/lib/utils";

const EMPTY_CREDENTIALS: SystemCredentialMeta[] = [];

export function emptyCredentialInput(): SystemCredentialInput {
  return {
    label: "",
    systemUrl: "",
    loginUsername: "",
    password: "",
    notes: "",
    visibleToClient: true,
  };
}

const emptyInput = emptyCredentialInput;

export function CredentialFormFields({
  form,
  onChange,
  includePassword,
  passwordRequired,
}: {
  form: SystemCredentialInput;
  onChange: (next: SystemCredentialInput) => void;
  includePassword: boolean;
  passwordRequired: boolean;
}) {
  return (
    <div className="grid gap-3">
      <Field label="System / nazwa *">
        <Input
          value={form.label}
          placeholder="np. Router WiFi, Panel alarmu, Aplikacja mobilna"
          onChange={(event) => onChange({ ...form, label: event.target.value })}
        />
      </Field>
      <Field label="Adres URL (opcjonalnie)">
        <Input
          value={form.systemUrl ?? ""}
          placeholder="https://…"
          onChange={(event) => onChange({ ...form, systemUrl: event.target.value })}
        />
      </Field>
      <Field label="Login / użytkownik (opcjonalnie)">
        <Input
          value={form.loginUsername ?? ""}
          placeholder="login lub e-mail"
          autoComplete="off"
          onChange={(event) => onChange({ ...form, loginUsername: event.target.value })}
        />
      </Field>
      {includePassword ? (
        <Field label={passwordRequired ? "Hasło *" : "Nowe hasło (opcjonalnie)"}>
          <Input
            type="password"
            value={form.password}
            placeholder={passwordRequired ? "Hasło do systemu" : "Zostaw puste, aby nie zmieniać"}
            autoComplete="new-password"
            onChange={(event) => onChange({ ...form, password: event.target.value })}
          />
        </Field>
      ) : null}
      <Field label="Notatka (opcjonalnie)">
        <Textarea
          value={form.notes ?? ""}
          rows={2}
          placeholder="Dodatkowe wskazówki dla klienta lub zespołu…"
          onChange={(event) => onChange({ ...form, notes: event.target.value })}
        />
      </Field>
      <label className="flex items-start gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          className="mt-1"
          checked={form.visibleToClient ?? true}
          onChange={(event) => onChange({ ...form, visibleToClient: event.target.checked })}
        />
        <span>
          Widoczne dla klienta w publicznym dashboardzie
          <span className="mt-0.5 block text-xs text-muted">
            Hasło nadal jest szyfrowane — klient musi je celowo odsłonić.
          </span>
        </span>
      </label>
    </div>
  );
}

function CredentialCard({
  credential,
  readOnly,
  publicToken,
  onChanged,
}: {
  credential: SystemCredentialMeta;
  readOnly: boolean;
  publicToken?: string;
  onChanged: () => void | Promise<void>;
}) {
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<SystemCredentialInput>({
    label: credential.label,
    systemUrl: credential.systemUrl ?? "",
    loginUsername: credential.loginUsername ?? "",
    password: "",
    notes: credential.notes ?? "",
    visibleToClient: credential.visibleToClient,
  });

  useEffect(() => {
    if (!revealedPassword) {
      return;
    }
    const timer = window.setTimeout(() => setRevealedPassword(null), 60_000);
    return () => window.clearTimeout(timer);
  }, [revealedPassword]);

  async function revealPassword() {
    if (revealedPassword) {
      setRevealedPassword(null);
      return;
    }

    setRevealing(true);
    setError(null);
    try {
      const response = publicToken
        ? await fetch(
            `/api/przestrzen/${encodeURIComponent(publicToken)}/credentials/${encodeURIComponent(credential.id)}/reveal`,
            { method: "POST", credentials: "include" },
          )
        : await fetch(
            `/api/project-system-credentials/item/${encodeURIComponent(credential.id)}/reveal`,
            { method: "POST", credentials: "include" },
          );

      const payload = (await response.json()) as { password?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się odsłonić hasła.");
      }
      setRevealedPassword(payload.password ?? "");
    } catch (revealError) {
      setError(revealError instanceof Error ? revealError.message : "Błąd odsłaniania hasła.");
    } finally {
      setRevealing(false);
    }
  }

  async function copyPassword() {
    if (!revealedPassword) {
      return;
    }
    await navigator.clipboard.writeText(revealedPassword);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function handleDelete() {
    if (!window.confirm(`Usunąć hasło do „${credential.label}”?`)) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/project-system-credentials/item/${encodeURIComponent(credential.id)}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Nie udało się usunąć wpisu.");
      }
      await onChanged();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Błąd usuwania.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveEdit() {
    setBusy(true);
    setError(null);
    try {
      const patch: SystemCredentialUpdateInput = {
        label: form.label,
        systemUrl: form.systemUrl || null,
        loginUsername: form.loginUsername || null,
        notes: form.notes || null,
        visibleToClient: form.visibleToClient,
      };
      if (form.password.trim()) {
        patch.password = form.password;
      }

      const response = await fetch(
        `/api/project-system-credentials/item/${encodeURIComponent(credential.id)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        },
      );
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Nie udało się zapisać zmian.");
      }
      setEditing(false);
      setForm((current) => ({ ...current, password: "" }));
      await onChanged();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Błąd zapisu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border/70 bg-surface-muted/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{credential.label}</p>
          {!credential.visibleToClient ? (
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              Tylko zespół
            </p>
          ) : null}
        </div>
        {!readOnly ? (
          <div className="flex shrink-0 gap-1">
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void handleDelete()}>
              <Trash2 className="h-3.5 w-3.5 text-rose-300" />
            </Button>
          </div>
        ) : null}
      </div>

      {credential.systemUrl ? (
        <a
          href={credential.systemUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block break-all text-sm text-accent hover:underline"
        >
          {credential.systemUrl}
        </a>
      ) : null}

      {credential.loginUsername ? (
        <p className="mt-2 text-sm text-muted">
          Login: <span className="font-medium text-foreground">{credential.loginUsername}</span>
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code
          className={cn(
            "rounded-lg border border-border/70 bg-background/60 px-3 py-1.5 text-sm",
            revealedPassword ? "text-foreground" : "tracking-widest text-muted",
          )}
        >
          {revealedPassword ?? "••••••••"}
        </code>
        <Button type="button" size="sm" variant="outline" disabled={revealing} onClick={() => void revealPassword()}>
          {revealing ? (
            "…"
          ) : revealedPassword ? (
            <>
              <EyeOff className="mr-2 h-3.5 w-3.5" />
              Ukryj
            </>
          ) : (
            <>
              <Eye className="mr-2 h-3.5 w-3.5" />
              Pokaż hasło
            </>
          )}
        </Button>
        {revealedPassword ? (
          <Button type="button" size="sm" variant="outline" onClick={() => void copyPassword()}>
            <Copy className="mr-2 h-3.5 w-3.5" />
            {copied ? "Skopiowano" : "Kopiuj"}
          </Button>
        ) : null}
      </div>

      {credential.notes ? <p className="mt-2 text-sm text-muted">{credential.notes}</p> : null}
      {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj hasło do systemu</DialogTitle>
            <DialogDescription>
              Zmiany zapisują się w bazie w formie zaszyfrowanej. Hasło odsłaniasz dopiero na żądanie.
            </DialogDescription>
          </DialogHeader>
          <CredentialFormFields
            form={form}
            onChange={setForm}
            includePassword
            passwordRequired={false}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditing(false)}>
              Anuluj
            </Button>
            <Button type="button" disabled={busy || !form.label.trim()} onClick={() => void handleSaveEdit()}>
              Zapisz
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ProjectSystemCredentialsPanel({
  projectId,
  readOnly = false,
  publicToken,
  seedCredentials,
}: {
  projectId: string;
  readOnly?: boolean;
  publicToken?: string;
  seedCredentials?: SystemCredentialMeta[];
}) {
  const [credentials, setCredentials] = useState<SystemCredentialMeta[]>(
    seedCredentials ?? EMPTY_CREDENTIALS,
  );
  const [loading, setLoading] = useState(!seedCredentials);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<SystemCredentialInput>(emptyInput());

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = publicToken
        ? await fetch(
            `/api/przestrzen/${encodeURIComponent(publicToken)}/credentials?projectId=${encodeURIComponent(projectId)}`,
            { credentials: "include" },
          )
        : await fetch(`/api/project-system-credentials/${encodeURIComponent(projectId)}`, {
            credentials: "include",
          });

      const payload = (await response.json()) as {
        credentials?: SystemCredentialMeta[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się pobrać haseł.");
      }
      setCredentials(payload.credentials ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd ładowania.");
    } finally {
      setLoading(false);
    }
  }, [projectId, publicToken]);

  useEffect(() => {
    if (seedCredentials !== undefined) {
      setCredentials(seedCredentials);
      setLoading(false);
      return;
    }
    void refresh();
  }, [refresh, seedCredentials]);

  async function handleCreate() {
    if (!form.label.trim() || !form.password.trim()) {
      setError("Podaj nazwę systemu i hasło.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/project-system-credentials/${encodeURIComponent(projectId)}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Nie udało się dodać hasła.");
      }
      setCreating(false);
      setForm(emptyInput());
      await refresh();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Błąd zapisu.");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !credentials.length) {
    return <p className="text-sm text-muted">Ładowanie haseł do systemów…</p>;
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="page-section-title flex items-center gap-2 text-base font-semibold">
            <KeyRound className="h-4 w-4 text-accent" />
            Hasła do systemów
          </h2>
          <p className="mt-1 text-sm text-muted">
            Hasła są szyfrowane w bazie. Nikt nie ma do nich stałego dostępu — odsłaniasz je tylko
            na żądanie.
          </p>
        </div>
        {!readOnly ? (
          <Button type="button" size="sm" onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Dodaj hasło
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {credentials.length ? (
        <div className="grid gap-3">
          {credentials.map((credential) => (
            <CredentialCard
              key={credential.id}
              credential={credential}
              readOnly={readOnly}
              publicToken={publicToken}
              onChanged={refresh}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Brak zapisanych haseł do systemów.</p>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nowe hasło do systemu</DialogTitle>
            <DialogDescription>
              Hasło zostanie zaszyfrowane przed zapisem. W bazie nie ma wersji jawnej.
            </DialogDescription>
          </DialogHeader>
          <CredentialFormFields form={form} onChange={setForm} includePassword passwordRequired />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreating(false)}>
              Anuluj
            </Button>
            <Button
              type="button"
              disabled={busy || !form.label.trim() || !form.password.trim()}
              onClick={() => void handleCreate()}
            >
              Zapisz
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
