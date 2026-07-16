export function isIosDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) {
    return true;
  }

  // iPadOS raportuje się jako Macintosh z touch
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

export function isStandaloneDisplay() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}
