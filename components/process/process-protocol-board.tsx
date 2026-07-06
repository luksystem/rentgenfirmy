"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, FileText } from "lucide-react";
import { SignaturePad } from "@/components/process/signature-pad";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import type { ProtocolFieldValue, ProtocolSignature } from "@/lib/process/protocol-types";
import { getProtocolReferencePdfUrl } from "@/lib/supabase/process-protocol-repository";
import { formatDate } from "@/lib/utils";
import { useProcessStore } from "@/store/process-store";

function ProtocolSignatureBlock({
  label,
  signature,
  defaultSignerName,
  onSign,
  onClear,
}: {
  label: string;
  signature: ProtocolSignature | null;
  defaultSignerName?: string;
  onSign: (signature: ProtocolSignature) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const [signerName, setSignerName] = useState(defaultSignerName ?? "");
  const [pendingDataUrl, setPendingDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSave() {
    if (!pendingDataUrl) {
      setLocalError("Złóż podpis w polu powyżej.");
      return;
    }
    if (!signerName.trim()) {
      setLocalError("Podaj imię i nazwisko podpisującego.");
      return;
    }
    setBusy(true);
    setLocalError(null);
    try {
      await onSign({
        imageDataUrl: pendingDataUrl,
        signerName: signerName.trim(),
        signedAt: new Date().toISOString(),
      });
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Nie udało się zapisać podpisu.");
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    setBusy(true);
    try {
      await onClear();
    } finally {
      setBusy(false);
    }
  }

  if (signature) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
        <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {label} — podpisano
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={signature.imageDataUrl}
          alt={`Podpis: ${signature.signerName}`}
          className="mt-2 h-20 w-fit rounded-lg border border-border/60 bg-white px-3 object-contain"
        />
        <p className="mt-1 text-xs text-muted">
          {signature.signerName} · {formatDate(signature.signedAt)}
        </p>
        <Button type="button" size="sm" variant="outline" className="mt-2" disabled={busy} onClick={() => void handleClear()}>
          Usuń i podpisz ponownie
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/70 bg-surface-muted/20 p-3">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="mt-2">
        <Field label="Imię i nazwisko podpisującego">
          <Input value={signerName} onChange={(event) => setSignerName(event.target.value)} />
        </Field>
      </div>
      <div className="mt-2">
        <SignaturePad onChange={setPendingDataUrl} />
      </div>
      {localError ? <p className="mt-1 text-xs text-rose-400">{localError}</p> : null}
      <Button type="button" size="sm" className="mt-2" disabled={busy} onClick={() => void handleSave()}>
        {busy ? "Zapisywanie…" : "Zapisz podpis"}
      </Button>
    </div>
  );
}

export function ProcessProtocolBoard({
  projectProcessItemId,
  actorName,
}: {
  projectProcessItemId: string;
  actorName?: string;
}) {
  const protocolTemplates = useProcessStore((state) => state.protocolTemplates);
  const templatesHydrated = useProcessStore((state) => state.protocolTemplatesHydrated);
  const ensureProtocolTemplates = useProcessStore((state) => state.ensureProtocolTemplates);
  const protocol = useProcessStore((state) => state.projectProtocols[projectProcessItemId]);
  const ensureProjectProtocol = useProcessStore((state) => state.ensureProjectProtocol);
  const chooseProtocolTemplateForItem = useProcessStore((state) => state.chooseProtocolTemplateForItem);
  const saveProtocolFieldValues = useProcessStore((state) => state.saveProtocolFieldValues);
  const signProtocolCompany = useProcessStore((state) => state.signProtocolCompany);
  const signProtocolClient = useProcessStore((state) => state.signProtocolClient);
  const clearProtocolSignature = useProcessStore((state) => state.clearProtocolSignature);

  const [ready, setReady] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [choosingBusy, setChoosingBusy] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, ProtocolFieldValue>>({});
  const [notes, setNotes] = useState("");
  const [savingFields, setSavingFields] = useState(false);
  const [referencePdfUrl, setReferencePdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await Promise.all([ensureProtocolTemplates(), ensureProjectProtocol(projectProcessItemId)]);
      if (!cancelled) {
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ensureProtocolTemplates, ensureProjectProtocol, projectProcessItemId]);

  useEffect(() => {
    if (protocol) {
      setFieldValues(protocol.fieldValues);
      setNotes(protocol.notes);
    }
  }, [protocol?.id, protocol?.updatedAt]);

  const template = protocolTemplates.find((entry) => entry.id === protocol?.protocolTemplateId) ?? null;

  useEffect(() => {
    if (template?.source === "pdf" && template.referencePdfPath) {
      void getProtocolReferencePdfUrl(template.referencePdfPath).then(setReferencePdfUrl);
    } else {
      setReferencePdfUrl(null);
    }
  }, [template?.id, template?.referencePdfPath]);

  async function handleChooseTemplate() {
    if (!selectedTemplateId) {
      return;
    }
    setChoosingBusy(true);
    setError(null);
    try {
      await chooseProtocolTemplateForItem(projectProcessItemId, selectedTemplateId);
    } catch (chooseError) {
      setError(chooseError instanceof Error ? chooseError.message : "Nie udało się wybrać wzoru.");
    } finally {
      setChoosingBusy(false);
    }
  }

  async function handleSaveFields() {
    setSavingFields(true);
    setError(null);
    try {
      await saveProtocolFieldValues(projectProcessItemId, fieldValues, notes);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać protokołu.");
    } finally {
      setSavingFields(false);
    }
  }

  if (!ready || !templatesHydrated) {
    return <p className="text-sm text-muted">Ładowanie protokołu…</p>;
  }

  if (!protocol?.protocolTemplateId) {
    return (
      <div className="rounded-xl border border-border/70 bg-surface-muted/30 p-4">
        <p className="text-sm font-medium text-foreground">Wybierz wzór protokołu</p>
        <p className="mt-1 text-sm text-muted">
          Formularz pól albo referencyjny PDF — skonfigurowany w katalogu wzorów protokołów.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
          <Select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
            <option value="">Wybierz wzór…</option>
            {protocolTemplates.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </Select>
          <Button type="button" disabled={!selectedTemplateId || choosingBusy} onClick={() => void handleChooseTemplate()}>
            {choosingBusy ? "Wybieranie…" : "Wybierz"}
          </Button>
        </div>
        {!protocolTemplates.length ? (
          <p className="mt-2 text-xs text-muted">
            Brak wzorów — utwórz go w{" "}
            <a href="/procesy/protokoly" target="_blank" rel="noreferrer" className="text-accent hover:underline">
              katalogu wzorów protokołów
            </a>
            .
          </p>
        ) : null}
        {error ? <p className="mt-2 text-sm text-rose-400">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="rounded-xl border border-border/70 bg-surface-muted/20 p-3">
        <p className="text-sm font-medium text-foreground">{template?.name ?? "Wzór protokołu"}</p>
        {template?.description ? <p className="mt-1 text-xs text-muted">{template.description}</p> : null}
      </div>

      {template?.source === "pdf" ? (
        <div className="grid gap-3">
          {referencePdfUrl ? (
            <a
              href={referencePdfUrl}
              target="_blank"
              rel="noreferrer"
              className="flex w-fit items-center gap-1.5 rounded-lg border border-border/70 bg-surface-muted/20 px-3 py-2 text-sm text-accent hover:underline"
            >
              <FileText className="h-4 w-4" />
              Zobacz wzór PDF: {template.referencePdfName ?? "dokument"}
            </a>
          ) : (
            <p className="text-sm text-muted">Wzór PDF nie został jeszcze wgrany.</p>
          )}
          <Field label="Uwagi / notatki protokołu">
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} />
          </Field>
          <Button type="button" size="sm" disabled={savingFields} onClick={() => void handleSaveFields()}>
            {savingFields ? "Zapisywanie…" : "Zapisz uwagi"}
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {(template?.fields ?? []).map((field) => (
            <Field key={field.id} label={field.required ? `${field.label} *` : field.label}>
              {field.type === "textarea" ? (
                <Textarea
                  value={typeof fieldValues[field.id] === "string" ? (fieldValues[field.id] as string) : ""}
                  onChange={(event) => setFieldValues((current) => ({ ...current, [field.id]: event.target.value }))}
                  rows={3}
                />
              ) : field.type === "checkbox" ? (
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={Boolean(fieldValues[field.id])}
                    onChange={(event) => setFieldValues((current) => ({ ...current, [field.id]: event.target.checked }))}
                  />
                  Tak
                </label>
              ) : field.type === "select" ? (
                <Select
                  value={typeof fieldValues[field.id] === "string" ? (fieldValues[field.id] as string) : ""}
                  onChange={(event) => setFieldValues((current) => ({ ...current, [field.id]: event.target.value }))}
                >
                  <option value="">Wybierz…</option>
                  {(field.options ?? []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              ) : field.type === "date" ? (
                <Input
                  type="date"
                  value={typeof fieldValues[field.id] === "string" ? (fieldValues[field.id] as string) : ""}
                  onChange={(event) => setFieldValues((current) => ({ ...current, [field.id]: event.target.value }))}
                />
              ) : (
                <Input
                  value={typeof fieldValues[field.id] === "string" ? (fieldValues[field.id] as string) : ""}
                  onChange={(event) => setFieldValues((current) => ({ ...current, [field.id]: event.target.value }))}
                />
              )}
            </Field>
          ))}
          <Button type="button" size="sm" disabled={savingFields} onClick={() => void handleSaveFields()}>
            {savingFields ? "Zapisywanie…" : "Zapisz protokół"}
          </Button>
        </div>
      )}

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <ProtocolSignatureBlock
          label="Przedstawiciel firmy"
          signature={protocol.companySignature}
          defaultSignerName={actorName}
          onSign={(signature) => signProtocolCompany(projectProcessItemId, signature)}
          onClear={() => clearProtocolSignature(projectProcessItemId, "company")}
        />
        <ProtocolSignatureBlock
          label="Klient"
          signature={protocol.clientSignature}
          onSign={(signature) => signProtocolClient(projectProcessItemId, signature)}
          onClear={() => clearProtocolSignature(projectProcessItemId, "client")}
        />
      </div>

      {protocol.companySignature && protocol.clientSignature ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          Protokół podpisany przez obie strony.
        </div>
      ) : null}
    </div>
  );
}
