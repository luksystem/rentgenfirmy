import { createFixedPriceRow } from "@/lib/service/fixed-price";
import { DEFAULT_CONTRACT_MODULE_SETTINGS } from "@/lib/contracts/module-settings";
import {
  emptyContractClient,
  emptyContractVatDeclaration,
  type Contract,
  type ContractContentBlock,
  type ContractOptionCategory,
  type ContractPaymentPlan,
  type ContractPaymentPlanInstallment,
  type ContractSection,
  type ContractTableSection,
  type ContractTemplate,
  type ContractTextSection,
} from "@/lib/contracts/types";

export function createContractTextSection(source?: Pick<ContractContentBlock, "id" | "title" | "content">): ContractTextSection {
  return {
    id: crypto.randomUUID(),
    type: "text",
    title: source?.title ?? "",
    content: source?.content ?? "",
    struck: false,
    blockId: source?.id ?? null,
  };
}

export function createContractTableSection(
  group: ContractTableSection["group"] = "main",
  options: { category?: ContractOptionCategory; categoryDiscountPercent?: number } = {},
): ContractTableSection {
  return {
    id: crypto.randomUUID(),
    type: "table",
    title: "",
    description: "",
    showProductDescriptions: false,
    group,
    category: group === "option" ? (options.category ?? "dodatki") : null,
    categoryDiscountPercent: options.categoryDiscountPercent ?? 0,
    selected: group === "main",
    selectedRowIds: [],
    rows: [createFixedPriceRow()],
  };
}

export function createContractPaymentPlanInstallment(): ContractPaymentPlanInstallment {
  return { id: crypto.randomUUID(), label: "", percent: 0, note: "", splitOverMonths: 1 };
}

export function createContractPaymentPlan(): ContractPaymentPlan {
  return {
    id: crypto.randomUUID(),
    label: "",
    discountPercent: 0,
    installments: [createContractPaymentPlanInstallment()],
  };
}

export function createEmptyContract(): Contract {
  return {
    id: crypto.randomUUID(),
    status: "draft",
    templateId: null,
    clientId: null,
    contactId: null,
    title: "",
    client: emptyContractClient(),
    sections: [],
    paymentPlans: [],
    selectedPaymentPlanId: null,
    vatDeclaration: emptyContractVatDeclaration(),
    inneDiscountPercent: DEFAULT_CONTRACT_MODULE_SETTINGS.inneDiscountPercent,
    publicToken: null,
    tokenExpiresAt: null,
    tokenSentAt: null,
    companySignature: null,
    clientSignature: null,
    history: [],
    signedDocumentStoragePath: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function createEmptyContractTemplate(): ContractTemplate {
  return {
    id: crypto.randomUUID(),
    name: "",
    description: "",
    isActive: true,
    sections: [],
    paymentPlans: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function cloneSectionWithNewIds(section: ContractSection): ContractSection {
  if (section.type === "table") {
    return {
      ...section,
      id: crypto.randomUUID(),
      selectedRowIds: [],
      rows: section.rows.map((row) => ({ ...row, id: crypto.randomUUID() })),
    };
  }
  return { ...section, id: crypto.randomUUID() };
}

/**
 * Kopiuje sekcje/harmonogram szablonu do nowej instancji, z nowymi UUID-ami — dalej edytowalne
 * niezależnie od szablonu (ten sam wzorzec co `template-factory.ts` dla procesów).
 */
export function buildContractFromTemplate(
  template: ContractTemplate,
  overrides: Partial<Pick<Contract, "clientId" | "contactId" | "client" | "title">> = {},
): Contract {
  const base = createEmptyContract();
  return {
    ...base,
    templateId: template.id,
    title: overrides.title?.trim() ? overrides.title : template.name,
    clientId: overrides.clientId ?? null,
    contactId: overrides.contactId ?? null,
    client: overrides.client ?? base.client,
    sections: template.sections.map(cloneSectionWithNewIds),
    paymentPlans: template.paymentPlans.map((plan) => ({
      ...plan,
      id: crypto.randomUUID(),
      installments: plan.installments.map((item) => ({ ...item, id: crypto.randomUUID() })),
    })),
  };
}
