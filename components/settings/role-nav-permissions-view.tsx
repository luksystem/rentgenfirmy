"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, RotateCcw, Shield } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { USER_ROLE_LABELS, type UserRole } from "@/lib/auth/types";
import { NAV_MODULE_GROUPS } from "@/lib/navigation/nav-modules";
import {
  buildRoleActionMatrix,
  buildRoleNavMatrix,
  configDiffersFromDefaults,
} from "@/lib/navigation/role-nav-permissions";
import { CONFIGURABLE_ROLES } from "@/lib/navigation/role-nav-defaults";
import {
  getSupportedActionsForModule,
  PERMISSION_ACTION_LABELS,
} from "@/lib/permissions/module-actions";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useRoleNavPermissionsStore } from "@/store/role-nav-permissions-store";

type PermissionsTab = "menu" | "actions";

const ROLE_SHORT_LABELS: Record<UserRole, string> = {
  administrator: "Admin",
  manager: "Manager",
  pracownik: "Prac.",
  podwykonawca: "Podw.",
  klient: "Klient",
  gosc: "Gość",
};

function RoleSelector({
  selectedRole,
  onSelect,
}: {
  selectedRole: UserRole;
  onSelect: (role: UserRole) => void;
}) {
  return (
    <div className="md:hidden">
      <p className="mb-2 text-xs font-medium text-muted">Wybrana rola</p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
        {CONFIGURABLE_ROLES.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => onSelect(role)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition",
              selectedRole === role
                ? "border-blue-500/60 bg-blue-500/15 text-blue-200"
                : "border-border/80 bg-surface-muted/30 text-muted hover:text-foreground",
            )}
          >
            <span>{ROLE_SHORT_LABELS[role]}</span>
          </button>
        ))}
      </div>
      <p className="mt-1 text-xs text-muted">
        Edytujesz uprawnienia dla:{" "}
        <strong className="text-foreground">{USER_ROLE_LABELS[selectedRole]}</strong>
      </p>
    </div>
  );
}

export function RoleNavPermissionsView() {
  const isAdministrator = useAuthStore((state) => state.isAdministrator);
  const authLoading = useAuthStore((state) => state.isLoading);

  const config = useRoleNavPermissionsStore((state) => state.config);
  const hydrate = useRoleNavPermissionsStore((state) => state.hydrate);
  const saveConfig = useRoleNavPermissionsStore((state) => state.saveConfig);
  const setModuleAccess = useRoleNavPermissionsStore((state) => state.setModuleAccess);
  const setGroupAccess = useRoleNavPermissionsStore((state) => state.setGroupAccess);
  const setModuleActionAccess = useRoleNavPermissionsStore((state) => state.setModuleActionAccess);
  const resetToDefaults = useRoleNavPermissionsStore((state) => state.resetToDefaults);
  const isLoading = useRoleNavPermissionsStore((state) => state.isLoading);
  const isSaving = useRoleNavPermissionsStore((state) => state.isSaving);
  const error = useRoleNavPermissionsStore((state) => state.error);

  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<PermissionsTab>("menu");
  const [selectedRole, setSelectedRole] = useState<UserRole>("manager");
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const navMatrix = useMemo(() => buildRoleNavMatrix(config), [config]);
  const actionMatrix = useMemo(() => buildRoleActionMatrix(config), [config]);
  const hasCustomConfig = useMemo(() => configDiffersFromDefaults(config), [config]);

  const load = useCallback(async () => {
    await hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isAdministrator) {
      void load();
    }
  }, [isAdministrator, load]);

  async function handleSave() {
    setSaved(false);
    await saveConfig(config);
    setSaved(true);
  }

  function toggleModuleExpanded(moduleKey: string) {
    setExpandedModules((current) => {
      const next = new Set(current);
      if (next.has(moduleKey)) {
        next.delete(moduleKey);
      } else {
        next.add(moduleKey);
      }
      return next;
    });
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Weryfikacja uprawnień...
      </div>
    );
  }

  if (!isAdministrator) {
    return (
      <Card className="mx-auto mt-10 max-w-2xl border-amber-500/30">
        <CardContent className="grid gap-3 py-8">
          <div className="flex items-center gap-2 text-amber-300">
            <Shield className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Tylko dla administratora</h2>
          </div>
          <p className="text-sm text-muted">
            Manager uprawnień jest dostępny wyłącznie dla roli Administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  const roleCount = CONFIGURABLE_ROLES.length;

  return (
    <>
      <PageHeader
        eyebrow="Bezpieczeństwo"
        title="Uprawnienia ról"
        description="Konfiguruj dostęp do modułów menu i szczegółowe akcje dla każdej roli z systemu."
        action={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => {
                resetToDefaults();
                setSaved(false);
              }}
              disabled={isSaving || isLoading}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              <span className="sm:hidden">Domyślne</span>
              <span className="hidden sm:inline">Przywróć domyślne</span>
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={() => void handleSave()}
              disabled={isSaving || isLoading}
            >
              {isSaving ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </div>
        }
      />

      {saved ? (
        <Card className="panel-success mb-4 border">
          <CardContent className="py-3 text-sm text-emerald-300">
            Uprawnienia zostały zapisane.
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <Card className="panel-danger mb-4 border">
          <CardContent className="py-3 text-sm text-rose-300">{error}</CardContent>
        </Card>
      ) : null}

      <Card className="mb-6 border border-border/80 bg-surface-muted/20">
        <CardContent className="grid gap-2 py-4 text-sm text-muted">
          <p className="hidden sm:block">
            Macierz obejmuje wszystkie role:{" "}
            {CONFIGURABLE_ROLES.map((role) => USER_ROLE_LABELS[role]).join(", ")}.
          </p>
          <p>
            Użytkownik z rolą <strong className="text-foreground">Administrator</strong> w profilu
            zawsze ma pełny dostęp. Pozostałe role podlegają konfiguracji.
          </p>
          {hasCustomConfig ? (
            <p className="text-amber-300/90">
              Aktywna jest niestandardowa konfiguracja — różni się od domyślnych ustawień.
            </p>
          ) : (
            <p>Używane są domyślne ustawienia z kodu.</p>
          )}
        </CardContent>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Button
          className="w-full sm:w-auto"
          variant={activeTab === "menu" ? "default" : "secondary"}
          onClick={() => setActiveTab("menu")}
        >
          Menu
        </Button>
        <Button
          className="w-full sm:w-auto"
          variant={activeTab === "actions" ? "default" : "secondary"}
          onClick={() => setActiveTab("actions")}
        >
          Akcje
        </Button>
      </div>

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center text-sm text-muted">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Ładowanie konfiguracji...
        </div>
      ) : activeTab === "menu" ? (
        <>
          <div className="mb-4 md:hidden">
            <RoleSelector selectedRole={selectedRole} onSelect={setSelectedRole} />
          </div>

          {/* Mobile: lista modułów dla wybranej roli */}
          <div className="grid gap-3 md:hidden">
            {NAV_MODULE_GROUPS.map((group) => (
              <Card key={group.key} className="border border-border/80">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-surface-muted/20 px-4 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {group.label}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-[11px] text-blue-300"
                        onClick={() =>
                          setGroupAccess(
                            selectedRole,
                            group.modules.map((module) => module.key),
                            true,
                          )
                        }
                      >
                        Wszystkie
                      </button>
                      <button
                        type="button"
                        className="text-[11px] text-muted"
                        onClick={() =>
                          setGroupAccess(
                            selectedRole,
                            group.modules.map((module) => module.key),
                            false,
                          )
                        }
                      >
                        Żadne
                      </button>
                    </div>
                  </div>
                  {group.modules.map((module) => (
                    <label
                      key={module.key}
                      className="flex cursor-pointer items-center justify-between gap-3 border-b border-border/30 px-4 py-3 last:border-b-0 active:bg-surface-muted/10"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{module.label}</p>
                        <p className="truncate text-xs text-muted">{module.href}</p>
                      </div>
                      <input
                        type="checkbox"
                        className="h-5 w-5 shrink-0 rounded border-border accent-blue-500"
                        checked={navMatrix[selectedRole][module.key]}
                        onChange={(event) =>
                          setModuleAccess(selectedRole, module.key, event.target.checked)
                        }
                      />
                    </label>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: pełna macierz */}
          <div className="hidden overflow-x-auto rounded-xl border border-border/80 md:block">
            <table className="w-full min-w-[960px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-surface-muted/30">
                  <th className="sticky left-0 z-10 bg-surface-muted/95 px-4 py-3 text-left font-medium text-foreground">
                    Moduł
                  </th>
                  {CONFIGURABLE_ROLES.map((role) => (
                    <th key={role} className="px-2 py-3 text-center text-xs font-medium text-foreground">
                      {USER_ROLE_LABELS[role]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {NAV_MODULE_GROUPS.map((group) => (
                  <Fragment key={group.key}>
                    <tr className="bg-surface-muted/15">
                      <td
                        colSpan={1 + roleCount}
                        className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span>{group.label}</span>
                          <div className="flex flex-wrap gap-1">
                            {CONFIGURABLE_ROLES.map((role) => (
                              <button
                                key={`${group.key}-${role}-all`}
                                type="button"
                                className="rounded-md px-2 py-0.5 text-[11px] font-normal normal-case tracking-normal text-blue-300 hover:bg-blue-500/10"
                                onClick={() =>
                                  setGroupAccess(
                                    role,
                                    group.modules.map((module) => module.key),
                                    true,
                                  )
                                }
                              >
                                {USER_ROLE_LABELS[role]}: wszystkie
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                    {group.modules.map((module) => (
                      <tr
                        key={module.key}
                        className="border-b border-border/40 hover:bg-surface-muted/10"
                      >
                        <td className="sticky left-0 z-10 bg-background/95 px-4 py-2.5">
                          <p className="font-medium text-foreground">{module.label}</p>
                          <p className="text-xs text-muted">{module.href}</p>
                        </td>
                        {CONFIGURABLE_ROLES.map((role) => (
                          <td key={`${module.key}-${role}`} className="px-2 py-2.5 text-center">
                            <label className="inline-flex cursor-pointer items-center justify-center">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-border accent-blue-500"
                                checked={navMatrix[role][module.key]}
                                onChange={(event) =>
                                  setModuleAccess(role, module.key, event.target.checked)
                                }
                              />
                            </label>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="mb-4 md:hidden">
            <RoleSelector selectedRole={selectedRole} onSelect={setSelectedRole} />
          </div>

          {/* Mobile: akcje dla wybranej roli */}
          <div className="grid gap-3 md:hidden">
            {NAV_MODULE_GROUPS.map((group) => {
              const modulesWithActions = group.modules.filter(
                (module) => getSupportedActionsForModule(module.key).length > 1,
              );
              if (modulesWithActions.length === 0) {
                return null;
              }

              return (
                <Card key={group.key} className="border border-border/80">
                  <CardContent className="p-0">
                    <p className="border-b border-border/60 bg-surface-muted/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      {group.label}
                    </p>
                    {modulesWithActions.map((module) => {
                      const supportedActions = getSupportedActionsForModule(module.key);
                      const expanded = expandedModules.has(module.key);
                      const moduleEnabled = navMatrix[selectedRole][module.key];

                      return (
                        <div key={module.key} className="border-b border-border/40 last:border-b-0">
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-4 py-3 text-left active:bg-surface-muted/10"
                            onClick={() => toggleModuleExpanded(module.key)}
                          >
                            {expanded ? (
                              <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground">{module.label}</p>
                              <p className="truncate text-xs text-muted">{module.href}</p>
                            </div>
                            {!moduleEnabled ? (
                              <span className="shrink-0 text-[10px] text-muted">brak menu</span>
                            ) : null}
                          </button>
                          {expanded ? (
                            <div className={cn("px-4 pb-3", !moduleEnabled && "opacity-40")}>
                              {supportedActions.map((action) => (
                                <label
                                  key={action}
                                  className="flex items-center justify-between gap-3 border-b border-border/20 py-2.5 last:border-b-0"
                                >
                                  <span className="text-sm text-foreground">
                                    {PERMISSION_ACTION_LABELS[action]}
                                  </span>
                                  <input
                                    type="checkbox"
                                    className="h-5 w-5 shrink-0 rounded border-border accent-blue-500"
                                    checked={actionMatrix[selectedRole][module.key][action]}
                                    disabled={!moduleEnabled}
                                    onChange={(event) =>
                                      setModuleActionAccess(
                                        selectedRole,
                                        module.key,
                                        action,
                                        event.target.checked,
                                      )
                                    }
                                  />
                                </label>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Desktop: macierz akcji */}
          <div className="hidden grid-cols-1 gap-3 md:grid">
            {NAV_MODULE_GROUPS.map((group) => (
              <Card key={group.key} className="border border-border/80">
                <CardContent className="p-0">
                  <p className="border-b border-border/60 bg-surface-muted/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    {group.label}
                  </p>
                  {group.modules.map((module) => {
                    const supportedActions = getSupportedActionsForModule(module.key);
                    const hasMultipleActions = supportedActions.length > 1;
                    const expanded = expandedModules.has(module.key);

                    if (!hasMultipleActions) {
                      return null;
                    }

                    return (
                      <div key={module.key} className="border-b border-border/40 last:border-b-0">
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-surface-muted/10"
                          onClick={() => toggleModuleExpanded(module.key)}
                        >
                          {expanded ? (
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                          )}
                          <div>
                            <p className="font-medium text-foreground">{module.label}</p>
                            <p className="text-xs text-muted">{module.href}</p>
                          </div>
                        </button>
                        {expanded ? (
                          <div className="overflow-x-auto px-4 pb-3">
                            <table className="w-full min-w-[960px] border-collapse text-sm">
                              <thead>
                                <tr className="border-b border-border/50">
                                  <th className="sticky left-0 z-10 bg-background/95 py-2 text-left text-xs font-medium text-muted">
                                    Akcja
                                  </th>
                                  {CONFIGURABLE_ROLES.map((role) => (
                                    <th
                                      key={`${module.key}-hdr-${role}`}
                                      className="px-2 py-2 text-center text-xs font-medium text-muted"
                                    >
                                      {USER_ROLE_LABELS[role]}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {supportedActions.map((action) => (
                                  <tr key={action} className="border-b border-border/30">
                                    <td className="sticky left-0 z-10 bg-background/95 py-2 text-foreground">
                                      {PERMISSION_ACTION_LABELS[action]}
                                    </td>
                                    {CONFIGURABLE_ROLES.map((role) => (
                                      <td
                                        key={`${module.key}-${action}-${role}`}
                                        className="px-2 py-2 text-center"
                                      >
                                        <label
                                          className={cn(
                                            "inline-flex cursor-pointer items-center justify-center",
                                            !navMatrix[role][module.key] && "opacity-40",
                                          )}
                                        >
                                          <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-border accent-blue-500"
                                            checked={actionMatrix[role][module.key][action]}
                                            disabled={!navMatrix[role][module.key]}
                                            onChange={(event) =>
                                              setModuleActionAccess(
                                                role,
                                                module.key,
                                                action,
                                                event.target.checked,
                                              )
                                            }
                                          />
                                        </label>
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}
