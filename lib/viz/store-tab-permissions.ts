import type { StoreTab } from "@/lib/viz/store-tab-slugs";
import type { VizDashboardPermissions } from "@/lib/viz/types";

type TabPermissionRule = {
  permission: keyof VizDashboardPermissions;
  /** Gdy true — zakładka tylko dla operatorów (canManage). */
  manageOnly?: boolean;
};

export const STORE_TAB_PERMISSION_RULES: Partial<Record<StoreTab, TabPermissionRule>> = {
  Podsumowanie: { permission: "viewDashboard" },
  Serwis: { permission: "viewDashboard" },
  Przeglądy: { permission: "viewDashboard" },
  "Umowa serwisowa": { permission: "viewContract" },
  Kontakty: { permission: "configure" },
  Zmienne: { permission: "configure" },
  Wykresy: { permission: "viewDashboard" },
  Alarmy: { permission: "viewAlarms" },
  Energia: { permission: "viewEnergy" },
  "Potencjał rozbudowy": { permission: "configure", manageOnly: true },
  "Historia sterowania": { permission: "controlSetpoint" },
};

export function filterStoreTabsForPermissions(
  tabs: readonly StoreTab[],
  permissions: VizDashboardPermissions | null | undefined,
  canManage = true,
): StoreTab[] {
  return tabs.filter((tab) => {
    const rule = STORE_TAB_PERMISSION_RULES[tab];
    if (!rule) {
      return true;
    }
    if (rule.manageOnly && !canManage) {
      return false;
    }
    if (!permissions) {
      return true;
    }
    return permissions[rule.permission] === true;
  });
}

export function isVizClientAccessRole(accessRole: string | null | undefined): boolean {
  return accessRole === "client_readonly" || accessRole === "client_admin";
}

export function shouldShowOperatorPanels(input: {
  accessRole?: string | null;
  canManage?: boolean;
  permissions?: VizDashboardPermissions | null;
}): boolean {
  if (input.canManage) {
    return true;
  }
  if (input.permissions?.configure || input.permissions?.controlSetpoint) {
    return true;
  }
  return !isVizClientAccessRole(input.accessRole);
}
