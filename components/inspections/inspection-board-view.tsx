"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarClock, HelpCircle } from "lucide-react";
import { InspectionKanban } from "@/components/inspections/inspection-kanban";
import { InspectionPlanWizard } from "@/components/inspections/inspection-plan-wizard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Client } from "@/lib/service/types";
import { useAppStore } from "@/store/app-store";

export function InspectionBoardView() {
  const clients = useAppStore((state) => state.clients);
  const projects = useAppStore((state) => state.projects);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [planClient, setPlanClient] = useState<Client | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const sortedClients = useMemo(
    () => [...clients].sort((left, right) => left.fullName.localeCompare(right.fullName, "pl")),
    [clients],
  );

  function startPlanning(client: Client) {
    setPickerOpen(false);
    setPlanClient(client);
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => setPickerOpen(true)}>
            <CalendarClock className="mr-2 h-4 w-4" />
            Zaplanuj przeglądy
          </Button>
          <Button type="button" variant="outline" onClick={() => setHelpOpen(true)}>
            <HelpCircle className="mr-2 h-4 w-4" />
            Jak to działa?
          </Button>
        </div>
        <Button variant="secondary" asChild>
          <Link href="/przeglady/ustawienia">Ustawienia systemów i protokołów</Link>
        </Button>
      </div>

      <InspectionKanban />

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Wybierz klienta</DialogTitle>
            <DialogDescription>
              Dla wybranej firmy utworzysz harmonogram cyklicznych przeglądów (SSP, CCTV itd.).
            </DialogDescription>
          </DialogHeader>
          {sortedClients.length === 0 ? (
            <div className="grid gap-3 text-sm text-muted">
              <p>Brak klientów w bazie.</p>
              <Button variant="secondary" asChild>
                <Link href="/klienci">Dodaj klienta</Link>
              </Button>
            </div>
          ) : (
            <ul className="grid max-h-72 gap-1 overflow-y-auto">
              {sortedClients.map((client) => (
                <li key={client.id}>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-border/70 px-3 py-2.5 text-left text-sm transition hover:border-accent/40 hover:bg-surface-muted/40"
                    onClick={() => startPlanning(client)}
                  >
                    <span className="font-medium text-foreground">{client.fullName || "—"}</span>
                    {client.location ? (
                      <span className="mt-0.5 block text-xs text-muted">{client.location}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Planowanie przeglądów — krok po kroku</DialogTitle>
          </DialogHeader>
          <ol className="grid list-decimal gap-3 pl-5 text-sm text-muted">
            <li>
              W <Link href="/przeglady/ustawienia" className="text-accent hover:underline">ustawieniach</Link>{" "}
              zdefiniuj systemy (SSP, SSWiN…) i opcjonalnie wgraj wzory protokołów.
            </li>
            <li>
              Kliknij <strong className="text-foreground">Zaplanuj przeglądy</strong> (tutaj lub przy kliencie na
              liście <Link href="/klienci" className="text-accent hover:underline">Klienci</Link> — ikona
              kalendarza).
            </li>
            <li>
              Wybierz systemy, częstotliwość, miesiące, zakres prac i osobę odpowiedzialną. Utworzone wpisy trafią do
              kolumny <strong className="text-foreground">Wstępnie zaplanowane</strong>.
            </li>
            <li>
              Około 2 tygodnie przed terminem wstępnym pojawi się powiadomienie — otwórz przegląd, ustaw konkretną
              datę wizyty i przenieś do <strong className="text-foreground">Zaplanowane</strong>.
            </li>
            <li>
              Po wizycie uzupełnij protokół i kliknij <strong className="text-foreground">Podpisz i wyślij do rozliczenia</strong> — trafi do kolumny <strong className="text-foreground">Do rozliczenia</strong> i powiadomienie dostanie osoba odpowiedzialna (ustawienia).
            </li>
            <li>
              Po wystawieniu faktury przenieś do <strong className="text-foreground">Rozliczone</strong>.
            </li>
          </ol>
        </DialogContent>
      </Dialog>

      <InspectionPlanWizard
        open={Boolean(planClient)}
        client={planClient}
        projects={projects}
        onClose={() => setPlanClient(null)}
        onSuccess={() => {
          setPlanClient(null);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("inspections-count-changed"));
            window.dispatchEvent(new CustomEvent("inspections-reload"));
          }
        }}
      />
    </>
  );
}
