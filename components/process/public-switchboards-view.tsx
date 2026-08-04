import {
  SWITCHBOARD_CIRCUIT_STATUS_BADGE_CLASS,
  SWITCHBOARD_CIRCUIT_STATUS_LABELS,
  groupSwitchboardCircuitsBySection,
  switchboardCircuitLabel,
  type SwitchboardCircuit,
} from "@/lib/dashboard/switchboard-types";
import type { PublicSwitchboardWithCircuits } from "@/lib/supabase/process-public-server";
import { cn } from "@/lib/utils";

function CircuitRow({ circuit }: { circuit: SwitchboardCircuit }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 py-2 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{switchboardCircuitLabel(circuit)}</p>
        <p className="truncate text-xs text-muted">
          {[circuit.circuitDescription, circuit.location].filter(Boolean).join(" — ") || "—"}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium",
          SWITCHBOARD_CIRCUIT_STATUS_BADGE_CLASS[circuit.status],
        )}
      >
        {SWITCHBOARD_CIRCUIT_STATUS_LABELS[circuit.status]}
      </span>
    </div>
  );
}

/** Publiczny, tylko-do-odczytu widok rozdzielni — kto ma link, widzi treść (patrz komentarz przy
 * `fetchPublicSwitchboards` w process-public-server.ts). Bez edycji statusów. */
export function PublicSwitchboardsView({ switchboards }: { switchboards: PublicSwitchboardWithCircuits[] }) {
  if (switchboards.length === 0) {
    return <p className="text-sm text-muted">Brak wgranych rozdzielni dla tego projektu.</p>;
  }

  return (
    <div className="grid gap-4">
      {switchboards.map(({ switchboard, circuits }) => {
        const groups = groupSwitchboardCircuitsBySection(circuits);
        return (
          <div key={switchboard.id} className="rounded-xl border border-border/60 bg-surface-muted/10 p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">{switchboard.name}</p>
            {groups.length === 0 ? (
              <p className="text-sm text-muted">Brak pozycji.</p>
            ) : (
              <div className="grid gap-4">
                {groups.map((group, groupIndex) => (
                  <div key={groupIndex}>
                    {group.sectionName ? (
                      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                        {group.sectionName}
                      </p>
                    ) : null}
                    <div className="grid gap-3">
                      {group.entries.map((entry, entryIndex) =>
                        entry.kind === "zug" ? (
                          <div key={entryIndex} className="rounded-lg border border-border/50 px-3 py-2">
                            <p className="mb-1 text-xs font-medium text-muted">Zug {entry.zugNo}</p>
                            {entry.circuits.map((circuit) => (
                              <CircuitRow key={circuit.id} circuit={circuit} />
                            ))}
                          </div>
                        ) : (
                          <div key={entryIndex} className="rounded-lg border border-border/50 px-3 py-2">
                            <CircuitRow circuit={entry.circuit} />
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
