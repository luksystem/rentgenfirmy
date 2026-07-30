"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/input";
import type { ProcessStage, ProcessStageRoleResponsibility } from "@/lib/process/types";
import { fetchProcessRoles, type ProcessRole } from "@/lib/supabase/role-repository";

/**
 * Edytor macierzy odpowiedzialności per etap (docs/08 D42, docs/02 §10).
 *
 * Powstał, bo macierz była atrybutem BEZ edytora — a to okazało się gorsze niż „nikt tego nie
 * zmieni" z reguły w CLAUDE.md: zapis szablonu ją kasował (D41), więc jedyne wpisy pochodziły
 * z migracji i znikały przy pierwszej edycji szablonu.
 *
 * Role czytane z tabeli `role` (9 kodów), wyświetlane nazwami. To NIE picker `operational_role`
 * z panelu zasobów obok — tamten opisuje funkcję wykonawczą (ilu instalatorów), ten kto odpowiada.
 */
export function ProcessStageResponsibilityPanel({
  stage,
  onChange,
}: {
  stage: ProcessStage;
  onChange: (patch: Partial<ProcessStage>) => void;
}) {
  const [roles, setRoles] = useState<ProcessRole[]>([]);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [roleToAdd, setRoleToAdd] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetchProcessRoles()
      .then((loaded) => {
        if (!cancelled) setRoles(loaded);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setRolesError(err instanceof Error ? err.message : "Nie udało się wczytać listy ról.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const entries = useMemo(() => stage.roleResponsibility ?? [], [stage.roleResponsibility]);
  const roleByCode = useMemo(() => new Map(roles.map((role) => [role.code, role])), [roles]);
  const availableToAdd = useMemo(
    () => roles.filter((role) => !entries.some((entry) => entry.roleCode === role.code)),
    [roles, entries],
  );

  const glowniCount = entries.filter((entry) => entry.isGlowny).length;

  function update(next: ProcessStageRoleResponsibility[]) {
    onChange({ roleResponsibility: next });
  }

  function toggle(roleCode: string, field: "isGlowny" | "isWspiera" | "isKomunikuje") {
    update(
      entries.map((entry) =>
        entry.roleCode === roleCode ? { ...entry, [field]: !entry[field] } : entry,
      ),
    );
  }

  function addRole() {
    if (!roleToAdd) return;
    update([
      ...entries,
      { roleCode: roleToAdd, isGlowny: false, isWspiera: true, isKomunikuje: false },
    ]);
    setRoleToAdd("");
  }

  function removeRole(roleCode: string) {
    update(entries.filter((entry) => entry.roleCode !== roleCode));
  }

  return (
    <div className="grid gap-3 rounded-xl border border-border/70 bg-surface/30 p-4">
      <div>
        <p className="text-sm font-medium text-foreground">Odpowiedzialność za etap</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          <strong>G</strong> — główny odpowiedzialny (z niego wyliczany jest „odpowiedzialny za etap”
          w widoku procesu) · <strong>W</strong> — wspiera · <strong>K</strong> — komunikuje do
          inwestora. To kto odpowiada za etap, nie ilu ludzi potrzeba — tamto jest w panelu zasobów
          wyżej.
        </p>
      </div>

      {rolesError ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {rolesError}
        </p>
      ) : null}

      {/* Twarda reguła: dokładnie jeden główny. Baza to asertuje przy seedzie, edytor ma nie
          pozwolić tego zepsuć — przy zerze albo dwóch rozwiązywanie odpowiedzialnego cicho
          wybrałoby pierwszego z brzegu. */}
      {glowniCount !== 1 ? (
        <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {glowniCount === 0
            ? "Brak głównego odpowiedzialnego — nikt nie zostanie pokazany przy tym etapie."
            : `Zaznaczono ${glowniCount} głównych odpowiedzialnych. Musi być dokładnie jeden.`}
        </p>
      ) : null}

      {entries.length === 0 ? (
        <p className="text-xs text-muted">Brak ról przypisanych do tego etapu.</p>
      ) : (
        <div className="grid gap-1.5">
          {entries.map((entry) => {
            const role = roleByCode.get(entry.roleCode);
            return (
              <div
                key={entry.roleCode}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-surface/40 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-sm text-foreground">{role?.name ?? entry.roleCode}</span>
                  {role && !role.usesProjectSlot ? (
                    <span title="Ta rola nie ma slotu na projekcie — wpis nigdy nie wskaże konkretnej osoby.">
                      <Badge tone="neutral" className="text-[10px]">
                        bez slotu
                      </Badge>
                    </span>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {(
                    [
                      ["isGlowny", "G", "główny odpowiedzialny"],
                      ["isWspiera", "W", "wspiera"],
                      ["isKomunikuje", "K", "komunikuje do inwestora"],
                    ] as const
                  ).map(([field, label, title]) => (
                    <label key={field} className="flex items-center gap-1 text-xs" title={title}>
                      <input
                        type="checkbox"
                        checked={entry[field]}
                        onChange={() => toggle(entry.roleCode, field)}
                        className="h-3.5 w-3.5 rounded border-border bg-surface text-accent"
                      />
                      {label}
                    </label>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => removeRole(entry.roleCode)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {availableToAdd.length > 0 ? (
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Dodaj rolę">
            <Select value={roleToAdd} onChange={(event) => setRoleToAdd(event.target.value)}>
              <option value="">— wybierz —</option>
              {availableToAdd.map((role) => (
                <option key={role.code} value={role.code}>
                  {role.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="button" size="sm" variant="secondary" disabled={!roleToAdd} onClick={addRole}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Dodaj
          </Button>
        </div>
      ) : null}
    </div>
  );
}
