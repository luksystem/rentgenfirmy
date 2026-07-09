import {
  BadgeCheck,
  CircleDollarSign,
  Crown,
  FolderKanban,
  GraduationCap,
  Megaphone,
  Sprout,
  Target,
  TrendingUp,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  "trending-up": TrendingUp,
  "folder-kanban": FolderKanban,
  wrench: Wrench,
  "badge-check": BadgeCheck,
  sprout: Sprout,
  "circle-dollar-sign": CircleDollarSign,
  crown: Crown,
  megaphone: Megaphone,
  "graduation-cap": GraduationCap,
  target: Target,
};

export function GoalBoardKindIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = ICON_MAP[icon] ?? Target;
  return <Icon className={className} />;
}
