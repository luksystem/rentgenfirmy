"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DomainTile } from "@/components/raport-firmy/domain-tile";
import { HomeQuickStatus } from "@/components/home/home-quick-status";
import { ClickableProjectCard } from "@/components/project-edit-provider";
import { useRaportFirmyData } from "@/hooks/use-raport-firmy-data";
import { projectMetrics } from "@/lib/domain";
import { buildProjectsPageUrl } from "@/lib/projects-page-url";
import { MetricCard } from "@/components/metric-card";
import { useAppStore } from "@/store/app-store";

export function ManagerHomeView() {
  const router = useRouter();
  const projects = useAppStore((state) => state.projects);
  const fieldOptions = useAppStore((state) => state.fieldOptions);
  const { data, isLoading, error } = useRaportFirmyData();

  const metrics = useMemo(() => projectMetrics(projects, fieldOptions), [projects, fieldOptions]);
  const criticalProjects = useMemo(
    () => projects.filter((project) => project.priority === "Krytyczny").slice(0, 5),
    [projects],
  );

  return (
    <>
      <PageHeader
        eyebrow="Centrum operacyjne"
        title="Dashboard projektów"
        description="Stan projektów i wdrożeń na dziś. Pełną tabelę z filtrami znajdziesz w Projektach."
      />

      <HomeQuickStatus />

      <section className="mt-2 grid grid-cols-3 gap-2 sm:mt-4 sm:gap-4">
        <MetricCard
          label="Aktywne"
          value={metrics.active}
          tone="green"
          size="hero"
          href={buildProjectsPageUrl({ categories: ["active"] })}
        />
        <MetricCard
          label="Oczekujące"
          value={metrics.waiting}
          tone="amber"
          size="hero"
          href={buildProjectsPageUrl({ categories: ["waiting"] })}
        />
        <MetricCard
          label="Krytyczne"
          value={metrics.critical}
          tone="red"
          size="hero"
          href={buildProjectsPageUrl({ categories: ["critical"] })}
        />
      </section>

      <section className="mt-4 grid gap-4 sm:mt-6 md:grid-cols-2">
        {isLoading ? (
          <Card className="md:col-span-2">
            <CardContent className="py-10 text-center text-sm text-muted">
              Wczytywanie raportu firmowego…
            </CardContent>
          </Card>
        ) : error || !data ? (
          <Card className="md:col-span-2">
            <CardContent className="py-10 text-center text-sm text-rose-400">
              {error ?? "Nie udało się wczytać raportu firmowego."}
            </CardContent>
          </Card>
        ) : (
          <>
            <DomainTile
              report={data.deployment}
              subtitle="Tablice kanban i kamienie milowe procesów"
              onOpen={() => router.push("/raport")}
            />
            <DomainTile
              report={data.team}
              subtitle="Zadania, plan pracy, urlopy, nadgodziny"
              onOpen={() => router.push("/raport")}
            />
          </>
        )}
      </section>

      <section className="mt-4 grid gap-4 sm:mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Co wymaga uwagi</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {criticalProjects.length ? (
              criticalProjects.map((project) => (
                <ClickableProjectCard
                  key={project.id}
                  project={project}
                  className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{project.name}</p>
                    <p className="text-sm text-muted">
                      {project.nextStepOwner} · {project.blockerReason ?? "Brak blokady"}
                    </p>
                  </div>
                  <span className="w-fit rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300">
                    Krytyczny
                  </span>
                </ClickableProjectCard>
              ))
            ) : (
              <p className="text-sm text-muted">Brak projektów krytycznych.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-3 sm:mt-6 sm:grid-cols-2">
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="font-medium text-foreground">Wszystkie projekty</p>
              <p className="text-sm text-muted">Pełna tabela z filtrami i wyszukiwaniem.</p>
            </div>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/projekty">Otwórz</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="font-medium text-foreground">Pełny raport firmowy</p>
              <p className="text-sm text-muted">Zespół, sprzedaż, serwis, cele, wdrożenia.</p>
            </div>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/raport">Otwórz</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
