import type { ClientDashboardTab } from "@/components/dashboard/client-dashboard-view";

export const CLIENT_DASHBOARD_TABS: ClientDashboardTab[] = [
  "home",
  "project",
  "integrations",
  "overview",
  "process",
  "agreements",
  "changes",
  "offers",
  "inspections",
  "specification",
  "trades",
  "satisfaction",
  "notes",
  "documentation",
  "credentials",
  "links",
];

export function isClientDashboardTab(value: string | null): value is ClientDashboardTab {
  return value !== null && (CLIENT_DASHBOARD_TABS as string[]).includes(value);
}
