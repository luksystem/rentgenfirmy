export type XpCategory = {
  id: string;
  key: string;
  label: string;
  color: string;
  icon: string;
  sortOrder: number;
};

export type XpCriterion = {
  id: string;
  categoryId: string;
  key: string;
  label: string;
  description: string;
  points: number;
  isActive: boolean;
};

export type XpLedgerSourceType = "criterion" | "redemption" | "adjustment";

export type XpLedgerEntry = {
  id: string;
  employeeId: string;
  criterionId: string | null;
  categoryId: string | null;
  points: number;
  reason: string;
  sourceType: XpLedgerSourceType;
  sourceId: string | null;
  createdAt: string;
};

export type XpRedemption = {
  id: string;
  employeeId: string;
  pointsRedeemed: number;
  pointWeightAtTime: number;
  amount: number;
  note: string;
  isPaid: boolean;
  paidAt: string | null;
  decidedBy: string | null;
  createdAt: string;
};

export type XpCategoryBreakdown = {
  category: XpCategory;
  points: number;
};

export type XpEmployeeSummary = {
  employeeId: string;
  totalPoints: number;
  level: {
    tier: number;
    label: string;
    icon: string;
    pointsIntoLevel: number;
    pointsForNextLevel: number | null;
  };
  breakdown: XpCategoryBreakdown[];
  history: XpLedgerEntry[];
};

export type XpLeaderboardRow = {
  employeeId: string;
  employeeName: string;
  avatarUrl: string | null;
  totalPoints: number;
  rank: number;
  level: {
    tier: number;
    label: string;
    icon: string;
  };
};

export type XpEmployeeAdminDetail = {
  employeeId: string;
  employeeName: string;
  totalPoints: number;
  history: XpLedgerEntry[];
  redemptions: XpRedemption[];
};
