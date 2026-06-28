import { INTERNAL_ACCEPTANCE_RULE_LIBRARY } from "@/lib/internal-acceptance/rule-library";
import type { InternalAcceptanceSourceType } from "@/lib/internal-acceptance/types";

const RULE_PACK_LABELS: Record<string, string> = {
  "company-documentation": "Dokumentacja i backup",
  "company-network": "Sieć",
  "company-panel": "Rozdzielnia",
  "company-app": "Aplikacja i test użytkownika",
  "spec-lighting": "Oświetlenie (specyfikacja)",
  "spec-blinds": "Rolety (specyfikacja)",
  "spec-hvac": "HVAC (specyfikacja)",
  "spec-alarm": "Alarm (specyfikacja)",
  "spec-monitoring": "Monitoring (specyfikacja)",
  "spec-audio": "Audio / multiroom (specyfikacja)",
  "spec-integration-deye": "Integracja Deye / PV",
  "spec-integration-knx": "Integracja KNX",
  "spec-integration-modbus": "Integracja Modbus",
  "spec-integration-bacnet": "Integracja BACnet",
  "agreement-tablet": "Tablet / panel (ustalenie)",
  "agreement-vpn": "VPN (ustalenie)",
  "agreement-scenes": "Sceny i automatyzacje (ustalenie)",
};

export type InternalAcceptanceRulePackMeta = {
  id: string;
  label: string;
  sourceType: InternalAcceptanceSourceType;
  itemCount: number;
};

export function getInternalAcceptanceRulePackMeta(): InternalAcceptanceRulePackMeta[] {
  return INTERNAL_ACCEPTANCE_RULE_LIBRARY.map((entry) => ({
    id: entry.id,
    label: RULE_PACK_LABELS[entry.id] ?? entry.id,
    sourceType: entry.sourceType,
    itemCount: entry.items.length,
  }));
}

export function getRulePacksBySourceType(sourceType: InternalAcceptanceSourceType) {
  return getInternalAcceptanceRulePackMeta().filter((entry) => entry.sourceType === sourceType);
}
