"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { buildClientAddressLine } from "@/lib/dashboard/google-maps";
import { formatPartyName } from "@/lib/party/display-name";
import { useAppStore } from "@/store/app-store";

export function OpenClientPanelDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const clients = useAppStore((state) => state.clients);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);

  const filteredClients = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const list = [...clients].sort((a, b) =>
      formatPartyName(a).localeCompare(formatPartyName(b), "pl"),
    );
    if (!normalized) {
      return list.slice(0, 40);
    }
    return list
      .filter((client) => {
        const haystack = [
          formatPartyName(client),
          client.location,
          client.addressCity,
          client.addressStreet,
          client.phone,
          client.email,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalized);
      })
      .slice(0, 40);
  }, [clients, query]);

  const selectedClient = clients.find((client) => client.id === clientId) ?? null;

  function reset() {
    setQuery("");
    setClientId(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset();
    }
    onOpenChange(next);
  }

  function handleOpen() {
    if (!selectedClient) {
      return;
    }
    router.push(`/przestrzenie/klient/${selectedClient.id}?tab=process`);
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Otwórz panel klienta</DialogTitle>
          <DialogDescription>
            Wybierz klienta — otworzymy jego panel na zakładce „Proces&rdquo;.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Field label="Szukaj klienta">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Imię, nazwisko, miasto, telefon…"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter" && selectedClient) {
                  event.preventDefault();
                  handleOpen();
                }
              }}
            />
          </Field>

          <div className="max-h-64 min-h-0 overflow-y-auto rounded-xl border border-border/70">
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
                        onClick={() => setClientId(client.id)}
                        onDoubleClick={() => {
                          setClientId(client.id);
                          handleOpen();
                        }}
                      >
                        <span className="text-sm font-medium text-foreground">
                          {formatPartyName(client)}
                        </span>
                        <span className="text-xs text-muted">
                          {buildClientAddressLine(client) || "Brak adresu w bazie"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {selectedClient ? (
            <p className="flex items-start gap-2 text-xs text-muted">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
              <span>{buildClientAddressLine(selectedClient) || "Brak adresu w bazie."}</span>
            </p>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
            Anuluj
          </Button>
          <Button type="button" onClick={handleOpen} disabled={!selectedClient}>
            Otwórz panel klienta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
