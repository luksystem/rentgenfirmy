"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Field, Input } from "@/components/ui/input";
import { formatPartyName } from "@/lib/party/display-name";
import type { Project } from "@/lib/types";
import type { Client } from "@/lib/service/types";
import { cn } from "@/lib/utils";

function projectSearchText(project: Project, clientsById: Map<string, Client>) {
  const client = project.clientId ? clientsById.get(project.clientId) : null;
  return [project.name, client?.lastName, client?.firstName].filter(Boolean).join(" ").toLowerCase();
}

/** Wyszukiwalny picker projektu — filtruje po nazwie projektu i nazwie klienta (nie tylko lista rozwijana). */
export function ProjectSelectSearchable({
  projects,
  clients,
  value,
  onChange,
  emptyLabel = "— brak —",
  label = "Projekt",
  disabled = false,
  className,
}: {
  projects: Project[];
  clients: Client[];
  value: string | null;
  onChange: (projectId: string | null) => void;
  emptyLabel?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const clientsById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);

  const sortedProjects = useMemo(() => [...projects].sort((a, b) => a.name.localeCompare(b.name, "pl")), [projects]);

  const selectedProject = useMemo(
    () => sortedProjects.find((project) => project.id === value) ?? null,
    [sortedProjects, value],
  );

  const filteredProjects = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return sortedProjects;
    }
    return sortedProjects.filter((project) => projectSearchText(project, clientsById).includes(needle));
  }, [query, sortedProjects, clientsById]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (selectedProject) {
      setQuery(selectedProject.name);
    } else if (!open) {
      setQuery("");
    }
  }, [open, selectedProject]);

  function selectProject(projectId: string | null) {
    onChange(projectId);
    setOpen(false);
    if (!projectId) {
      setQuery("");
    }
  }

  return (
    <Field label={label} className={className}>
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            disabled={disabled}
            placeholder={emptyLabel}
            className="pr-10"
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              if (!event.target.value.trim()) {
                onChange(null);
              }
            }}
          />
          <button
            type="button"
            disabled={disabled}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted hover:bg-surface-muted"
            onClick={() => setOpen((current) => !current)}
            aria-label="Rozwiń listę projektów"
          >
            <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
          </button>
        </div>

        {open && !disabled ? (
          <div className="absolute z-40 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-surface-elevated p-1 shadow-card">
            <button
              type="button"
              className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-surface-muted"
              onClick={() => selectProject(null)}
            >
              {emptyLabel}
            </button>
            {filteredProjects.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted">
                {query.trim()
                  ? `Brak wyników dla „${query.trim()}”.`
                  : projects.length === 0
                    ? "Brak projektów do wyboru."
                    : "Brak projektów pasujących do wyszukiwania."}
              </p>
            ) : (
              filteredProjects.map((project) => {
                const client = project.clientId ? clientsById.get(project.clientId) : null;
                return (
                  <button
                    key={project.id}
                    type="button"
                    className={cn(
                      "flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-muted",
                      value === project.id && "bg-accent/10 text-foreground",
                    )}
                    onClick={() => selectProject(project.id)}
                  >
                    <span className="font-medium">{project.name}</span>
                    {client ? <span className="text-xs text-muted">{formatPartyName(client)}</span> : null}
                  </button>
                );
              })
            )}
          </div>
        ) : null}
      </div>
    </Field>
  );
}
