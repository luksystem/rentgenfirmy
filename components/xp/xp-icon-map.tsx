import {
  Award,
  CheckCircle2,
  Clock,
  Crown,
  Hammer,
  HeartHandshake,
  Medal,
  Sparkles,
  Sprout,
  Star,
  Target,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  seedling: Sprout,
  hammer: Hammer,
  award: Award,
  medal: Medal,
  crown: Crown,
  "heart-handshake": HeartHandshake,
  "clock-check": Clock,
  "check-circle-2": CheckCircle2,
  sparkles: Sparkles,
  target: Target,
};

export function xpIcon(icon: string): LucideIcon {
  return ICON_MAP[icon] ?? Star;
}
