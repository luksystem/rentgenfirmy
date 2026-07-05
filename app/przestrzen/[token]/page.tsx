"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { ClientDashboardView } from "@/components/dashboard/client-dashboard-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import type { ProjectClientAgreement } from "@/lib/dashboard/agreement-types";
import type { ProjectChangeRequest } from "@/lib/dashboard/change-request-types";
import type { ProjectDashboardContent } from "@/lib/dashboard/content-types";
import type { DashboardPublicAccessInfo } from "@/lib/dashboard/types";
import type { DashboardSpace } from "@/lib/dashboard/types";
import type { ProcessTemplate, ProjectProcess } from "@/lib/process/types";
import type { Client } from "@/lib/service/types";
import type { Project } from "@/lib/types";

type PublicDashboardPayload = {
  space: DashboardSpace;
  client: Client;
  projects: Project[];
  initialProjectId: string;
  processProgress: { percent: number; completed: number; total: number } | null;
  process: ProjectProcess | null;
  template: ProcessTemplate | null;
  agreements: ProjectClientAgreement[];
  changeRequests: ProjectChangeRequest[];
  offersGrossTotal: number;
  acceptedOffersCount: number;
  specificationItems: import("@/lib/dashboard/specification-types").ProjectSpecificationItem[];
  trades: import("@/lib/dashboard/trade-types").ProjectTrade[];
  satisfaction: import("@/lib/dashboard/satisfaction-types").ProjectSatisfactionBundle | null;
  content: ProjectDashboardContent[];
  credentials: import("@/lib/dashboard/system-credentials-types").SystemCredentialMeta[];
  pendingAgreementsCount: number;
  pendingOffersCount: number;
  offers: import("@/lib/dashboard/client-offer-summary").ClientOfferSummary[];
  serviceIntakes: import("@/lib/service-intake/types").ServiceIntakeRecord[];
  kanbanPublicLinks: Record<string, string>;
  meetingNotes: import("@/lib/dashboard/meeting-note-types").ProjectMeetingNote[];
  documents: import("@/lib/documents/types").ProjectDocument[];
  features: {
    agreements: boolean;
    changeRequests: boolean;
    specification: boolean;
    trades: boolean;
    satisfaction: boolean;
    content: boolean;
    credentials: boolean;
    offers: boolean;
    meetingNotes: boolean;
    documents: boolean;
  };
  authRequired?: boolean;
  access?: DashboardPublicAccessInfo;
  context?: { clientName: string | null; spaceTitle: string };
  error?: string;
};

const DEFAULT_ACCESS: DashboardPublicAccessInfo = {
  authRequired: false,
  legacyNameRequired: false,
  usernameRequired: false,
  authorDisplayName: "Klient",
};

async function fetchPublicDashboard(token: string, projectId?: string) {
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
  const response = await fetch(`/api/przestrzen/${encodeURIComponent(token)}${query}`, {
    credentials: "include",
  });

  let payload: PublicDashboardPayload;
  try {
    payload = (await response.json()) as PublicDashboardPayload;
  } catch {
    throw new Error("Nie udało się odczytać odpowiedzi serwera.");
  }

  if (!response.ok && !payload.authRequired) {
    throw new Error(payload.error ?? "Nie udało się załadować dashboardu.");
  }

  return payload;
}

export default function PublicDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-accent/5 p-6">
          <p className="text-sm text-muted">Ładowanie dashboardu…</p>
        </div>
      }
    >
      <PublicDashboardPageContent />
    </Suspense>
  );
}

function PublicDashboardPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = String(params.token ?? "");
  const activeKanbanToken = searchParams.get("kanban");
  const projectIdFromUrl = searchParams.get("projectId");
  const [space, setSpace] = useState<DashboardSpace | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [process, setProcess] = useState<ProjectProcess | null>(null);
  const [template, setTemplate] = useState<ProcessTemplate | null>(null);
  const [processProgress, setProcessProgress] = useState<
    PublicDashboardPayload["processProgress"] | undefined
  >(undefined);
  const [agreements, setAgreements] = useState<ProjectClientAgreement[]>([]);
  const [changeRequests, setChangeRequests] = useState<ProjectChangeRequest[]>([]);
  const [offersGrossTotal, setOffersGrossTotal] = useState(0);
  const [acceptedOffersCount, setAcceptedOffersCount] = useState(0);
  const [specificationItems, setSpecificationItems] = useState<
    PublicDashboardPayload["specificationItems"]
  >([]);
  const [trades, setTrades] = useState<PublicDashboardPayload["trades"]>([]);
  const [satisfaction, setSatisfaction] = useState<PublicDashboardPayload["satisfaction"]>(null);
  const [content, setContent] = useState<ProjectDashboardContent[]>([]);
  const [credentials, setCredentials] = useState<
    import("@/lib/dashboard/system-credentials-types").SystemCredentialMeta[]
  >([]);
  const [kanbanPublicLinks, setKanbanPublicLinks] = useState<Record<string, string>>({});
  const [offers, setOffers] = useState<PublicDashboardPayload["offers"]>([]);
  const [serviceIntakes, setServiceIntakes] = useState<PublicDashboardPayload["serviceIntakes"]>([]);
  const [meetingNotes, setMeetingNotes] = useState<PublicDashboardPayload["meetingNotes"]>([]);
  const [documents, setDocuments] = useState<PublicDashboardPayload["documents"]>([]);
  const [pendingOffersCount, setPendingOffersCount] = useState(0);
  const [features, setFeatures] = useState({
    agreements: false,
    changeRequests: false,
    specification: false,
    trades: false,
    satisfaction: false,
    content: false,
    credentials: false,
    offers: false,
    meetingNotes: false,
    documents: false,
  });
  const [access, setAccess] = useState<DashboardPublicAccessInfo>(DEFAULT_ACCESS);
  const [contextTitle, setContextTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [switchingProject, setSwitchingProject] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const applyPayload = useCallback((payload: PublicDashboardPayload) => {
    if (payload.authRequired) {
      if (payload.access) setAccess(payload.access);
      if (payload.context?.clientName) setContextTitle(payload.context.clientName);
      setAuthenticated(false);
      return;
    }

    setSpace(payload.space);
    setClient(payload.client);
    setProjects(payload.projects);
    setProcess(payload.process);
    setTemplate(payload.template);
    setProcessProgress(payload.processProgress);
    setAgreements(payload.agreements);
    setChangeRequests(payload.changeRequests ?? []);
    setOffersGrossTotal(payload.offersGrossTotal ?? 0);
    setAcceptedOffersCount(payload.acceptedOffersCount ?? 0);
    setSpecificationItems(payload.specificationItems);
    setTrades(payload.trades);
    setSatisfaction(payload.satisfaction);
    setContent(payload.content);
    setCredentials(payload.credentials ?? []);
    setKanbanPublicLinks(payload.kanbanPublicLinks ?? {});
    setOffers(payload.offers ?? []);
    setServiceIntakes(payload.serviceIntakes ?? []);
    setMeetingNotes(payload.meetingNotes ?? []);
    setDocuments(payload.documents ?? []);
    setPendingOffersCount(payload.pendingOffersCount ?? 0);
    setFeatures(payload.features);
    setSelectedProjectId(payload.initialProjectId);
    setAuthenticated(true);
  }, []);

  const refresh = useCallback(async () => {
    const payload = await fetchPublicDashboard(
      token,
      selectedProjectId || projectIdFromUrl || undefined,
    );
    applyPayload(payload);
  }, [applyPayload, projectIdFromUrl, selectedProjectId, token]);

  const handleKanbanTokenChange = useCallback(
    (kanbanToken: string | null) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      if (kanbanToken) {
        nextParams.set("kanban", kanbanToken);
      } else {
        nextParams.delete("kanban");
      }
      if (selectedProjectId) {
        nextParams.set("projectId", selectedProjectId);
      }
      const query = nextParams.toString();
      router.push(query ? `/przestrzen/${token}?${query}` : `/przestrzen/${token}`, {
        scroll: false,
      });
    },
    [router, searchParams, selectedProjectId, token],
  );

  useEffect(() => {
    if (!token || token === "undefined") {
      setError("Nieprawidłowy link do dashboardu.");
      setLoading(false);
      return;
    }

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        applyPayload(
          await fetchPublicDashboard(token, projectIdFromUrl ?? undefined),
        );
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Błąd ładowania dashboardu.");
      } finally {
        setLoading(false);
      }
    })();
  }, [applyPayload, projectIdFromUrl, token]);

  const handleProjectChange = useCallback(
    (projectId: string) => {
      if (projectId === selectedProjectId) {
        return;
      }

      void (async () => {
        setSwitchingProject(true);
        setError(null);
        try {
          applyPayload(await fetchPublicDashboard(token, projectId));
          const nextParams = new URLSearchParams(searchParams.toString());
          nextParams.set("projectId", projectId);
          nextParams.delete("kanban");
          const query = nextParams.toString();
          router.replace(query ? `/przestrzen/${token}?${query}` : `/przestrzen/${token}`, {
            scroll: false,
          });
        } catch (loadError) {
          setError(loadError instanceof Error ? loadError.message : "Błąd ładowania projektu.");
        } finally {
          setSwitchingProject(false);
        }
      })();
    },
    [applyPayload, router, searchParams, selectedProjectId, token],
  );

  async function handleLogin() {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const response = await fetch(`/api/przestrzen/${encodeURIComponent(token)}/auth`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: loginPassword,
          username: access.usernameRequired ? loginUsername : undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Nie udało się zalogować.");
      }

      setLoginPassword("");
      await refresh();
    } catch (loginFailure) {
      setLoginError(loginFailure instanceof Error ? loginFailure.message : "Błąd logowania.");
    } finally {
      setIsLoggingIn(false);
    }
  }

  const handleAgreementsUpdated = useCallback((updated: ProjectClientAgreement[]) => {
    setAgreements(updated);
  }, []);

  const handleProjectPatch = useCallback((projectId: string, patch: Partial<Project>) => {
    setProjects((current) =>
      current.map((entry) => (entry.id === projectId ? { ...entry, ...patch } : entry)),
    );
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-accent/5 p-6">
        <p className="text-sm text-muted">Ładowanie dashboardu…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-lg">
          <Card>
            <CardContent className="py-8 text-sm text-rose-200">{error}</CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!authenticated && access.authRequired) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-background via-background to-accent/5 px-4 py-6 sm:px-6">
        <div className="mx-auto grid w-full max-w-md flex-1 content-center gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Dashboard klienta
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-foreground">
              {contextTitle ?? "Wspólna przestrzeń projektu"}
            </h1>
          </div>

          <div className="rounded-2xl border border-border/70 bg-surface-elevated/80 p-5 shadow-soft">
            <div className="flex items-start gap-3">
              <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <div>
                <p className="text-sm font-medium text-foreground">Chroniony dashboard</p>
                <p className="mt-1 text-sm text-muted">
                  Podaj dane dostępu przekazane przez zespół projektowy.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {access.usernameRequired ? (
                <Field label="Login">
                  <Input
                    value={loginUsername}
                    placeholder="Login od instalatora"
                    autoComplete="username"
                    onChange={(event) => setLoginUsername(event.target.value)}
                  />
                </Field>
              ) : null}
              <Field label="Hasło dostępu">
                <Input
                  type="password"
                  value={loginPassword}
                  placeholder="Hasło do dashboardu"
                  autoComplete="current-password"
                  onChange={(event) => setLoginPassword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void handleLogin();
                    }
                  }}
                />
              </Field>
              <Button
                type="button"
                className="w-full"
                disabled={
                  isLoggingIn ||
                  !loginPassword.trim() ||
                  (access.usernameRequired && !loginUsername.trim())
                }
                onClick={() => void handleLogin()}
              >
                {isLoggingIn ? "Logowanie…" : "Wejdź do dashboardu"}
              </Button>
              {loginError ? <p className="text-sm text-rose-400">{loginError}</p> : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Card>
          <CardContent className="py-8 text-sm text-rose-200">
            Nie udało się załadować dashboardu klienta.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/5">
      <div className="mx-auto max-w-7xl px-4 py-4 pb-28 sm:px-6 sm:py-6">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Dashboard klienta
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">{client.fullName}</h1>
          <p className="mt-1 text-sm text-muted">Wspólna przestrzeń projektu — widok dla klienta.</p>
        </div>

        {switchingProject ? (
          <p className="mb-4 text-sm text-muted">Ładowanie danych projektu…</p>
        ) : null}

        <ClientDashboardView
          client={client}
          projects={projects}
          selectedProjectId={selectedProjectId}
          onProjectChange={handleProjectChange}
          clientSpace={space}
          process={process}
          template={template}
          processProgress={processProgress}
          seedAgreements={features.agreements ? agreements : undefined}
          seedChangeRequests={features.changeRequests ? changeRequests : undefined}
          seedOffersGrossTotal={offersGrossTotal}
          seedAcceptedOffersCount={acceptedOffersCount}
          seedOffers={features.offers ? offers : undefined}
          seedServiceIntakes={features.offers ? serviceIntakes : undefined}
          pendingOffersCount={pendingOffersCount}
          seedSpecificationItems={features.specification ? specificationItems : undefined}
          seedTrades={features.trades ? trades : undefined}
          seedMeetingNotes={features.meetingNotes ? meetingNotes : undefined}
          seedDocuments={features.documents ? documents : undefined}
          seedSatisfaction={features.satisfaction ? (satisfaction ?? undefined) : undefined}
          seedContent={features.content ? content : undefined}
          seedCredentials={features.credentials ? credentials : undefined}
          seedKanbanPublicLinks={kanbanPublicLinks}
          showPublicLink={false}
          readOnly
          enableContent={features.content}
          clientAuthorName={client.fullName}
          enableAgreements={features.agreements}
          enableChangeRequests={features.changeRequests}
          enableOffers={features.offers}
          enableSpecification={features.specification}
          enableTrades={features.trades}
          enableMeetingNotes={features.meetingNotes}
          enableDocuments={features.documents}
          enableSatisfaction={features.satisfaction}
          enableCredentials={features.credentials}
          onProjectPatch={handleProjectPatch}
          onAgreementsUpdated={handleAgreementsUpdated}
          activeKanbanToken={activeKanbanToken}
          onKanbanTokenChange={handleKanbanTokenChange}
          publicDashboardToken={token}
        />
      </div>
    </div>
  );
}
