"use client";

import { ExternalLink, Mail, MapPin, Phone } from "lucide-react";
import { buildClientAddressLine, getClientGoogleMapsUrl } from "@/lib/dashboard/google-maps";
import type { Client } from "@/lib/service/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ClientInfoCard({ client }: { client: Client }) {
  const addressLine = buildClientAddressLine(client);
  const mapsUrl = getClientGoogleMapsUrl(client);

  return (
    <Card className="min-w-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Dane klienta</CardTitle>
      </CardHeader>
      <CardContent className="grid min-w-0 gap-3 text-sm">
        <div className="min-w-0">
          <p className="break-words font-medium text-foreground">{client.fullName}</p>
          {client.location ? <p className="break-words text-muted">Obiekt: {client.location}</p> : null}
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
  );
}
