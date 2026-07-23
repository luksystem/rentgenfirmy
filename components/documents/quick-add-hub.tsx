"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClientSelectWithCreate } from "@/components/client-select-with-create";
import { ProjectSelectSearchable } from "@/components/goals/project-select-searchable";
import { ProjectDocumentForm } from "@/components/documents/project-document-form";
import { NoteQuickCreateForm } from "@/components/documents/quick-add/note-form";
import { CredentialQuickCreateForm } from "@/components/documents/quick-add/credential-form";
import { AgreementQuickCreateForm } from "@/components/documents/quick-add/agreement-form";
import { ChangeRequestQuickCreateForm } from "@/components/documents/quick-add/change-request-form";
import { ProtocolQuickPicker } from "@/components/documents/quick-add/protocol-picker";
import { Card, CardContent } from "@/components/ui/card";
import {
  QUICK_ADD_CATEGORIES,
  QUICK_ADD_CATEGORY_META,
  type QuickAddCategory,
} from "@/lib/documents/quick-add-categories";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";

export function QuickAddHub({
  initialClientId,
  initialProjectId,
  returnTo,
}: {
  initialClientId?: string | null;
  initialProjectId?: string | null;
  returnTo?: string | null;
}) {
  const router = useRouter();
  const clients = useAppStore((state) => state.clients);
  const projects = useAppStore((state) => state.projects);
  const addClient = useAppStore((state) => state.addClient);
  const displayName = useAuthStore((state) => state.displayName);
  const authorName = displayName || "Zespół";

  const [clientId, setClientId] = useState<string | null>(initialClientId ?? null);
  const [projectId, setProjectId] = useState<string | null>(initialProjectId ?? null);
  const [category, setCategory] = useState<QuickAddCategory | null>(null);

  const filteredProjects = useMemo(() => {
    if (!clientId) {
      return projects;
    }
    return projects.filter((project) => project.clientId === clientId);
  }, [clientId, projects]);

  const selectedProject = projects.find((project) => project.id === projectId) ?? null;

  function handleCreated() {
    router.push(returnTo || "/dokumenty");
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          <ClientSelectWithCreate
            clients={clients}
            value={clientId}
            onChange={(nextClientId) => {
              setClientId(nextClientId);
              const nextProjects = nextClientId
                ? projects.filter((project) => project.clientId === nextClientId)
                : projects;
              if (projectId && !nextProjects.some((project) => project.id === projectId)) {
                setProjectId(null);
              }
            }}
            onCreateClient={addClient}
            emptyLabel="Wszyscy klienci (filtr)"
          />

          <ProjectSelectSearchable
            projects={filteredProjects}
            clients={clients}
            value={projectId}
            emptyLabel="Wybierz projekt…"
            label="Projekt (wymagany)"
            onChange={(nextProjectId) => {
              setProjectId(nextProjectId);
              const project = projects.find((entry) => entry.id === nextProjectId);
              if (project?.clientId) {
                setClientId(project.clientId);
              }
            }}
          />
        </CardContent>
      </Card>

      {!projectId ? (
        <p className="text-sm text-muted">
          Wybierz projekt, żeby zobaczyć co można podręcznie dodać.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {QUICK_ADD_CATEGORIES.map((entry) => {
              const meta = QUICK_ADD_CATEGORY_META[entry];
              const Icon = meta.icon;
              const active = category === entry;
              return (
                <button
                  key={entry}
                  type="button"
                  onClick={() => setCategory(entry)}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition",
                    active
                      ? "border-accent bg-accent/10"
                      : "border-border/80 bg-surface hover:border-accent/40",
                  )}
                >
                  <Icon className="h-5 w-5 text-accent" />
                  <span className="text-sm font-medium text-foreground">{meta.label}</span>
                  <span className="text-xs text-muted">{meta.description}</span>
                </button>
              );
            })}
          </div>

          {category ? (
            <Card key={category}>
              <CardContent className="pt-6">
                {category === "photo" || category === "file" ? (
                  <ProjectDocumentForm
                    clientId={clientId}
                    projectId={projectId}
                    initialCategory={category === "photo" ? "photo" : "scan"}
                    onCreated={handleCreated}
                  />
                ) : null}
                {category === "note" ? (
                  <NoteQuickCreateForm
                    projectId={projectId}
                    authorName={authorName}
                    onCreated={handleCreated}
                  />
                ) : null}
                {category === "credential" ? (
                  <CredentialQuickCreateForm projectId={projectId} onCreated={handleCreated} />
                ) : null}
                {category === "agreement" ? (
                  <AgreementQuickCreateForm
                    projectId={projectId}
                    authorName={authorName}
                    onCreated={handleCreated}
                  />
                ) : null}
                {category === "change_request" ? (
                  <ChangeRequestQuickCreateForm
                    projectId={projectId}
                    authorName={authorName}
                    onCreated={handleCreated}
                  />
                ) : null}
                {category === "protocol" && selectedProject ? (
                  <ProtocolQuickPicker
                    projectId={projectId}
                    projectType={selectedProject.type}
                    actorName={authorName}
                  />
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
