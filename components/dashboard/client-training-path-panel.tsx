"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Link2, Loader2, Plus, Settings2, Trash2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { KbArticleOrderPicker } from "@/components/smart-home-kb/kb-article-order-picker";
import { KbPathTemplateManagerDialog } from "@/components/smart-home-kb/kb-path-template-manager-dialog";
import { useSmartHomeKbStore } from "@/store/smart-home-kb-store";
import { useSmartHomeKbPathsStore } from "@/store/smart-home-kb-paths-store";
import type { SmartHomeKbClientPath } from "@/lib/smart-home-kb/types";
import { cn } from "@/lib/utils";

const EMPTY_CLIENT_PATHS: SmartHomeKbClientPath[] = [];

export function ClientTrainingPathPanel({ clientId }: { clientId: string }) {
  const ensureArticles = useSmartHomeKbStore((state) => state.ensure);
  const articles = useSmartHomeKbStore((state) => state.articles);

  const ensureTemplates = useSmartHomeKbPathsStore((state) => state.ensureTemplates);
  const ensureClientAccountProfiles = useSmartHomeKbPathsStore((state) => state.ensureClientAccountProfiles);
  const ensureClientPaths = useSmartHomeKbPathsStore((state) => state.ensureClientPaths);
  const templates = useSmartHomeKbPathsStore((state) => state.templates);
  const clientAccountProfiles = useSmartHomeKbPathsStore((state) => state.clientAccountProfiles);
  const clientPaths = useSmartHomeKbPathsStore(
    (state) => state.clientPathsByClientId[clientId] ?? EMPTY_CLIENT_PATHS,
  );
  const linkClientAccount = useSmartHomeKbPathsStore((state) => state.linkClientAccount);
  const unlinkClientAccount = useSmartHomeKbPathsStore((state) => state.unlinkClientAccount);
  const createClientPath = useSmartHomeKbPathsStore((state) => state.createClientPath);
  const createClientPathFromTemplate = useSmartHomeKbPathsStore((state) => state.createClientPathFromTemplate);
  const renameClientPath = useSmartHomeKbPathsStore((state) => state.renameClientPath);
  const removeClientPath = useSmartHomeKbPathsStore((state) => state.removeClientPath);
  const setClientPathArticles = useSmartHomeKbPathsStore((state) => state.setClientPathArticles);

  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [newPathName, setNewPathName] = useState("");
  const [creatingFromTemplate, setCreatingFromTemplate] = useState(false);
  const [creatingBlank, setCreatingBlank] = useState(false);
  const [expandedPathId, setExpandedPathId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void ensureArticles();
    void ensureTemplates();
    void ensureClientAccountProfiles();
    void ensureClientPaths(clientId);
  }, [clientId, ensureArticles, ensureTemplates, ensureClientAccountProfiles, ensureClientPaths]);

  const linkedProfile = useMemo(
    () => clientAccountProfiles.find((profile) => profile.clientId === clientId) ?? null,
    [clientAccountProfiles, clientId],
  );
  const unlinkedProfiles = useMemo(
    () => clientAccountProfiles.filter((profile) => !profile.clientId),
    [clientAccountProfiles],
  );
  const [selectedProfileId, setSelectedProfileId] = useState("");

  async function handleLink() {
    if (!selectedProfileId) {
      return;
    }
    setError(null);
    try {
      await linkClientAccount(selectedProfileId, clientId);
      setSelectedProfileId("");
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : "Nie udało się powiązać konta.");
    }
  }

  async function handleUnlink() {
    if (!linkedProfile) {
      return;
    }
    setError(null);
    try {
      await unlinkClientAccount(linkedProfile.id);
    } catch (unlinkError) {
      setError(unlinkError instanceof Error ? unlinkError.message : "Nie udało się odłączyć konta.");
    }
  }

  async function handleCreateFromTemplate() {
    if (!selectedTemplateId) {
      return;
    }
    setCreatingFromTemplate(true);
    setError(null);
    try {
      await createClientPathFromTemplate(clientId, selectedTemplateId);
      setSelectedTemplateId("");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Nie udało się utworzyć ścieżki z szablonu.");
    } finally {
      setCreatingFromTemplate(false);
    }
  }

  async function handleCreateBlank(event: React.FormEvent) {
    event.preventDefault();
    if (!newPathName.trim()) {
      return;
    }
    setCreatingBlank(true);
    setError(null);
    try {
      const path = await createClientPath({ clientId, name: newPathName, articleIds: [] });
      setNewPathName("");
      setExpandedPathId(path.id);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Nie udało się utworzyć ścieżki.");
    } finally {
      setCreatingBlank(false);
    }
  }

  async function handleRemovePath(pathId: string) {
    if (!window.confirm("Usunąć tę ścieżkę szkoleniową?")) {
      return;
    }
    await removeClientPath(clientId, pathId);
  }

  async function handleRenamePath(path: SmartHomeKbClientPath, nextName: string) {
    const trimmed = nextName.trim();
    if (!trimmed || trimmed === path.name) {
      return;
    }
    try {
      await renameClientPath(clientId, path.id, { name: trimmed, description: path.description });
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : "Nie udało się zmienić nazwy ścieżki.");
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardContent className="grid gap-3 p-5">
          <h3 className="text-sm font-semibold text-foreground">Konto klienta</h3>
          {linkedProfile ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted/20 px-3 py-2">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Link2 className="h-4 w-4 text-accent" />
                {linkedProfile.name} ({linkedProfile.email})
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => void handleUnlink()}>
                <Unlink className="h-3.5 w-3.5" />
                Odłącz
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={selectedProfileId}
                onChange={(event) => setSelectedProfileId(event.target.value)}
                className="max-w-xs"
              >
                <option value="">Wybierz konto (rola klient)...</option>
                {unlinkedProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name} ({profile.email})
                  </option>
                ))}
              </Select>
              <Button type="button" size="sm" disabled={!selectedProfileId} onClick={() => void handleLink()}>
                <Link2 className="h-3.5 w-3.5" />
                Powiąż konto
              </Button>
            </div>
          )}
          <p className="text-xs text-muted">
            To konto klienta zobaczy przypisane niżej ścieżki po zalogowaniu w „Wiedza Smart Home”.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Ścieżki szkoleniowe</h3>
        <Button type="button" variant="outline" size="sm" onClick={() => setTemplateManagerOpen(true)}>
          <Settings2 className="h-3.5 w-3.5" />
          Zarządzaj szablonami
        </Button>
      </div>

      <div className="grid gap-3">
        {clientPaths.map((path) => (
          <Card key={path.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Input
                  defaultValue={path.name}
                  className="h-8 min-w-0 flex-1 font-medium"
                  onBlur={(event) => void handleRenamePath(path, event.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedPathId((prev) => (prev === path.id ? null : path.id))}
                  aria-label={expandedPathId === path.id ? "Zwiń" : "Rozwiń"}
                >
                  <ChevronDown
                    className={cn("h-4 w-4 transition", expandedPathId === path.id && "rotate-180")}
                  />
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => void handleRemovePath(path.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted">{path.items.length} krok(ów)</p>
              {expandedPathId === path.id ? (
                <div className="mt-3">
                  <KbArticleOrderPicker
                    allArticles={articles}
                    selectedArticleIds={path.items.map((item) => item.articleId)}
                    onChange={(articleIds) => void setClientPathArticles(clientId, path.id, articleIds)}
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
        {clientPaths.length === 0 ? (
          <p className="text-xs text-muted">Ten klient nie ma jeszcze żadnej ścieżki szkoleniowej.</p>
        ) : null}
      </div>

      <div className="grid gap-3 rounded-xl border border-dashed border-border p-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Field label="Utwórz z szablonu">
            <Select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
              <option value="">Wybierz szablon...</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!selectedTemplateId || creatingFromTemplate}
            onClick={() => void handleCreateFromTemplate()}
          >
            {creatingFromTemplate ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Utwórz kopię dla klienta
          </Button>
        </div>

        <form onSubmit={handleCreateBlank} className="grid gap-2">
          <Field label="Utwórz od zera">
            <Input
              value={newPathName}
              onChange={(event) => setNewPathName(event.target.value)}
              placeholder="np. Podstawy obsługi systemu"
            />
          </Field>
          <Button type="submit" variant="outline" size="sm" disabled={creatingBlank}>
            {creatingBlank ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Utwórz pustą ścieżkę
          </Button>
        </form>
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <KbPathTemplateManagerDialog open={templateManagerOpen} onOpenChange={setTemplateManagerOpen} articles={articles} />
    </div>
  );
}
