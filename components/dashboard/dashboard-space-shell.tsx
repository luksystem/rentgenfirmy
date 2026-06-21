"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DASHBOARD_SPACE_DESCRIPTIONS,
  DASHBOARD_SPACE_LABELS,
  type DashboardSpaceKind,
} from "@/lib/dashboard/types";

export function DashboardSpaceShell({
  kind,
  title,
  description,
  backHref = "/przestrzenie",
  backLabel = "Wszystkie przestrzenie",
  action,
  children,
}: {
  kind: DashboardSpaceKind;
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <PageHeader
        eyebrow={DASHBOARD_SPACE_LABELS[kind]}
        title={title ?? DASHBOARD_SPACE_LABELS[kind]}
        description={description ?? DASHBOARD_SPACE_DESCRIPTIONS[kind]}
        action={
          action ?? (
            <Button variant="outline" size="sm" asChild>
              <Link href={backHref}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {backLabel}
              </Link>
            </Button>
          )
        }
      />
      {children}
    </>
  );
}

export function DashboardPlaceholderBody({
  bullets,
}: {
  bullets?: string[];
}) {
  return (
    <Card>
      <CardContent className="grid gap-3 py-6 text-sm text-muted">
        <p>Ta przestrzeń została utworzona. Moduły będą rozbudowywane etapami.</p>
        {bullets?.length ? (
          <ul className="grid gap-1.5 pl-4">
            {bullets.map((item) => (
              <li key={item} className="list-disc">
                {item}
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
