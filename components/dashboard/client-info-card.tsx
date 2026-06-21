"use client";

import Link from "next/link";
import { ExternalLink, Mail, MapPin, Phone } from "lucide-react";
import { buildClientAddressLine, getClientGoogleMapsUrl } from "@/lib/dashboard/google-maps";
import type { Client } from "@/lib/service/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ClientInfoCard({ client }: { client: Client }) {
  const addressLine = buildClientAddressLine(client);
  const mapsUrl = getClientGoogleMapsUrl(client);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Dane klienta</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <div>
          <p className="font-medium text-foreground">{client.fullName}</p>
          {client.location ? <p className="text-muted">Obiekt: {client.location}</p> : null}
        </div>

        {addressLine ? (
          <div className="flex items-start gap-2 text-muted">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>{addressLine}</span>
          </div>
        ) : null}

        {client.email ? (
          <div className="flex items-center gap-2 text-muted">
            <Mail className="h-4 w-4 shrink-0 text-accent" />
            <a href={`mailto:${client.email}`} className="hover:text-foreground">
              {client.email}
            </a>
          </div>
        ) : null}

        {client.phone ? (
          <div className="flex items-center gap-2 text-muted">
            <Phone className="h-4 w-4 shrink-0 text-accent" />
            <a href={`tel:${client.phone}`} className="hover:text-foreground">
              {client.phone}
            </a>
          </div>
        ) : null}

        {mapsUrl ? (
          <Button variant="outline" size="sm" asChild className="w-fit">
            <Link href={mapsUrl} target="_blank" rel="noopener noreferrer">
              <MapPin className="mr-2 h-4 w-4" />
              Otwórz w Google Maps
              <ExternalLink className="ml-2 h-3.5 w-3.5 opacity-60" />
            </Link>
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
