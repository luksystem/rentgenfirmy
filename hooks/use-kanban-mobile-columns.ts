"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useKanbanMobileColumns(columns: Array<{ id: string }>) {
  const columnIds = useMemo(() => columns.map((column) => column.id), [columns]);
  const [activeColumnId, setActiveColumnId] = useState(columnIds[0] ?? "");
  const [isCoarsePointer, setIsCoarsePointer] = useState(true);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const media = window.matchMedia("(pointer: coarse)");
    const update = () => setIsCoarsePointer(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (columnIds.includes(activeColumnId)) {
      return;
    }
    setActiveColumnId(columnIds[0] ?? "");
  }, [activeColumnId, columnIds]);

  const scrollToColumn = useCallback((columnId: string) => {
    setActiveColumnId(columnId);
    columnRefs.current[columnId]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !isCoarsePointer) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
        const columnId = visible?.target.getAttribute("data-column-id");
        if (columnId) {
          setActiveColumnId(columnId);
        }
      },
      { root: scroller, threshold: [0.55, 0.75] },
    );

    for (const columnId of columnIds) {
      const node = columnRefs.current[columnId];
      if (node) {
        observer.observe(node);
      }
    }

    return () => observer.disconnect();
  }, [columnIds, isCoarsePointer]);

  const setColumnRef = useCallback((columnId: string, node: HTMLDivElement | null) => {
    columnRefs.current[columnId] = node;
  }, []);

  return {
    activeColumnId,
    isCoarsePointer,
    scrollerRef,
    scrollToColumn,
    setColumnRef,
  };
}
