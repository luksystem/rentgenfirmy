"use client";

import { VizHydrator } from "@/components/viz/viz-hydrator";

export default function WizualizacjeLayout({ children }: { children: React.ReactNode }) {
  return <VizHydrator>{children}</VizHydrator>;
}
