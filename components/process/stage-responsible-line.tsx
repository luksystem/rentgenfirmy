"use client";

import Link from "next/link";
import { HardHat, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { StageResponsible } from "@/lib/supabase/stage-responsible-repository";

/**
 * D42 pkt 4b — jedna linijka „kto odpowiada za ten etap”, używana wszędzie tam, gdzie pokazujemy
 * etap. Wyliczana, nie przechowywana (macierz ról + obsada slotu na projekcie).
 *
 * Trzy reguły z ustaleń właściciela, wszystkie tutaj, żeby nie rozjechały się między miejscami:
 *  - brak obsady pokazujemy JAWNIE, nigdy pustym miejscem — puste miejsce czyta się jak „nie dotyczy”,
 *    a to jest dziura w obsadzie i ma być widać;
 *  - slot podstawiony zastępczo dostaje badge „zastępczo”;
 *  - lider etapu to OSOBNA rola, więc osobna linijka i inny podpis.
 *
 * Świadomie BEZ przycisku „zmień odpowiedzialnego” — odpowiedzialny wynika z macierzy i obsady,
 * więc przycisk przy etapie sugerowałby, że da się go tu nadpisać. Wyjątek: przy „brak obsady”
 * link do panelu obsady projektu, bo tam faktycznie leży rozwiązanie.
 */
export function StageResponsibleLine({
  data,
  projectId,
  staffingHref,
}: {
  data: StageResponsible | undefined;
  projectId?: string;
  staffingHref?: string;
}) {
  if (!data) {
    return null;
  }

  const hasRole = Boolean(data.roleCode);
  const href = staffingHref ?? (projectId ? `/projekty/${projectId}?panel=obsada` : null);

  return (
    <div className="mt-2 grid gap-1 border-t border-border/50 pt-2">
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
        <UserRound className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
        <span className="text-muted">Odpowiedzialny:</span>

        {!hasRole ? (
          // Etap bez wpisu `is_glowny` w macierzy — to brak konfiguracji szablonu, nie brak ludzi.
          // Rozróżniamy, bo naprawia się je w dwóch różnych miejscach.
          <span className="font-medium text-amber-300" title="Etap nie ma w macierzy roli oznaczonej jako główna.">
            brak roli w macierzy
          </span>
        ) : data.responsibleName ? (
          <>
            <span className="font-medium text-foreground">{data.responsibleName}</span>
            <span className="text-muted">({data.roleName})</span>
            {data.slotSource === "fallback" ? (
              // Sam napis „zastępczo" mówiłby, że ktoś zastępuje, ale nie w czyim zastępstwie —
              // a to jest właśnie ta informacja, po którą się patrzy.
              <span
                title={`Slot „${data.roleName}" nie jest obsadzony na tym projekcie. Odpowiedzialność pokrywa ${data.coveredByRoleName ?? "rola zastępcza"} zgodnie z łańcuchem zastępstw.`}
              >
                <Badge tone="waiting" className="text-[10px]">
                  zastępczo{data.coveredByRoleName ? ` jako ${data.coveredByRoleName}` : ""}
                </Badge>
              </span>
            ) : null}
          </>
        ) : (
          <>
            <span className="font-medium text-rose-300">brak obsady</span>
            <span className="text-muted">({data.roleName})</span>
            {href ? (
              <Link
                href={href}
                className="underline decoration-dotted underline-offset-2 hover:text-foreground"
                onClick={(event) => event.stopPropagation()}
              >
                obsadź
              </Link>
            ) : null}
          </>
        )}
      </div>

      {data.requiresProjectStageLead ? (
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
          <HardHat className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
          <span className="text-muted">Lider etapu:</span>
          {data.stageLeadName ? (
            <span className="font-medium text-foreground">{data.stageLeadName}</span>
          ) : (
            <span className="font-medium text-rose-300">brak wskazanego</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
