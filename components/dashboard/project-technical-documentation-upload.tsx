"use client";

import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Check, FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { detectMappedSheets, type MappedSheetDetection } from "@/lib/import/detect-mapped-sheets";
import { ALL_DOCUMENTATION_MODULE_CONFIGS } from "@/lib/import/documentation-module-configs";
import { parseDocumentationModuleSheet } from "@/lib/import/documentation-module-parser";
import { parseSwitchboardWorkbook } from "@/lib/import/switchboard-xlsx-parser";
import { importParsedDocumentationModule } from "@/lib/supabase/documentation-module-repository";
import {
  fetchProjectTechnicalDocument,
  uploadProjectTechnicalDocument,
  type ProjectTechnicalDocument,
} from "@/lib/supabase/project-technical-document-repository";
import { importParsedSwitchboards } from "@/lib/supabase/switchboard-repository";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProjectTechnicalDocumentationUpload({
  projectId,
  authorName,
  authorId,
}: {
  projectId: string;
  authorName: string;
  authorId: string | null;
}) {
  const [existing, setExisting] = useState<ProjectTechnicalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [detections, setDetections] = useState<MappedSheetDetection[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchProjectTechnicalDocument(projectId)
      .then((doc) => {
        if (!cancelled) setExisting(doc);
      })
      .catch(() => {
        if (!cancelled) setExisting(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function handleFileSelected(selected: File) {
    setError(null);
    try {
      const buffer = await selected.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const found = detectMappedSheets(wb);
      setWorkbook(wb);
      setFile(selected);
      setDetections(found);
      setPreviewOpen(true);
    } catch {
      setError("Nie udało się odczytać pliku. Sprawdź, czy to prawidłowy .xlsx.");
      setPreviewOpen(true);
    }
  }

  async function handleConfirmImport() {
    if (!workbook || !file) return;
    setImporting(true);
    setError(null);
    try {
      for (const detection of detections) {
        if (detection.sheetType === "rw_zugi") {
          const parsed = parseSwitchboardWorkbook(await file.arrayBuffer());
          await importParsedSwitchboards(projectId, parsed);
          continue;
        }
        const config = ALL_DOCUMENTATION_MODULE_CONFIGS.find((c) => c.moduleType === detection.sheetType);
        if (!config) continue;
        const parsedFile = parseDocumentationModuleSheet(workbook, config);
        if (!parsedFile) continue;
        for (const mod of parsedFile.modules) {
          await importParsedDocumentationModule(projectId, mod, config.editableFieldLabels ?? []);
        }
      }

      const uploaded = await uploadProjectTechnicalDocument(projectId, file, {
        id: authorId,
        name: authorName,
      });
      setExisting(uploaded);
      setPreviewOpen(false);
      setWorkbook(null);
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zaimportować pliku.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="grid gap-2 rounded-xl border border-border/70 bg-surface-muted/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <FileSpreadsheet className="h-4 w-4 text-accent" />
            Dokumentacja techniczna projektu
          </p>
          <p className="text-xs text-muted">
            Widoczne tylko dla zespołu — zasila moduły Rozdzielnie, Rolety, Przyciski, Alarm, HVAC, RACK
            na etapach procesu.
          </p>
          {!loading && existing ? (
            <p className="mt-1 text-xs text-muted">
              Ostatnio wgrane: {existing.fileName} {formatBytes(existing.sizeBytes)} — {existing.uploadedByName} ·{" "}
              {formatDateTime(existing.updatedAt)}
            </p>
          ) : null}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(event) => {
            const selected = event.target.files?.[0];
            event.target.value = "";
            if (selected) void handleFileSelected(selected);
          }}
        />
        <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-2 h-3.5 w-3.5" />
          {existing ? "Wgraj nowszą wersję" : "Wgraj plik"}
        </Button>
      </div>

      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) {
            setError(null);
            setWorkbook(null);
            setFile(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Podgląd importu</DialogTitle>
            <DialogDescription>
              Rozpoznane arkusze zostaną zaimportowane do odpowiednich modułów. Statusy i notatki już
              wpisane w aplikacji zostaną zachowane.
            </DialogDescription>
          </DialogHeader>

          {detections.length > 0 ? (
            <div className="grid gap-1.5">
              {detections.map((detection) => (
                <p key={detection.sheetType} className="flex items-center gap-1.5 text-sm text-foreground">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  {detection.label} <span className="text-xs text-muted">({detection.sheetName})</span>
                </p>
              ))}
            </div>
          ) : !error ? (
            <p className="text-sm text-muted">
              Nie rozpoznano żadnego znanego arkusza w tym pliku — plik zostanie mimo to zapisany jako
              dokumentacja techniczna projektu.
            </p>
          ) : null}

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" className="w-full sm:w-auto" disabled={importing || !file} onClick={() => void handleConfirmImport()}>
              {importing ? "Importowanie…" : "Zaimportuj i zapisz plik"}
            </Button>
            <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => setPreviewOpen(false)}>
              Anuluj
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
