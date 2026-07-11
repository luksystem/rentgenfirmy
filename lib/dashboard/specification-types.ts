export type SpecificationCatalogItem = {
  id: string;
  name: string;
  category: string;
  description: string;
  position: number;
  isActive: boolean;
  internalAcceptanceItems: import("@/lib/internal-acceptance/template-config").InternalAcceptanceTemplateStaticItem[];
  clientFunctionalityItems: import("@/lib/client-functionality/types").ClientFunctionalityTemplateItem[];
  createdAt: string;
};

export type ProjectSpecificationItem = {
  id: string;
  projectId: string;
  catalogItemId: string | null;
  title: string;
  category: string;
  description: string;
  notes: string;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type ProjectSpecificationInput = {
  catalogItemId?: string | null;
  title: string;
  category: string;
  description: string;
  notes?: string;
};

export type SpecificationCatalogInput = {
  name: string;
  category: string;
  description: string;
  position?: number;
};
