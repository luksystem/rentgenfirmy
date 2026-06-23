"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { parseProjectsPageSearchParams } from "@/lib/projects-page-url";
import { useAppStore } from "@/store/app-store";

export function ProjectsViewFiltersFromUrl() {
  const searchParams = useSearchParams();
  const updateProjectsViewFilters = useAppStore((state) => state.updateProjectsViewFilters);
  const appliedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const key = searchParams.toString();
    if (!key || appliedKeyRef.current === key) {
      return;
    }

    const parsed = parseProjectsPageSearchParams(searchParams);
    if (!parsed) {
      return;
    }

    appliedKeyRef.current = key;
    updateProjectsViewFilters(parsed);
  }, [searchParams, updateProjectsViewFilters]);

  return null;
}
