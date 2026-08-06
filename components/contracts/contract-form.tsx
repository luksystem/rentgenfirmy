"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CommercialPartyPicker, type CommercialPartyKind } from "@/components/commercial-party-picker";
import { ContractPaymentPlansEditor } from "@/components/contracts/contract-payment-plans-editor";
import { ContractPreviewDialog } from "@/components/contracts/contract-preview-dialog";
import { ContractSectionsEditor } from "@/components/contracts/contract-sections-editor";
import { OfferEmailPreviewDialog } from "@/components/service/offer-email-preview-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import {
  buildContractMailtoUrl,
  canShareContract,
  formatContractLinkExpiryHint,
  shareContract,
} from "@/lib/contracts/contract-delivery";
import { buildContractFromTemplate } from "@/lib/contracts/factory";
import { calculateContractTotals } from "@/lib/contracts/totals";
import {
  CONTRACT_STATUS_LABELS,
  canCompanySignContract,
  canSendContract,
  type Contract,
} from "@/lib/contracts/types";
import { getContractDocumentSignedUrl, isContractLinkExpired } from "@/lib/supabase/contract-repository";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { useContractStore } from "@/store/contract-store";
import { formatDateTime, formatMoney } from "@/lib/utils";

type EmailPreview = { subject: string; html: string; to: string };

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error ?? "Nie udało się wykonać operacji.");
  }
  return data as T;
}

export function ContractForm({ initialContract }: { initialContract: Contract }) {
  const router = useRouter();
  const clients = useAppStore((state) => state.clients);
  const contacts = useAppStore((state) => state.contacts);
  const addClient = useAppStore((state) => state.addClient);
  const addContact = useAppStore((state) => state.addContact);
  const displayName = useAuthStore((state) => state.displayName);

  const templates = useContractStore((state) => state.templates);
  const contentBlocks = useContractStore((state) => state.contentBlocks);
  const saveContract = useContractStore((state) => state.saveContract);
  const removeContract = useContractStore((state) => state.removeContract);
  const regenerateContractLink = useContractStore((state) => state.regenerateContractLink);
  const signAsCompany = useContractStore((state) => state.signAsCompany);

  const [contract, setContract] = useState(initialContract);
  const [partyKind, setPartyKind] = useState<CommercialPartyKind>(
    initialContract.contactId ? "contact" : "client",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [companySignerName, setCompanySignerName] = useState(displayName ?? "");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
  const [emailPreview, setEmailPreview] = useState<EmailPreview | null>(null);
  const [emailPreviewError, setEmailPreviewError] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailNote, setEmailNote] = useState("");
  const noteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isNew = !useContractStore.getState().getContractById(initialContract.id);

  useEffect(() => {
    setCanShare(canShareContract());
  }, []);

  const totals = calculateContractTotals(contract.sections);
  const publicUrl =
    typeof window !== "undefined" && contract.publicToken
      ? `${window.location.origin}/podpisz-umowe/${contract.publicToken}`
      : null;
  const mailtoUrl = useMemo(
    () => (publicUrl ? buildContractMailtoUrl(contract, publicUrl) : null),
    [contract, publicUrl],
  );

  async function handleSave() {
    setIsSaving(true);
    try {
      const saved = await saveContract(contract);
      setContract(saved);
      if (isNew) {
        router.replace(`/umowy/${saved.id}`);
      }
    } catch {
      window.alert("Nie udało się zapisać umowy.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Usunąć tę umowę?")) {
      return;
    }
    try {
      await removeContract(contract.id);
      router.push("/umowy");
    } catch {
      window.alert("Nie udało się usunąć umowy.");
    }
  }

  async function handleGenerateLink() {
    setIsSaving(true);
    try {
      const saved = await regenerateContractLink(contract);
      setContract(saved);
    } catch {
      window.alert("Nie udało się wygenerować linku.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCopyLink() {
    if (!publicUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.alert("Nie udało się skopiować linku.");
    }
  }

  async function handleShare() {
    if (!publicUrl) {
      return;
    }
    try {
      await shareContract(contract, publicUrl);
    } catch (shareError) {
      if (shareError instanceof Error && shareError.name === "AbortError") {
        return;
      }
      window.alert(shareError instanceof Error ? shareError.message : "Nie udało się udostępnić linku.");
    }
  }

  async function handleOpenEmailPreview() {
    if (noteDebounceRef.current) {
      clearTimeout(noteDebounceRef.current);
    }
    setEmailPreviewError(null);
    setEmailPreview(null);
    setEmailNote("");
    setEmailPreviewOpen(true);
    try {
      // Wysyłka czyta umowę z bazy, więc najpierw zapisz ewentualne niezapisane zmiany —
      // inaczej mail poszedłby ze starą treścią/cenami.
      const saved = await saveContract(contract);
      setContract(saved);
      const data = await postJson<EmailPreview & { contract: Contract }>(
        `/api/umowy/${saved.id}/preview-email`,
      );
      setContract(data.contract);
      setEmailPreview({ subject: data.subject, html: data.html, to: data.to });
    } catch (loadError) {
      setEmailPreviewError(
        loadError instanceof Error ? loadError.message : "Nie udało się przygotować podglądu.",
      );
    }
  }

  function handleEmailNoteChange(nextNote: string) {
    setEmailNote(nextNote);
    if (noteDebounceRef.current) {
      clearTimeout(noteDebounceRef.current);
    }
    noteDebounceRef.current = setTimeout(() => {
      void postJson<EmailPreview & { contract: Contract }>(`/api/umowy/${contract.id}/preview-email`, {
        note: nextNote,
      })
        .then((data) => setEmailPreview({ subject: data.subject, html: data.html, to: data.to }))
        .catch(() => undefined);
    }, 600);
  }

  async function handleConfirmSendEmail() {
    setSendingEmail(true);
    setEmailPreviewError(null);
    try {
      const data = await postJson<{ contract: Contract; emailSkipped: boolean }>(
        `/api/umowy/${contract.id}/send`,
        { note: emailNote },
      );
      setContract(data.contract);
      setEmailPreviewOpen(false);
      if (data.emailSkipped) {
        window.alert("Brak konfiguracji RESEND_API_KEY — e-mail nie został wysłany.");
      }
    } catch (sendError) {
      setEmailPreviewError(sendError instanceof Error ? sendError.message : "Nie udało się wysłać maila.");
    } finally {
      setSendingEmail(false);
    }
  }

  async function handleCompanySign() {
    if (!companySignerName.trim()) {
      window.alert("Podaj imię i nazwisko przedstawiciela firmy.");
      return;
    }
    setIsSaving(true);
    try {
      const saved = await signAsCompany(contract, companySignerName);
      setContract(saved);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Nie udało się podpisać umowy.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleOpenDocument() {
    if (!contract.signedDocumentStoragePath) {
      return;
    }
    const url = await getContractDocumentSignedUrl(contract.signedDocumentStoragePath);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      window.alert("Nie udało się otworzyć dokumentu.");
    }
  }

  function handleLoadTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId);
    if (!template) {
      return;
    }
    if (
      contract.sections.length > 0 &&
      !window.confirm("Wczytanie szablonu zastąpi obecną treść i harmonogram spłat umowy. Kontynuować?")
    ) {
      return;
    }
    const built = buildContractFromTemplate(template, {
      clientId: contract.clientId,
      contactId: contract.contactId,
      client: contract.client,
      title: contract.title,
    });
    setContract({
      ...contract,
      templateId: template.id,
      title: contract.title || built.title,
      sections: built.sections,
      paymentPlans: built.paymentPlans,
    });
  }

  const hasLink = Boolean(contract.publicToken);
  const linkExpired = isContractLinkExpired(contract);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>Dane umowy</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-muted">
              {CONTRACT_STATUS_LABELS[contract.status]}
            </span>
            <Button type="button" variant="secondary" size="sm" onClick={() => setPreviewOpen(true)}>
              Podgląd umowy
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tytuł umowy">
              <Input
                value={contract.title}
                onChange={(event) => setContract({ ...contract, title: event.target.value })}
                placeholder="Np. Umowa na instalację Smart Home"
              />
            </Field>
            {templates.length > 0 ? (
              <Field label="Wczytaj z szablonu">
                <Select defaultValue="" onChange={(event) => handleLoadTemplate(event.target.value)}>
                  <option value="">Wybierz szablon…</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
          </div>

          <CommercialPartyPicker
            mode="offer"
            partyKind={partyKind}
            onPartyKindChange={(kind) => {
              setPartyKind(kind);
              if (kind === "client") {
                setContract({ ...contract, contactId: null });
              } else {
                setContract({ ...contract, clientId: null });
              }
            }}
            clients={clients}
            contacts={contacts}
            clientId={contract.clientId}
            contactId={contract.contactId}
            partySnapshot={contract.client}
            onSelectClient={(clientId, snapshot) =>
              setContract({ ...contract, clientId, contactId: null, client: { ...contract.client, ...snapshot } })
            }
            onSelectContact={(contactId, snapshot) =>
              setContract({ ...contract, contactId, clientId: null, client: { ...contract.client, ...snapshot } })
            }
            onCreateClient={addClient}
            onCreateContact={addContact}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nazwa firmy klienta (opcjonalnie)">
              <Input
                value={contract.client.companyName}
                onChange={(event) =>
                  setContract({ ...contract, client: { ...contract.client, companyName: event.target.value } })
                }
              />
            </Field>
            <Field label="NIP klienta (opcjonalnie)">
              <Input
                value={contract.client.nip}
                onChange={(event) => setContract({ ...contract, client: { ...contract.client, nip: event.target.value } })}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <ContractSectionsEditor
            sections={contract.sections}
            onChange={(sections) => setContract({ ...contract, sections })}
            contentBlocks={contentBlocks}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <ContractPaymentPlansEditor
            plans={contract.paymentPlans}
            sections={contract.sections}
            onChange={(paymentPlans) => setContract({ ...contract, paymentPlans })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Podpis i wysyłka</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-sm text-muted">
            Wartość umowy: <span className="font-semibold text-foreground">{formatMoney(totals.totalGross)} brutto</span>
            {" "}(bez opcji dodatkowych — klient wybiera je przy podpisywaniu).
          </p>

          {hasLink && !isNew ? (
            <div className="grid gap-1 text-sm text-muted">
              {contract.publicToken ? (
                <p>
                  Link publiczny: <span className="break-all text-foreground">{publicUrl}</span>
                  {linkExpired ? <span className="ml-2 text-rose-400">(wygasł)</span> : null}
                </p>
              ) : null}
              {contract.tokenExpiresAt ? <p>{formatContractLinkExpiryHint(contract.tokenExpiresAt)}</p> : null}
              {contract.clientSignature ? (
                <p>
                  Klient podpisał: {contract.clientSignature.signerName} —{" "}
                  {formatDateTime(contract.clientSignature.signedAt)}
                </p>
              ) : null}
              {contract.companySignature ? (
                <p>
                  Firma podpisała: {contract.companySignature.signerName} —{" "}
                  {formatDateTime(contract.companySignature.signedAt)}
                </p>
              ) : null}
            </div>
          ) : null}

          {publicUrl ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => void handleCopyLink()}>
                {copied ? "Skopiowano" : "Kopiuj link"}
              </Button>
              {mailtoUrl ? (
                <Button type="button" variant="secondary" size="sm" asChild>
                  <a href={mailtoUrl}>Wyślij e-mailem (klient pocztowy)</a>
                </Button>
              ) : null}
              {canShare ? (
                <Button type="button" variant="secondary" size="sm" onClick={() => void handleShare()}>
                  Udostępnij
                </Button>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {!isNew && canSendContract(contract) && contract.client.email.trim() ? (
              <Button type="button" onClick={() => void handleOpenEmailPreview()}>
                Wyślij do klienta
              </Button>
            ) : null}
            <Button type="button" variant="secondary" disabled={isSaving || isNew} onClick={handleGenerateLink}>
              {contract.publicToken ? "Wygeneruj nowy link" : "Wygeneruj link do podpisania"}
            </Button>
            {isNew ? (
              <p className="self-center text-xs text-muted">Zapisz umowę, żeby wygenerować link.</p>
            ) : null}
          </div>

          {!isNew && canSendContract(contract) && !contract.client.email.trim() ? (
            <p className="text-xs text-muted">
              Uzupełnij e-mail klienta, żeby wysłać umowę z serwera. Możesz też skopiować link i wysłać go
              SMS-em lub WhatsApp.
            </p>
          ) : null}

          {contract.tokenSentAt ? (
            <p className="rounded-xl border border-sky-500/25 bg-sky-500/8 px-3 py-2 text-xs text-foreground">
              Ta umowa została już wysłana e-mailem {formatDateTime(contract.tokenSentAt)}. Aby wysłać
              ponownie (np. po zmianie treści), wygeneruj nowy link przyciskiem „Wygeneruj nowy link” —
              poprzedni link przestanie działać.
            </p>
          ) : null}

          {canCompanySignContract(contract) ? (
            <div className="grid gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
              <p className="text-sm font-medium text-foreground">
                Klient podpisał — teraz podpisz w imieniu firmy, żeby wygenerować finalny dokument.
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <Field label="Imię i nazwisko przedstawiciela firmy" className="min-w-[240px] flex-1">
                  <Input value={companySignerName} onChange={(event) => setCompanySignerName(event.target.value)} />
                </Field>
                <Button type="button" disabled={isSaving} onClick={handleCompanySign}>
                  Podpisz jako firma
                </Button>
              </div>
            </div>
          ) : null}

          {contract.status === "signed_both" && contract.signedDocumentStoragePath ? (
            <Button type="button" variant="secondary" onClick={handleOpenDocument}>
              Otwórz podpisany PDF
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-between gap-2">
        <Button type="button" variant="destructive" disabled={isSaving || isNew} onClick={handleDelete}>
          Usuń umowę
        </Button>
        <Button type="button" disabled={isSaving} onClick={handleSave}>
          {isSaving ? "Zapisywanie…" : "Zapisz umowę"}
        </Button>
      </div>

      <ContractPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} contract={contract} />
      <OfferEmailPreviewDialog
        open={emailPreviewOpen}
        onOpenChange={setEmailPreviewOpen}
        preview={emailPreview}
        sending={sendingEmail}
        error={emailPreviewError}
        note={emailNote}
        onNoteChange={handleEmailNoteChange}
        onConfirmSend={() => void handleConfirmSendEmail()}
        confirmLabel="Wyślij umowę"
      />
    </div>
  );
}
