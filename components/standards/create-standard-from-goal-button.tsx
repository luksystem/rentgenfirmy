"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CreateStandardFromGoalButton({ goalId }: { goalId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/standards/from-goal", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Nie udało się utworzyć standardu.");
      }
      router.push(`/standardy/${payload.standard.slug}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nie udało się utworzyć standardu.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="secondary" size="sm" disabled={loading} onClick={() => void handleClick()}>
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
        Utwórz standard
      </Button>
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
    </div>
  );
}
