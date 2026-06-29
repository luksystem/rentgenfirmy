export function boardSectionDomId(prefix: string, id: string) {
  return `${prefix}-${encodeURIComponent(id)}`;
}

export function scrollToBoardSection(sectionDomId: string) {
  const target = document.getElementById(sectionDomId);
  if (!target) {
    return;
  }

  const scrollRoot = target.closest("[data-process-scroll-root]") as HTMLElement | null;
  if (scrollRoot) {
    const rootRect = scrollRoot.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    scrollRoot.scrollTo({
      top: scrollRoot.scrollTop + targetRect.top - rootRect.top - 8,
      behavior: "smooth",
    });
    return;
  }

  target.scrollIntoView({ behavior: "smooth", block: "start" });
}
