import type { ClientDashboardTab } from "@/components/dashboard/client-dashboard-view";

export const CLIENT_DASHBOARD_TABS: ClientDashboardTab[] = [
  "home",
  "project",
  "integrations",
  "overview",
  "process",
  "goals",
  "agreements",
  "changes",
  "offers",
  "settlements",
  "inspections",
  "specification",
  "functionality-survey",
  "trades",
  "satisfaction",
  "notes",
  "documentation",
  "credentials",
  "links",
  "time-tracking",
  "project-users",
];

export function isClientDashboardTab(value: string | null): value is ClientDashboardTab {
  return value !== null && (CLIENT_DASHBOARD_TABS as string[]).includes(value);
}
