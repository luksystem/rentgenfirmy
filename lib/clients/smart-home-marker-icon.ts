import L from "leaflet";

function markerHtml(active: boolean) {
  const scale = active ? "1.08" : "1";
  const glow = active ? "0 0 0 6px rgba(59,130,246,0.35)" : "0 4px 14px rgba(15,23,42,0.35)";

  return `
    <div class="smart-home-marker" style="transform:scale(${scale});filter:drop-shadow(${glow})">
      <svg width="40" height="48" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M20 1C10.6 1 3 8.6 3 18c0 11.2 17 28.5 17 28.5S37 29.2 37 18C37 8.6 29.4 1 20 1Z" fill="url(#smart-pin-gradient)" stroke="rgba(255,255,255,0.9)" stroke-width="1.5"/>
        <path d="M20 10L11 18h3v11h12V18h3L20 10Z" fill="rgba(255,255,255,0.96)"/>
        <rect x="15" y="21" width="10" height="8" rx="1.5" fill="#eef2ff"/>
        <circle cx="20" cy="24.5" r="1.6" fill="#4f46e5"/>
        <path d="M20 22.9v-1.1M20 26.1v1.1M18.4 24.5h-1.1M21.6 24.5h1.1" stroke="#6366f1" stroke-width="1.1" stroke-linecap="round"/>
        <circle cx="14.5" cy="14.5" r="1.3" fill="#22d3ee"/>
        <circle cx="25.5" cy="14.5" r="1.3" fill="#22d3ee"/>
        <path d="M14.5 15.8v2.2M25.5 15.8v2.2" stroke="#22d3ee" stroke-width="0.9" stroke-linecap="round"/>
        <defs>
          <linearGradient id="smart-pin-gradient" x1="8" y1="4" x2="32" y2="42" gradientUnits="userSpaceOnUse">
            <stop stop-color="#3b82f6"/>
            <stop offset="1" stop-color="#4338ca"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  `;
}

let defaultIcon: L.DivIcon | null = null;
let activeIcon: L.DivIcon | null = null;

export function getSmartHomeMarkerIcon(active = false) {
  if (active) {
    if (!activeIcon) {
      activeIcon = new L.DivIcon({
        className: "smart-home-marker-wrap",
        iconSize: [40, 48],
        iconAnchor: [20, 46],
        popupAnchor: [0, -42],
        html: markerHtml(true),
      });
    }
    return activeIcon;
  }

  if (!defaultIcon) {
    defaultIcon = new L.DivIcon({
      className: "smart-home-marker-wrap",
      iconSize: [40, 48],
      iconAnchor: [20, 46],
      popupAnchor: [0, -42],
      html: markerHtml(false),
    });
  }

  return defaultIcon;
}
