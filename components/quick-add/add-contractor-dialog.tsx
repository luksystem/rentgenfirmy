"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HardHat } from "lucide-react";
import { emptyTradeInput, TradeFormFields } from "@/components/dashboard/trade-form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import type { ProjectTradeInput } from "@/lib/dashboard/trade-types";
import { formatPartyName } from "@/lib/party/display-name";
import type { TradeCompanyItem } from "@/lib/trades/company-types";
import { useAppStore } from "@/store/app-store";
import { useProjectTradeStore } from "@/store/project-trade-store";

export function AddContractorDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const clients = useAppStore((state) => state.clients);
  const projects = useAppStore((state) => state.projects);
  const fieldOptions = useAppStore((state) => state.fieldOptions);
  const refreshFieldOptions = useAppStore((state) => state.refreshFieldOptions);
  const addTrade = useProjectTradeStore((state) => state.addTrade);

  const [clientQuery, setClientQuery] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [projectQuery, setProjectQuery] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectTradeInput>(emptyTradeInput());
  const [companyPool, setCompanyPool] = useState<TradeCompanyItem[]>(
    fieldOptions.tradeCompanies ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = fieldOptions.tradeCatalogItems;

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    void (async () => {
      try {
        const options = await refreshFieldOptions();
        if (!cancelled) {
          setCompanyPool(options.tradeCompanies ?? []);
        }
      } catch {
        if (!cancelled) {
          setCompanyPool(fieldOptions.tradeCompanies ?? []);
        }
      }
      try {
        const response = await fetch("/api/trades/companies", { credentials: "include" });
        const payload = await response.json();
        if (!cancelled && response.ok) {
          setCompanyPool(payload.companies ?? []);
        }
      } catch {
        // opcjonalne
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, refreshFieldOptions]);

  const filteredClients = useMemo(() => {
    const normalized = clientQuery.trim().toLowerCase();
    const list = [...clients].sort((a, b) =>
      formatPartyName(a).localeCompare(formatPartyName(b), "pl"),
    );
    if (!normalized) {
      return list.slice(0, 50);
    }
    return list
      .filter((client) => {
        const haystack = [formatPartyName(client), client.location, client.addressCity, client.phone]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalized);
      })
      .slice(0, 50);
  }, [clientQuery, clients]);

  const clientProjects = useMemo(() => {
    if (!clientId) return [];
    return projects
      .filter((project) => project.clientId === clientId)
      .sort((a, b) => a.name.localeCompare(b.name, "pl"));
  }, [clientId, projects]);

  const filteredProjects = useMemo(() => {
    const normalized = projectQuery.trim().toLowerCase();
    if (!normalized) return clientProjects;
    return clientProjects.filter((project) => project.name.toLowerCase().includes(normalized));
  }, [clientProjects, projectQuery]);

  const selectedClient = clients.find((client) => client.id === clientId) ?? null;
  const selectedProject = clientProjects.find((project) => project.id === projectId) ?? null;

  function reset() {
    setClientQuery("");
    setClientId(null);
    setProjectQuery("");
    setProjectId(null);
    setForm(emptyTradeInput());
    setError(null);
    setSaving(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset();
    }
    onOpenChange(next);
  }

  function handleSelectClient(id: string) {
    setClientId(id);
    setProjectId(null);
    setProjectQuery("");
    setError(null);
    const related = projects
      .filter((project) => project.clientId === id)
      .sort((a, b) => a.name.localeCompare(b.name, "pl"));
    if (related.length === 1) {
      setProjectId(related[0].id);
    }
  }

  async function handleSave() {
    if (!clientId) {
      setError("Wybierz klienta.");
      return;
    }
    if (clientProjects.length === 0) {
      setError("Ten klient nie ma projektów — najpierw utwórz projekt.");
      return;
    }
    if (!projectId) {
      setError(
        clientProjects.length > 1
          ? "Klient ma kilka projektów — wybierz projekt."
          : "Wybierz projekt.",
      );
      return;
    }
    if (!form.name.trim()) {
      setError("Podaj branżę wykonawcy.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await addTrade(projectId, form);
      handleOpenChange(false);
      router.push(
        `/przestrzenie/klient/${encodeURIComponent(clientId)}?project=${encodeURIComponent(projectId)}&tab=trades`,
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się dodać wykonawcy.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nowy Wykonawca</DialogTitle>
          <DialogDescription>
            Najpierw wskaż klienta i projekt, potem uzupełnij dane wykonawcy. Trafi do listy
            wykonawców projektu oraz do katalogu branż.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-3 rounded-xl border border-border/70 bg-surface-muted/10 p-3">
            <Field label="Szukaj klienta *">
              <Input
                value={clientQuery}
                onChange={(event) => setClientQuery(event.target.value)}
                placeholder="Nazwisko, firma, miasto…"
                list="add-contractor-clients"
                autoFocus
              />
              <datalist id="add-contractor-clients">
                {filteredClients.map((client) => (
                  <option key={client.id} value={formatPartyName(client)} />
                ))}
              </datalist>
            </Field>

            <div className="max-h-40 min-h-0 overflow-y-auto rounded-xl border border-border/70">
              {filteredClients.length === 0 ? (
                <p className="px-3 py-4 text-sm text-muted">Brak wyników.</p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {filteredClients.map((client) => {
                    const selected = client.id === clientId;
                    return (
                      <li key={client.id}>
                        <button
                          type="button"
                          className={
                            selected
                              ? "flex w-full flex-col gap-0.5 bg-accent/10 px-3 py-2.5 text-left"
                              : "flex w-full flex-col gap-0.5 px-3 py-2.5 text-left hover:bg-surface-muted/40"
                          }
                          onClick={() => handleSelectClient(client.id)}
                        >
                          <span className="text-sm font-medium text-foreground">
                            {formatPartyName(client)}
                          </span>
                          <span className="text-xs text-muted">
                            {client.addressCity || client.location || "Bez lokalizacji"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {selectedClient && clientProjects.length > 1 ? (
              <>
                <Field label="Szukaj / wybierz projekt *">
                  <Input
                    value={projectQuery}
                    onChange={(event) => {
                      setProjectQuery(event.target.value);
                      const match = clientProjects.find(
                        (project) =>
                          project.name.toLowerCase() === event.target.value.trim().toLowerCase(),
                      );
                      if (match) {
                        setProjectId(match.id);
                      }
                    }}
                    placeholder="Wpisz nazwę projektu…"
                    list="add-contractor-projects"
                  />
                  <datalist id="add-contractor-projects">
                    {filteredProjects.map((project) => (
                      <option key={project.id} value={project.name} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Projekt *">
                  <Select
                    value={projectId ?? ""}
                    onChange={(event) => {
                      setProjectId(event.target.value || null);
                      const project = clientProjects.find((entry) => entry.id === event.target.value);
                      if (project) {
                        setProjectQuery(project.name);
                      }
                    }}
                  >
                    <option value="">— wybierz projekt (A–Z) —</option>
                    {clientProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            ) : null}

            {selectedClient && clientProjects.length === 1 ? (
              <p className="text-xs text-muted">
                Projekt: <span className="font-medium text-foreground">{clientProjects[0].name}</span>
              </p>
            ) : null}

            {selectedClient && clientProjects.length === 0 ? (
              <p className="text-sm text-amber-200">Ten klient nie ma jeszcze projektów.</p>
            ) : null}

            {selectedClient && selectedProject ? (
              <p className="text-xs text-muted">
                Wybrano:{" "}
                <span className="font-medium text-foreground">{formatPartyName(selectedClient)}</span>
                {" · "}
                <span className="font-medium text-foreground">{selectedProject.name}</span>
              </p>
            ) : null}
          </div>

          <TradeFormFields
            form={form}
            onChange={setForm}
            categories={categories}
            companyPool={companyPool}
          />

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
            Anuluj
          </Button>
          <Button type="button" disabled={saving} onClick={() => void handleSave()}>
            <HardHat className="mr-1.5 h-4 w-4" />
            {saving ? "Zapisywanie…" : "Dodaj wykonawcę"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
