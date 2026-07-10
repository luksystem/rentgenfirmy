"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { resolveDictionaryIcon } from "@/lib/resource-plan/icon-options";
import { useDictionaryStore } from "@/store/dictionary-store";
import { useUserResourceStore } from "@/store/user-resource-store";

function Chip({
  label,
  color,
  icon,
  active,
  onClick,
  suffix,
}: {
  label: string;
  color: string;
  icon: string;
  active: boolean;
  onClick: () => void;
  suffix?: React.ReactNode;
}) {
  const Icon = resolveDictionaryIcon(icon);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition",
        active ? "border-transparent" : "border-border/60 text-muted hover:bg-surface-muted",
      )}
      style={active ? { backgroundColor: `${color}22`, color, borderColor: `${color}55` } : undefined}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      {suffix}
    </button>
  );
}

export function UserResourceProfileEditor({ userId }: { userId: string }) {
  const ensureDictionaries = useDictionaryStore((state) => state.ensure);
  const roleOptions = useDictionaryStore((state) => state.byKey("operational_role"));
  const competencyOptions = useDictionaryStore((state) => state.byKey("competency"));
  const levelOptions = useDictionaryStore((state) => state.byKey("competency_level"));
  const teamOptions = useDictionaryStore((state) => state.byKey("team"));

  const ensureProfile = useUserResourceStore((state) => state.ensureProfile);
  const profile = useUserResourceStore((state) => state.byUser[userId]);
  const setRoles = useUserResourceStore((state) => state.setRoles);
  const setTeams = useUserResourceStore((state) => state.setTeams);
  const upsertCompetency = useUserResourceStore((state) => state.upsertCompetency);
  const removeCompetency = useUserResourceStore((state) => state.removeCompetency);
  const addCertificate = useUserResourceStore((state) => state.addCertificate);
  const removeCertificate = useUserResourceStore((state) => state.removeCertificate);

  const [newCompetencyId, setNewCompetencyId] = useState("");
  const [newCompetencyLevelId, setNewCompetencyLevelId] = useState("");
  const [newCertName, setNewCertName] = useState("");
  const [newCertExpires, setNewCertExpires] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void ensureDictionaries();
    void ensureProfile(userId);
  }, [ensureDictionaries, ensureProfile, userId]);

  if (!profile) {
    return <p className="text-sm text-muted">Ładowanie profilu Plan Zasobów…</p>;
  }

  function toggleRole(roleId: string) {
    const next = profile.roleItemIds.includes(roleId)
      ? profile.roleItemIds.filter((id) => id !== roleId)
      : [...profile.roleItemIds, roleId];
    void setRoles(userId, next).catch((err) => setError(err instanceof Error ? err.message : "Błąd zapisu ról."));
  }

  function toggleTeam(teamId: string) {
    const exists = profile.teams.find((t) => t.teamItemId === teamId);
    const next = exists
      ? profile.teams.filter((t) => t.teamItemId !== teamId)
      : [...profile.teams, { teamItemId: teamId, isLead: false }];
    void setTeams(userId, next).catch((err) => setError(err instanceof Error ? err.message : "Błąd zapisu zespołów."));
  }

  function toggleLead(teamId: string) {
    const next = profile.teams.map((t) => (t.teamItemId === teamId ? { ...t, isLead: !t.isLead } : t));
    void setTeams(userId, next).catch((err) => setError(err instanceof Error ? err.message : "Błąd zapisu zespołów."));
  }

  async function handleAddCompetency() {
    if (!newCompetencyId) return;
    setError(null);
    try {
      await upsertCompetency(userId, newCompetencyId, newCompetencyLevelId || null);
      setNewCompetencyId("");
      setNewCompetencyLevelId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd zapisu kompetencji.");
    }
  }

  async function handleAddCertificate() {
    if (!newCertName.trim()) return;
    setError(null);
    try {
      await addCertificate(userId, { name: newCertName.trim(), expiresAt: newCertExpires || null });
      setNewCertName("");
      setNewCertExpires("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd zapisu certyfikatu.");
    }
  }

  return (
    <div className="grid gap-6">
      <h2 className="text-lg font-semibold">Profil zasobowy (Plan Zasobów)</h2>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <section className="grid gap-2">
        <p className="text-sm font-medium text-foreground/90">Role operacyjne</p>
        <div className="flex flex-wrap gap-2">
          {roleOptions.length === 0 ? (
            <p className="text-xs text-muted">
              Brak zdefiniowanych ról — dodaj je w Ustawienia → Plan Zasobów → słowniki.
            </p>
          ) : (
            roleOptions.map((role) => (
              <Chip
                key={role.id}
                label={role.name}
                color={role.color}
                icon={role.icon}
                active={profile.roleItemIds.includes(role.id)}
                onClick={() => toggleRole(role.id)}
              />
            ))
          )}
        </div>
      </section>

      <section className="grid gap-2">
        <p className="text-sm font-medium text-foreground/90">Zespoły</p>
        <div className="flex flex-wrap gap-2">
          {teamOptions.map((team) => {
            const membership = profile.teams.find((t) => t.teamItemId === team.id);
            return (
              <Chip
                key={team.id}
                label={team.name}
                color={team.color}
                icon={team.icon}
                active={Boolean(membership)}
                onClick={() => toggleTeam(team.id)}
                suffix={
                  membership ? (
                    <span
                      role="button"
                      title="Lider zespołu"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleLead(team.id);
                      }}
                      className={cn(
                        "ml-1 rounded-full px-1.5 text-[10px] font-semibold uppercase",
                        membership.isLead ? "bg-foreground/20" : "bg-foreground/5 text-muted",
                      )}
                    >
                      Lider
                    </span>
                  ) : null
                }
              />
            );
          })}
        </div>
      </section>

      <section className="grid gap-3">
        <p className="text-sm font-medium text-foreground/90">Kompetencje</p>
        <div className="grid gap-2">
          {profile.competencies.map((competency) => {
            const meta = competencyOptions.find((c) => c.id === competency.competencyItemId);
            const level = levelOptions.find((l) => l.id === competency.levelItemId);
            return (
              <div
                key={competency.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-surface-muted/15 px-3 py-2"
              >
                <span className="text-sm text-foreground">{meta?.name ?? "—"}</span>
                <div className="flex items-center gap-2">
                  {level ? (
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: `${level.color}22`, color: level.color }}
                    >
                      {level.name}
                    </span>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => void removeCompetency(userId, competency.competencyItemId)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Kompetencja" className="min-w-[180px] flex-1">
            <Select value={newCompetencyId} onChange={(event) => setNewCompetencyId(event.target.value)}>
              <option value="">Wybierz…</option>
              {competencyOptions
                .filter((c) => !profile.competencies.some((existing) => existing.competencyItemId === c.id))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Poziom" className="min-w-[160px]">
            <Select value={newCompetencyLevelId} onChange={(event) => setNewCompetencyLevelId(event.target.value)}>
              <option value="">Bez poziomu</option>
              {levelOptions.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="button" variant="secondary" disabled={!newCompetencyId} onClick={() => void handleAddCompetency()}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Dodaj
          </Button>
        </div>
      </section>

      <section className="grid gap-3">
        <p className="text-sm font-medium text-foreground/90">Certyfikaty (opcjonalnie)</p>
        <div className="grid gap-2">
          {profile.certificates.map((cert) => (
            <div
              key={cert.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-surface-muted/15 px-3 py-2"
            >
              <div>
                <p className="text-sm text-foreground">{cert.name}</p>
                {cert.expiresAt ? <p className="text-xs text-muted">Wygasa: {cert.expiresAt}</p> : null}
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => void removeCertificate(userId, cert.id)}>
                <Trash2 className="h-3.5 w-3.5 text-rose-400" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Nazwa certyfikatu" className="min-w-[200px] flex-1">
            <Input value={newCertName} onChange={(event) => setNewCertName(event.target.value)} />
          </Field>
          <Field label="Data wygaśnięcia" className="min-w-[160px]">
            <Input type="date" value={newCertExpires} onChange={(event) => setNewCertExpires(event.target.value)} />
          </Field>
          <Button type="button" variant="secondary" disabled={!newCertName.trim()} onClick={() => void handleAddCertificate()}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Dodaj
          </Button>
        </div>
      </section>
    </div>
  );
}
