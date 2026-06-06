"use client";

import { useEffect } from "react";

export function useUnsavedChangesGuard(
  isDirty: boolean,
  onAttemptLeave: (href: string) => void,
) {
  useEffect(() => {
    if (!isDirty) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    function handleClick(event: MouseEvent) {
      const anchor = (event.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.dataset.skipUnsavedGuard === "true") {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      if (anchor.target === "_blank") {
        return;
      }

      const url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin) {
        return;
      }

      const nextPath = `${url.pathname}${url.search}${url.hash}`;
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (nextPath === currentPath) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      onAttemptLeave(nextPath);
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [isDirty, onAttemptLeave]);
}
