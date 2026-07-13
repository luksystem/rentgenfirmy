"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileText, Lock, Unlock } from "lucide-react";
import { PdfPageAnnotator } from "@/components/process/pdf-page-annotator";
import { SignaturePad } from "@/components/process/signature-pad";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import {
  isProtocolLocked,
  type ProtocolFieldValue,
  type ProtocolOverlayItem,
  type ProtocolSignature,
} from "@/lib/process/protocol-types";
import {
  getProtocolAnnotationUrl,
  getProtocolReferencePdfUrl,
} from "@/lib/supabase/process-protocol-repository";
import { formatDateTime } from "@/lib/utils";
import { useProcessStore } from "@/store/process-store";

const EMPTY_ANNOTATION_URLS: Record<number, string> = {};

function ProtocolSignatureBlock({
  label,
  signature,
  defaultSignerName,
  onSign,
  onClear,
  readOnly = false,
}: {
  label: string;
  signature: ProtocolSignature | null;
  defaultSignerName?: string;
  onSign: (signature: ProtocolSignature) => Promise<void>;
  onClear: () => Promise<void>;
  readOnly?: boolean;
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
          {signature.signerName} · {formatDateTime(signature.signedAt)}
        </p>
        {!readOnly ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-2"
            disabled={busy}
            onClick={() => void handleClear()}
          >
            Usuń i podpisz ponownie
          </Button>
        ) : null}
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className="rounded-xl border border-border/70 bg-surface-muted/20 p-3">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-1 text-xs text-muted">Brak podpisu.</p>
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
  projectId,
  actorName,
  canManageTemplate = false,
  onToggleComplete,
}: {
  projectProcessItemId: string;
  projectId?: string;
  actorName?: string;
  /** Administrator: możliwość zmiany lub wyczyszczenia już wybranego wzoru (czyści też pola i podpisy). */
  canManageTemplate?: boolean;
  /** Odhacza element procesu jako ukończony/nieukończony — wywoływane automatycznie przy akceptacji protokołu. */
  onToggleComplete?: (completed: boolean) => void;
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
  const saveProtocolAnnotation = useProcessStore((state) => state.saveProtocolAnnotation);
  const saveProtocolOverlayItems = useProcessStore((state) => state.saveProtocolOverlayItems);
  const acceptProtocol = useProcessStore((state) => state.acceptProtocol);
  const unacceptProtocol = useProcessStore((state) => state.unacceptProtocol);

  const [ready, setReady] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [choosingBusy, setChoosingBusy] = useState(false);
  const [changingTemplate, setChangingTemplate] = useState(false);
  const [clearingTemplate, setClearingTemplate] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, ProtocolFieldValue>>({});
  const [notes, setNotes] = useState("");
  const [savingFields, setSavingFields] = useState(false);
  const [referencePdfUrl, setReferencePdfUrl] = useState<string | null>(null);
  const [annotationUrls, setAnnotationUrls] = useState<Record<number, string>>(EMPTY_ANNOTATION_URLS);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [unaccepting, setUnaccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locked = isProtocolLocked(protocol);

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
  }, [protocol]);

  const template = protocolTemplates.find((entry) => entry.id === protocol?.protocolTemplateId) ?? null;

  useEffect(() => {
    if (template?.source === "pdf" && template.referencePdfPath) {
      void getProtocolReferencePdfUrl(template.referencePdfPath).then(setReferencePdfUrl);
    } else {
      setReferencePdfUrl(null);
    }
  }, [template?.id, template?.referencePdfPath, template?.source]);

  const annotationPathsKey = useMemo(
    () => (protocol?.annotations ?? []).map((entry) => `${entry.page}:${entry.imagePath}`).join("|"),
    [protocol?.annotations],
  );

  useEffect(() => {
    const annotations = protocol?.annotations ?? [];
    if (!annotations.length) {
      setAnnotationUrls(EMPTY_ANNOTATION_URLS);
      return;
    }
    let cancelled = false;
    void Promise.all(
      annotations.map(async (entry) => {
        const url = await getProtocolAnnotationUrl(entry.imagePath);
        return [entry.page, url] as const;
      }),
    ).then((entries) => {
      if (cancelled) {
        return;
      }
      const next: Record<number, string> = {};
      for (const [page, url] of entries) {
        if (url) {
          next[page] = url;
        }
      }
      setAnnotationUrls(next);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annotationPathsKey]);

  useEffect(() => {
    if (protocol?.generatedPdfPath) {
      void getProtocolAnnotationUrl(protocol.generatedPdfPath).then(setGeneratedPdfUrl);
    } else {
      setGeneratedPdfUrl(null);
    }
  }, [protocol?.generatedPdfPath]);

  async function handleSaveAnnotation(page: number, dataUrl: string | null) {
    await saveProtocolAnnotation(projectProcessItemId, page, dataUrl);
  }

  async function handleSaveOverlayItems(overlayItems: ProtocolOverlayItem[]) {
    await saveProtocolOverlayItems(projectProcessItemId, overlayItems);
  }

  async function handleAccept() {
    if (!projectId) {
      setError("Brak identyfikatora projektu — nie można wygenerować dokumentu.");
      return;
    }
    setAccepting(true);
    setError(null);
    try {
      await acceptProtocol(projectProcessItemId, projectId, actorName ?? "Przedstawiciel firmy");
      onToggleComplete?.(true);
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : "Nie udało się zaakceptować protokołu.");
    } finally {
      setAccepting(false);
    }
  }

  async function handleUnaccept() {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Odblokować protokół do edycji? Wcześniej wygenerowany PDF zostanie w Dokumentach jako archiwum.")
    ) {
      return;
    }
    setUnaccepting(true);
    setError(null);
    try {
      await unacceptProtocol(projectProcessItemId);
      onToggleComplete?.(false);
    } catch (unacceptError) {
      setError(unacceptError instanceof Error ? unacceptError.message : "Nie udało się odblokować protokołu.");
    } finally {
      setUnaccepting(false);
    }
  }

  async function handleChooseTemplate() {
    if (!selectedTemplateId) {
      return;
    }
    setChoosingBusy(true);
    setError(null);
    try {
      await chooseProtocolTemplateForItem(projectProcessItemId, selectedTemplateId);
      setChangingTemplate(false);
      setSelectedTemplateId("");
    } catch (chooseError) {
      setError(chooseError instanceof Error ? chooseError.message : "Nie udało się wybrać wzoru.");
    } finally {
      setChoosingBusy(false);
    }
  }

  async function handleClearTemplate() {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Wyczyścić wybrany wzór protokołu? Wypełnione pola, uwagi i oba podpisy zostaną usunięte.",
      )
    ) {
      return;
    }
    setClearingTemplate(true);
    setError(null);
    try {
      await chooseProtocolTemplateForItem(projectProcessItemId, null);
      setChangingTemplate(false);
      setSelectedTemplateId("");
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : "Nie udało się wyczyścić wzoru.");
    } finally {
      setClearingTemplate(false);
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

  if (!protocol?.protocolTemplateId || changingTemplate) {
    return (
      <div className="rounded-xl border border-border/70 bg-surface-muted/30 p-4">
        <p className="text-sm font-medium text-foreground">
          {protocol?.protocolTemplateId ? "Zmień wzór protokołu" : "Wybierz wzór protokołu"}
        </p>
        <p className="mt-1 text-sm text-muted">
          Formularz pól albo referencyjny PDF — skonfigurowany w katalogu wzorów protokołów.
        </p>
        {protocol?.protocolTemplateId ? (
          <p className="mt-1 text-xs text-amber-300">
            Zmiana wzoru wyczyści dotychczas wypełnione pola i oba podpisy tego protokołu.
          </p>
        ) : null}
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
        {protocol?.protocolTemplateId ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={choosingBusy || clearingTemplate}
              onClick={() => {
                setChangingTemplate(false);
                setSelectedTemplateId("");
                setError(null);
              }}
            >
              Anuluj
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
              disabled={clearingTemplate || choosingBusy}
              onClick={() => void handleClearTemplate()}
            >
              {clearingTemplate ? "Czyszczenie…" : "Wyczyść wzór"}
            </Button>
          </div>
        ) : null}
        {error ? <p className="mt-2 text-sm text-rose-400">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-start justify-between gap-2 rounded-xl border border-border/70 bg-surface-muted/20 p-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{template?.name ?? "Wzór protokołu"}</p>
          {template?.description ? <p className="mt-1 text-xs text-muted">{template.description}</p> : null}
        </div>
        {canManageTemplate && !locked ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => setChangingTemplate(true)}
          >
            Zmień wzór
          </Button>
        ) : null}
      </div>

      {template?.source === "pdf" ? (
        <div className="grid gap-3">
          {referencePdfUrl ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <a
                href={referencePdfUrl}
                target="_blank"
                rel="noreferrer"
                className="flex w-fit items-center gap-1.5 rounded-lg border border-border/70 bg-surface-muted/20 px-3 py-2 text-sm text-accent hover:underline"
              >
                <FileText className="h-4 w-4" />
                Oryginalny wzór: {template.referencePdfName ?? "dokument"}
              </a>
            </div>
          ) : (
            <p className="text-sm text-muted">Wzór PDF nie został jeszcze wgrany.</p>
          )}
          {referencePdfUrl ? (
            <PdfPageAnnotator
              pdfUrl={referencePdfUrl}
              annotationUrlsByPage={annotationUrls}
              onSaveAnnotation={handleSaveAnnotation}
              overlayItems={protocol.overlayItems}
              onSaveOverlayItems={handleSaveOverlayItems}
              companySignatureUrl={protocol.companySignature?.imageDataUrl ?? null}
              clientSignatureUrl={protocol.clientSignature?.imageDataUrl ?? null}
              readOnly={locked}
            />
          ) : null}
          <Field label="Uwagi / notatki protokołu">
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              disabled={locked}
            />
          </Field>
          {!locked ? (
            <Button type="button" size="sm" disabled={savingFields} onClick={() => void handleSaveFields()}>
              {savingFields ? "Zapisywanie…" : "Zapisz uwagi"}
            </Button>
          ) : null}
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
                  disabled={locked}
                />
              ) : field.type === "checkbox" ? (
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={Boolean(fieldValues[field.id])}
                    disabled={locked}
                    onChange={(event) => setFieldValues((current) => ({ ...current, [field.id]: event.target.checked }))}
                  />
                  Tak
                </label>
              ) : field.type === "select" ? (
                <Select
                  value={typeof fieldValues[field.id] === "string" ? (fieldValues[field.id] as string) : ""}
                  disabled={locked}
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
                  disabled={locked}
                  onChange={(event) => setFieldValues((current) => ({ ...current, [field.id]: event.target.value }))}
                />
              ) : (
                <Input
                  value={typeof fieldValues[field.id] === "string" ? (fieldValues[field.id] as string) : ""}
                  disabled={locked}
                  onChange={(event) => setFieldValues((current) => ({ ...current, [field.id]: event.target.value }))}
                />
              )}
            </Field>
          ))}
          {!locked ? (
            <Button type="button" size="sm" disabled={savingFields} onClick={() => void handleSaveFields()}>
              {savingFields ? "Zapisywanie…" : "Zapisz protokół"}
            </Button>
          ) : null}
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
          readOnly={locked}
        />
        <ProtocolSignatureBlock
          label="Klient"
          signature={protocol.clientSignature}
          onSign={(signature) => signProtocolClient(projectProcessItemId, signature)}
          onClear={() => clearProtocolSignature(projectProcessItemId, "client")}
          readOnly={locked}
        />
      </div>

      {locked ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <div className="flex items-center gap-1.5 font-medium">
            <Lock className="h-4 w-4" />
            Protokół zaakceptowany {formatDateTime(protocol.acceptedAt ?? undefined)}
            {protocol.acceptedBy ? ` przez ${protocol.acceptedBy}` : ""}.
          </div>
          <p className="mt-1 text-emerald-100/80">Protokół jest zablokowany do edycji.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {generatedPdfUrl ? (
              <a
                href={generatedPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-100 hover:bg-emerald-500/20"
              >
                <FileText className="h-3.5 w-3.5" />
                Otwórz wygenerowany PDF
              </a>
            ) : null}
            {canManageTemplate ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-emerald-400/40 text-emerald-100 hover:bg-emerald-500/10"
                disabled={unaccepting}
                onClick={() => void handleUnaccept()}
              >
                <Unlock className="mr-1.5 h-3.5 w-3.5" />
                {unaccepting ? "Odblokowywanie…" : "Odblokuj protokół"}
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border/70 bg-surface-muted/20 p-3">
          {protocol.companySignature && protocol.clientSignature ? (
            <p className="mb-2 text-sm text-emerald-300">Protokół podpisany przez obie strony.</p>
          ) : (
            <p className="mb-2 text-xs text-muted">
              Do akceptacji i wygenerowania finalnego PDF potrzebne są oba podpisy.
            </p>
          )}
          <Button
            type="button"
            size="sm"
            disabled={!protocol.companySignature || !protocol.clientSignature || accepting}
            onClick={() => void handleAccept()}
          >
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            {accepting ? "Generowanie PDF…" : "Zaakceptuj i wygeneruj PDF"}
          </Button>
        </div>
      )}
    </div>
  );
}
