import L from "leaflet";

const STATUS_COLORS: Record<string, string> = {
  ok: "#10b981",
  warning: "#f59e0b",
  alarm: "#ef4444",
  no_communication: "#71717a",
  unconfigured: "#a1a1aa",
  work_in_progress: "#3b82f6",
};

const iconCache = new Map<string, L.DivIcon>();

function markerHtml(color: string) {
  return `
    <div style="transform:translate(-50%,-100%)">
      <svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 1C7.4 1 2 6.4 2 13c0 8.4 12 21.5 12 21.5S26 21.4 26 13C26 6.4 20.6 1 14 1Z" fill="${color}" stroke="rgba(255,255,255,0.95)" stroke-width="1.5"/>
        <circle cx="14" cy="13" r="4" fill="rgba(255,255,255,0.95)"/>
      </svg>
    </div>
  `;
}

export function getVizStoreMarkerIcon(statusCode: string) {
  const color = STATUS_COLORS[statusCode] ?? STATUS_COLORS.unconfigured;
  if (!iconCache.has(color)) {
    iconCache.set(
      color,
      new L.DivIcon({
        className: "viz-store-marker-wrap",
        iconSize: [28, 36],
        iconAnchor: [14, 34],
        popupAnchor: [0, -30],
        html: markerHtml(color),
      }),
    );
  }
  return iconCache.get(color)!;
}
