"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import { useProcessStore } from "@/store/process-store";

export function ProjectProcessLink({
  projectId,
  projectType,
  variant = "link",
}: {
  projectId: string;
  projectType: string;
  variant?: "link" | "button";
}) {
  const projectTypes = useAppStore((state) => state.fieldOptions.projectTypes);
  const hydrate = useProcessStore((state) => state.hydrate);
  const hydrated = useProcessStore((state) => state.hydrated);
  const getProjectProgress = useProcessStore((state) => state.getProjectProgress);

  useEffect(() => {
    if (!hydrated) {
      void hydrate(projectTypes);
    }
  }, [hydrate, hydrated, projectTypes]);

  const progress = getProjectProgress(projectId, projectType);
  const label = progress
    ? `${progress.completed}/${progress.total} (${progress.percent}%)`
    : "Otwórz proces";

  if (variant === "button") {
    return (
      <Button variant="secondary" size="sm" asChild>
        <Link href={`/projekty/${projectId}/proces`}>{label}</Link>
      </Button>
    );
  }

  return (
    <Link
      href={`/projekty/${projectId}/proces`}
      className="font-medium text-accent underline-offset-2 hover:underline"
      onClick={(event) => event.stopPropagation()}
    >
      {label}
    </Link>
  );
}
