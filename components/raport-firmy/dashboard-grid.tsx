import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DomainTile } from "@/components/raport-firmy/domain-tile";
import type { DomainReport, RaportFirmyPayload } from "@/lib/report-kpi/types";

const DOMAIN_SUBTITLES: Record<DomainReport["domain"], string> = {
  team: "Zadania · plan i przekazanie · urlopy · nadgodziny",
  growth: "Ranking XP · oceny miesięczne · cele managerów",
  sales: "Oferty · rozliczenia · zapotrzebowania",
  service: "Zgłoszenia serwisowe · przeglądy",
  budget: "Przychód, faktury, należności — widoczne tylko dla admina",
};

export function DashboardGrid({
  payload,
  isAdmin,
  onOpenDomain,
  onOpenSettings,
}: {
  payload: RaportFirmyPayload;
  isAdmin: boolean;
  onOpenDomain: (domain: DomainReport["domain"] | "projects") => void;
  onOpenSettings: () => void;
}) {
  const domains: DomainReport[] = [payload.team, payload.growth, payload.sales, payload.service];
  const attentionItems = domains
    .flatMap((domain) =>
      domain.quickWins
        .filter((win) => win.severity === "critical")
        .map((win) => ({ domain: domain.label, win })),
    )
    .slice(0, 4);

  return (
    <div className="grid gap-4">
      {isAdmin ? (
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={onOpenSettings}>
            <Settings className="h-4 w-4" />
            Konfiguruj KPI
          </Button>
        </div>
      ) : null}

      {attentionItems.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="text-sm font-semibold text-muted">Wymaga uwagi dziś</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {attentionItems.map(({ domain, win }) => (
              <Card key={win.id} className="border-l-4 border-l-rose-500">
                <CardContent className="py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">{domain}</p>
                  <p className="mt-1 text-sm">{win.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-3">
        <h2 className="text-sm font-semibold text-muted">Obszary firmy</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <DomainTile
            report={payload.team}
            subtitle={DOMAIN_SUBTITLES.team}
            onOpen={() => onOpenDomain("team")}
          />
          <DomainTile
            report={payload.growth}
            subtitle={DOMAIN_SUBTITLES.growth}
            onOpen={() => onOpenDomain("growth")}
          />
          <DomainTile
            report={payload.sales}
            subtitle={DOMAIN_SUBTITLES.sales}
            onOpen={() => onOpenDomain("sales")}
          />
          <DomainTile
            report={payload.service}
            subtitle={DOMAIN_SUBTITLES.service}
            onOpen={() => onOpenDomain("service")}
          />
          <button type="button" onClick={() => onOpenDomain("projects")} className="text-left">
            <Card className="cursor-pointer transition hover:border-accent/40 hover:shadow-md">
              <CardContent className="grid gap-2 py-4">
                <p className="font-semibold text-foreground">Projekty</p>
                <p className="text-xs text-muted">Stan wdrożeń — szczegółowy raport operacyjny</p>
                <div className="border-t border-border pt-2 text-xs font-semibold text-accent">
                  Zobacz szczegóły →
                </div>
              </CardContent>
            </Card>
          </button>
          {payload.budget ? (
            <DomainTile
              report={payload.budget}
              subtitle={DOMAIN_SUBTITLES.budget}
              onOpen={() => onOpenDomain("budget")}
              locked
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}
