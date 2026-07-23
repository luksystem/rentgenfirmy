"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProcessProtocolBoard } from "@/components/process/process-protocol-board";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Select } from "@/components/ui/input";
import { resolveAnchoredProcessTemplate } from "@/lib/process/anchored-template";
import { flattenProcessItems } from "@/lib/process/types";
import { useProcessStore } from "@/store/process-store";

export function ProtocolQuickPicker({
  projectId,
  projectType,
  actorName,
}: {
  projectId: string;
  projectType: string;
  actorName: string;
}) {
  const ensureProjectProcess = useProcessStore((state) => state.ensureProjectProcess);
  const ensureProjectProcessItems = useProcessStore((state) => state.ensureProjectProcessItems);
  const process = useProcessStore((state) => state.projectProcesses[projectId]);
  const itemInstances = useProcessStore((state) => state.projectProcessItems[projectId]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [boardOpen, setBoardOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const proc = await ensureProjectProcess(projectId, projectType);
        const template = resolveAnchoredProcessTemplate(proc, null);
        if (template) {
          await ensureProjectProcessItems(projectId, template);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Nie udało się wczytać procesu projektu.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, projectType, ensureProjectProcess, ensureProjectProcessItems]);

  const options = useMemo(() => {
    if (!process) {
      return [];
    }
    const template = resolveAnchoredProcessTemplate(process, null);
    if (!template) {
      return [];
    }
    return flattenProcessItems(template)
      .filter((item) => item.kind === "protocol")
      .map((item) => {
        const instance = itemInstances?.[item.id];
        return instance ? { projectProcessItemId: instance.id, label: item.title } : null;
      })
      .filter((entry): entry is { projectProcessItemId: string; label: string } => entry !== null);
  }, [process, itemInstances]);

  if (loading) {
    return <p className="text-sm text-muted">Sprawdzanie procesu projektu…</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-400">{error}</p>;
  }

  if (options.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-surface-muted/10 p-4 text-sm text-muted">
        Ten projekt nie ma jeszcze elementu „Protokół” w swoim procesie.{" "}
        <Link href={`/projekty/${projectId}/proces`} className="text-accent hover:underline">
          Skonfiguruj to w module Proces projektu
        </Link>
        .
      </div>
    );
  }

  const selected = selectedItemId ?? options[0].projectProcessItemId;

  return (
    <div className="grid gap-3">
      <Field label="Który protokół?">
        <Select value={selected} onChange={(event) => setSelectedItemId(event.target.value)}>
          {options.map((option) => (
            <option key={option.projectProcessItemId} value={option.projectProcessItemId}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="button" onClick={() => setBoardOpen(true)}>
        Otwórz podpisywanie
      </Button>

      <Dialog open={boardOpen} onOpenChange={setBoardOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Podpisywanie protokołu</DialogTitle>
          </DialogHeader>
          <ProcessProtocolBoard
            projectProcessItemId={selected}
            projectId={projectId}
            actorName={actorName}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
