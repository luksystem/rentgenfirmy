import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GoalSettingAssistant } from "@/components/goals/goal-setting-assistant";
import { PageHeader } from "@/components/page-header";

export default function GoalSettingAssistantPage() {
  return (
    <>
      <PageHeader
        eyebrow="Tablice celów"
        title="Asystent wyznaczania celów"
        description="Przechodzi po aktywnych projektach, sprawdza czy mają wyznaczone cele i analizuje to z aktywnym etapem procesu."
        action={
          <Link
            href="/tablice-celow"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-muted px-3.5 py-2 text-sm font-medium text-foreground transition hover:border-accent/40"
          >
            <ArrowLeft className="h-4 w-4" />
            Wróć
          </Link>
        }
      />
      <GoalSettingAssistant />
    </>
  );
}
