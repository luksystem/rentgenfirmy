export type SpecificationCatalogItem = {
  id: string;
  name: string;
  category: string;
  description: string;
  position: number;
  isActive: boolean;
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
