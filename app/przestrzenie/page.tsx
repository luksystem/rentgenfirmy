"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  Briefcase,
  Building2,
  HardHat,
  LayoutDashboard,
  UserCircle,
  Users,
  Wrench,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DASHBOARD_SPACE_DESCRIPTIONS,
  DASHBOARD_SPACE_LABELS,
  getInternalDashboardHref,
  GLOBAL_DASHBOARD_KINDS,
} from "@/lib/dashboard/types";
import { formatPartyName } from "@/lib/party/display-name";
import {
  ensureEmployeeDashboardSpace,
  ensureGlobalDashboardSpaces,
} from "@/lib/supabase/dashboard-repository";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { useDashboardStore } from "@/store/dashboard-store";

const globalIcons = {
  owner: Building2,
  manager: Briefcase,
  office: LayoutDashboard,
  installer: HardHat,
} as const;

export default function DashboardHubPage() {
  const projects = useAppStore((state) => state.projects);
  const clients = useAppStore((state) => state.clients);
  const profile = useAuthStore((state) => state.profile);
  const displayName = useAuthStore((state) => state.displayName);
  const spaces = useDashboardStore((state) => state.spaces);
  const isLoading = useDashboardStore((state) => state.isLoading);
  const hydrated = useDashboardStore((state) => state.hydrated);
  const hydrate = useDashboardStore((state) => state.hydrate);

  useEffect(() => {
    void (async () => {
      try {
        await ensureGlobalDashboardSpaces();
        if (profile?.id) {
          await ensureEmployeeDashboardSpace({
            profileId: profile.id,
            displayName: displayName || profile.email || "Pracownik",
          });
        }
        await hydrate({ force: false });
      } catch {
        // Hub działa też na samej liście z cache — ensure jest best-effort.
      }
    })();
  }, [displayName, hydrate, profile?.email, profile?.id]);

  const projectsWithClient = projects.filter((project) => project.clientId);

  return (
    <>
      <PageHeader
        eyebrow="Dashboardy"
        title="Przestrzenie"
        description="Dashboardy organizacji, zespołu i klientów. Każda przestrzeń może mieć publiczny link — podobnie jak tablica Kanban."
      />

      {isLoading && !hydrated ? (
        <p className="text-sm text-muted">Przygotowywanie przestrzeni…</p>
      ) : null}

      <section className="mb-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {GLOBAL_DASHBOARD_KINDS.map((kind) => {
          const Icon = globalIcons[kind];
          return (
            <Link key={kind} href={getInternalDashboardHref(kind)}>
              <Card className="h-full transition hover:border-accent/40 hover:bg-surface-muted/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-start justify-between gap-3 text-base">
                    <span>{DASHBOARD_SPACE_LABELS[kind]}</span>
                    <Icon className="h-4 w-4 shrink-0 text-accent" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted">
                  {DASHBOARD_SPACE_DESCRIPTIONS[kind]}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      {profile ? (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Moja przestrzeń
          </h2>
          <Link href={getInternalDashboardHref("employee", { profileId: profile.id })}>
            <Card className="transition hover:border-accent/40 hover:bg-surface-muted/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-start justify-between gap-3 text-base">
                  <span>{DASHBOARD_SPACE_LABELS.employee}</span>
                  <UserCircle className="h-4 w-4 shrink-0 text-accent" />
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted">
                {DASHBOARD_SPACE_DESCRIPTIONS.employee}
              </CardContent>
            </Card>
          </Link>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Przestrzenie projektów
        </h2>

        {projectsWithClient.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted">
              Brak projektów z przypisanym klientem. Utwórz projekt i przypisz klienta, aby
              wygenerować dashboardy.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {projectsWithClient.map((project) => {
              const client = clients.find((entry) => entry.id === project.clientId);
              const clientSpace = spaces.find(
                (space) => space.projectId === project.id && space.kind === "client",
              );
              const teamSpace = spaces.find(
                (space) => space.projectId === project.id && space.kind === "team",
              );

              return (
                <Card key={project.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{project.name}</CardTitle>
                    <p className="text-sm text-muted">
                      {client ? formatPartyName(client) : "Klient"} · {project.type} · {project.stage}
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {client ? (
                      <Link
                        href={getInternalDashboardHref("client", { clientId: client.id })}
                        className="inline-flex items-center gap-2 rounded-xl border border-border/70 px-3 py-2 text-sm transition hover:border-accent/40 hover:bg-surface-muted/20"
                      >
                        <Users className="h-4 w-4 text-accent" />
                        Dashboard klienta
                      </Link>
                    ) : null}
                    <Link
                      href={getInternalDashboardHref("team", { projectId: project.id })}
                      className="inline-flex items-center gap-2 rounded-xl border border-border/70 px-3 py-2 text-sm transition hover:border-accent/40 hover:bg-surface-muted/20"
                    >
                      <Wrench className="h-4 w-4 text-accent" />
                      Dashboard zespołu
                    </Link>
                    {clientSpace?.publicEnabled ? (
                      <span className="self-center text-xs text-muted">Link klienta aktywny</span>
                    ) : null}
                    {teamSpace ? null : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
