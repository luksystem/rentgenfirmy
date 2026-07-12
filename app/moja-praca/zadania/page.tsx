"use client";

import { Suspense } from "react";
import { MyWorkPage } from "@/components/my-work/my-work-page";

export default function MyWorkTasksPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Wczytywanie zadań…</p>}>
      <MyWorkPage />
    </Suspense>
  );
}
