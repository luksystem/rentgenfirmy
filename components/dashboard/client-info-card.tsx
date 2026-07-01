"use client";

import { useState } from "react";
import { ExternalLink, Mail, MapPin, Pencil, Phone } from "lucide-react";
import { ClientForm } from "@/components/client-form";
import { buildClientAddressLine, getClientGoogleMapsUrl } from "@/lib/dashboard/google-maps";
import type { Client, ClientInput } from "@/lib/service/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ClientInfoCard({
  client,
  editable = false,
  isSaving = false,
  onUpdateClient,
}: {
  client: Client;
  editable?: boolean;
  isSaving?: boolean;
  onUpdateClient?: (input: ClientInput) => Promise<void>;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const addressLine = buildClientAddressLine(client);
  const mapsUrl = getClientGoogleMapsUrl(client);

  async function handleSave(input: ClientInput) {
    if (!onUpdateClient) {
      return;
    }

    await onUpdateClient(input);
    setEditOpen(false);
  }

  return (
    <>
      <Card className="min-w-0">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <CardTitle className="text-base">Dane klienta</CardTitle>
          {editable && onUpdateClient ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-8 shrink-0 p-0"
              onClick={() => setEditOpen(true)}
              aria-label="Edytuj dane klienta"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="grid min-w-0 gap-3 text-sm">
          <div className="min-w-0">
            <p className="break-words font-medium text-foreground">{client.fullName}</p>
            {client.location ? (
              <p className="break-words text-muted">Obiekt: {client.location}</p>
            ) : null}
          </div>

          {addressLine ? (
            <div className="flex min-w-0 items-start gap-2 text-muted">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span className="min-w-0 break-words">{addressLine}</span>
            </div>
          ) : null}

          {client.email ? (
            <div className="flex min-w-0 items-center gap-2 text-muted">
              <Mail className="h-4 w-4 shrink-0 text-accent" />
              <a href={`mailto:${client.email}`} className="min-w-0 break-all hover:text-foreground">
                {client.email}
              </a>
            </div>
          ) : null}

          {client.phone ? (
            <div className="flex min-w-0 items-center gap-2 text-muted">
              <Phone className="h-4 w-4 shrink-0 text-accent" />
              <a href={`tel:${client.phone}`} className="min-w-0 break-all hover:text-foreground">
                {client.phone}
              </a>
            </div>
          ) : null}

          {mapsUrl ? (
            <Button variant="outline" size="sm" asChild className="w-fit">
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                <MapPin className="mr-2 h-4 w-4" />
                Otwórz w Google Maps
                <ExternalLink className="ml-2 h-3.5 w-3.5 opacity-60" />
              </a>
            </Button>
          ) : null}

          {client.notes ? (
            <p className="rounded-xl border border-border/60 bg-surface-muted/20 px-3 py-2 text-muted">
              {client.notes}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {editable && onUpdateClient ? (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edytuj dane klienta</DialogTitle>
              <DialogDescription>
                Zmiany są widoczne na dashboardzie klienta i w całej aplikacji.
              </DialogDescription>
            </DialogHeader>
            <ClientForm
              client={client}
              isSaving={isSaving}
              onSubmit={(input) => handleSave(input)}
              onCancel={() => setEditOpen(false)}
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
