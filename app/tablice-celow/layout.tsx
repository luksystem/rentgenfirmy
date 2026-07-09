import { GoalHydrator } from "@/components/goals/goal-hydrator";

export default function TabliceCelowLayout({ children }: { children: React.ReactNode }) {
  return <GoalHydrator>{children}</GoalHydrator>;
}
