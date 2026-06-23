export type SystemCredentialMeta = {
  id: string;
  projectId: string;
  label: string;
  systemUrl: string | null;
  loginUsername: string | null;
  notes: string | null;
  visibleToClient: boolean;
  hasPassword: boolean;
  position: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
};

export type SystemCredentialInput = {
  label: string;
  systemUrl?: string | null;
  loginUsername?: string | null;
  password: string;
  notes?: string | null;
  visibleToClient?: boolean;
};

export type SystemCredentialUpdateInput = {
  label?: string;
  systemUrl?: string | null;
  loginUsername?: string | null;
  password?: string | null;
  notes?: string | null;
  visibleToClient?: boolean;
};
