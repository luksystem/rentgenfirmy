import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GoalModuleSettingsView } from "@/components/goals/goal-module-settings-view";
import { PageHeader } from "@/components/page-header";

export default function GoalModuleSettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Tablice celów"
        title="Ustawienia"
        description="Parametry modułu celów — wpływają na pickery projektów w formularzach celów."
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
      <GoalModuleSettingsView />
    </>
  );
}
