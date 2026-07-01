"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { MobileFiltersPanel } from "@/components/mobile-filters-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/input";
import {
  PROJECT_INVOICE_KIND_LABELS,
  PROJECT_INVOICE_KINDS,
  formatInvoiceAmount,
  type ProjectInvoice,
  type ProjectInvoiceKind,
} from "@/lib/invoices/types";
import { useListAutoRefresh } from "@/lib/hooks/use-list-auto-refresh";
import {
  deleteProjectInvoice,
  fetchProjectInvoices,
} from "@/lib/supabase/project-invoice-repository";
import { useAppStore } from "@/store/app-store";
import { cn, formatDate } from "@/lib/utils";

const ALL = "";

function kindBadgeClass(kind: ProjectInvoiceKind) {
  return kind === "invoice"
    ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
    : "border-amber-500/30 bg-amber-500/10 text-amber-300";
}

export function ProjectInvoiceList() {
  const projects = useAppStore((state) => state.projects);
  const clients = useAppStore((state) => state.clients);
  const [invoices, setInvoices] = useState<ProjectInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState(ALL);
  const [clientFilter, setClientFilter] = useState(ALL);
  const [projectFilter, setProjectFilter] = useState(ALL);

  const projectNames = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );

  const clientNames = useMemo(
    () => new Map(clients.map((client) => [client.id, client.fullName])),
    [clients],
  );

  const refresh = useCallback(async () => {
    try {
      const rows = await fetchProjectInvoices();
      setInvoices(rows);
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useListAutoRefresh(refresh);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      if (kindFilter && invoice.kind !== kindFilter) {
        return false;
      }
      if (clientFilter && invoice.clientId !== clientFilter) {
        return false;
      }
      if (projectFilter && invoice.projectId !== projectFilter) {
        return false;
      }
      return true;
    });
  }, [clientFilter, invoices, kindFilter, projectFilter]);

  const totals = useMemo(() => {
    let gross = 0;
    let net = 0;
    for (const invoice of filteredInvoices) {
      if (invoice.amountGross != null) {
        gross += invoice.amountGross;
      }
      if (invoice.amountNet != null) {
        net += invoice.amountNet;
      }
    }
    return { gross, net, count: filteredInvoices.length };
  }, [filteredInvoices]);

  async function removeInvoice(invoiceId: string) {
    if (!window.confirm("Usunąć ten wpis wraz z załącznikiem?")) {
      return;
    }

    setDeletingId(invoiceId);
    try {
      await deleteProjectInvoice(invoiceId);
      setInvoices((current) => current.filter((entry) => entry.id !== invoiceId));
    } finally {
      setDeletingId(null);
    }
  }

  const filters = (
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label="Typ">
        <Select value={kindFilter} onChange={(event) => setKindFilter(event.target.value)}>
          <option value={ALL}>Wszystkie</option>
          {PROJECT_INVOICE_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {PROJECT_INVOICE_KIND_LABELS[kind]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Klient">
        <Select value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}>
          <option value={ALL}>Wszyscy</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.fullName}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Projekt">
        <Select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
          <option value={ALL}>Wszystkie</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted">
          {loading
            ? "Ładowanie…"
            : `${totals.count} wpisów · brutto ${totals.gross.toFixed(2)} PLN · netto ${totals.net.toFixed(2)} PLN`}
        </div>
        <Button asChild>
          <Link href="/faktury/nowy">
            <Plus className="h-4 w-4" />
            Dodaj fakturę / koszt
          </Link>
        </Button>
      </div>

      <MobileFiltersPanel title="Filtry">{filters}</MobileFiltersPanel>
      <div className="hidden sm:block">{filters}</div>

      {loading ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted">Ładowanie rejestru…</CardContent>
        </Card>
      ) : filteredInvoices.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted">
            Brak wpisów. Dodaj pierwszą fakturę lub koszt projektowy.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
            <table className="min-w-full text-sm">
              <thead className="border-b border-border bg-surface-muted/40 text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Typ</th>
                  <th className="px-4 py-3 font-medium">Tytuł</th>
                  <th className="px-4 py-3 font-medium">Kontrahent</th>
                  <th className="px-4 py-3 font-medium">Klient / projekt</th>
                  <th className="px-4 py-3 font-medium">Kwota</th>
                  <th className="px-4 py-3 font-medium">Plik</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-border/60 hover:bg-surface-muted/30">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(invoice.issueDate ?? invoice.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
                          kindBadgeClass(invoice.kind),
                        )}
                      >
                        {PROJECT_INVOICE_KIND_LABELS[invoice.kind]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{invoice.title}</div>
                      {invoice.invoiceNumber ? (
                        <div className="text-xs text-muted">{invoice.invoiceNumber}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted">{invoice.vendorName || "—"}</td>
                    <td className="px-4 py-3 text-muted">
                      <div>{invoice.clientId ? clientNames.get(invoice.clientId) ?? "—" : "—"}</div>
                      <div className="text-xs">
                        {invoice.projectId ? projectNames.get(invoice.projectId) ?? "—" : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium">
                      {formatInvoiceAmount(invoice)}
                    </td>
                    <td className="px-4 py-3">
                      {invoice.fileUrl ? (
                        <a
                          href={invoice.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-accent hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          PDF
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={deletingId === invoice.id}
                        onClick={() => void removeInvoice(invoice.id)}
                      >
                        <Trash2 className="h-4 w-4 text-rose-400" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {filteredInvoices.map((invoice) => (
              <Card key={invoice.id}>
                <CardContent className="grid gap-2 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">{invoice.title}</p>
                      <p className="text-xs text-muted">
                        {formatDate(invoice.issueDate ?? invoice.createdAt)}
                        {invoice.invoiceNumber ? ` · ${invoice.invoiceNumber}` : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                        kindBadgeClass(invoice.kind),
                      )}
                    >
                      {PROJECT_INVOICE_KIND_LABELS[invoice.kind]}
                    </span>
                  </div>
                  <p className="text-sm text-muted">{invoice.vendorName || "Brak kontrahenta"}</p>
                  <p className="text-sm font-medium">{formatInvoiceAmount(invoice)}</p>
                  <div className="flex flex-wrap gap-2">
                    {invoice.fileUrl ? (
                      <Button type="button" variant="secondary" size="sm" asChild>
                        <a href={invoice.fileUrl} target="_blank" rel="noreferrer">
                          Otwórz plik
                        </a>
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={deletingId === invoice.id}
                      onClick={() => void removeInvoice(invoice.id)}
                    >
                      Usuń
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
