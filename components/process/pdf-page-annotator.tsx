"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Eraser, Loader2, Pencil, Trash2, Type, X } from "lucide-react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const RENDER_WIDTH = 760;
const PEN_WIDTH = 3;
const ERASER_WIDTH = 22;
const TEXT_FONT_SIZE = 18;

type Tool = "pen" | "eraser" | "text";

const PEN_COLORS = [
  { value: "#dc2626", label: "Czerwony" },
  { value: "#111827", label: "Czarny" },
  { value: "#2563eb", label: "Niebieski" },
  { value: "#16a34a", label: "Zielony" },
  { value: "#ea580c", label: "Pomarańczowy" },
];

type TextEditorState = {
  /** Współrzędne w przestrzeni surowego canvasu (do rysowania tekstu). */
  x: number;
  y: number;
  /** Współrzędne CSS względem kontenera (do pozycjonowania pływającego pola). */
  cssX: number;
  cssY: number;
  value: string;
};

type PdfPageAnnotatorProps = {
  pdfUrl: string;
  /** Podpisane URL-e istniejących adnotacji (PNG) per numer strony (1-indeksowane). */
  annotationUrlsByPage: Record<number, string>;
  /** Wywoływane po dokończeniu pociągnięcia / wyczyszczeniu strony — `null` usuwa adnotację. */
  onSaveAnnotation: (page: number, dataUrl: string | null) => Promise<void>;
  readOnly?: boolean;
  className?: string;
};

/**
 * Renderuje wzór PDF strona po stronie (pdf.js) z nakładką do odręcznego pisania/rysowania
 * (rysik/palec — pointer events). Optymalizowane pod tablet: strony renderowane w stałej
 * rozdzielczości logicznej, ale wyświetlane responsywnie (CSS `max-width: 100%`), więc
 * współrzędne rysowania są zawsze przeliczane względem faktycznego rozmiaru na ekranie.
 */
export function PdfPageAnnotator({
  pdfUrl,
  annotationUrlsByPage,
  onSaveAnnotation,
  readOnly = false,
  className,
}: PdfPageAnnotatorProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const drawingRef = useRef(false);
  const strokedRef = useRef(false);
  const hasContentRef = useRef(false);
  const dirtyRef = useRef(false);
  const currentPageRef = useRef(1);
  const ratioRef = useRef(1);
  const saveTimeoutRef = useRef<number | null>(null);

  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [renderingPage, setRenderingPage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canvasCssSize, setCanvasCssSize] = useState({ width: RENDER_WIDTH, height: Math.round(RENDER_WIDTH * 1.414) });
  const [tool, setTool] = useState<Tool>("pen");
  const [penColor, setPenColor] = useState(PEN_COLORS[0].value);
  const [textEditor, setTextEditor] = useState<TextEditorState | null>(null);

  const annotationUrlsKey = JSON.stringify(annotationUrlsByPage);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const flushSave = useCallback(async () => {
    if (!dirtyRef.current || readOnly) {
      return;
    }
    const canvas = drawCanvasRef.current;
    if (!canvas) {
      return;
    }
    dirtyRef.current = false;
    const dataUrl = hasContentRef.current ? canvas.toDataURL("image/png") : null;
    setSaving(true);
    try {
      await onSaveAnnotation(currentPageRef.current, dataUrl);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać adnotacji.");
    } finally {
      setSaving(false);
    }
  }, [onSaveAnnotation, readOnly]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
      void flushSave();
    };
  }, [flushSave]);

  useEffect(() => {
    let cancelled = false;
    setLoadingDoc(true);
    setError(null);
    setNumPages(0);
    setCurrentPage(1);

    void (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
        loadingTaskRef.current = loadingTask;
        const pdf = await loadingTask.promise;
        if (cancelled) {
          void loadingTask.destroy();
          return;
        }
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Nie udało się wczytać wzoru PDF.");
        }
      } finally {
        if (!cancelled) {
          setLoadingDoc(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      void loadingTaskRef.current?.destroy();
      loadingTaskRef.current = null;
      pdfDocRef.current = null;
    };
  }, [pdfUrl]);

  const renderCurrentPage = useCallback(async () => {
    const pdf = pdfDocRef.current;
    const bgCanvas = bgCanvasRef.current;
    const drawCanvas = drawCanvasRef.current;
    if (!pdf || !bgCanvas || !drawCanvas) {
      return;
    }

    setRenderingPage(true);
    setError(null);
    try {
      const page = await pdf.getPage(currentPageRef.current);
      const naturalViewport = page.getViewport({ scale: 1 });
      const ratio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      ratioRef.current = ratio;
      const cssWidth = Math.min(RENDER_WIDTH, naturalViewport.width);
      const renderScale = (cssWidth / naturalViewport.width) * ratio;
      const viewport = page.getViewport({ scale: renderScale });
      const cssHeight = (cssWidth / naturalViewport.width) * naturalViewport.height;

      bgCanvas.width = Math.round(viewport.width);
      bgCanvas.height = Math.round(viewport.height);
      drawCanvas.width = Math.round(viewport.width);
      drawCanvas.height = Math.round(viewport.height);
      setCanvasCssSize({ width: Math.round(cssWidth), height: Math.round(cssHeight) });

      const bgCtx = bgCanvas.getContext("2d");
      if (bgCtx) {
        await page.render({ canvasContext: bgCtx, viewport, canvas: bgCanvas }).promise;
      }

      const drawCtx = drawCanvas.getContext("2d");
      if (drawCtx) {
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        drawCtx.globalCompositeOperation = "source-over";
        drawCtx.lineCap = "round";
        drawCtx.lineJoin = "round";
      }

      const existingUrl = annotationUrlsByPage[currentPageRef.current];
      hasContentRef.current = false;
      if (existingUrl && drawCtx) {
        await new Promise<void>((resolve) => {
          const img = new window.Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            drawCtx.drawImage(img, 0, 0, drawCanvas.width, drawCanvas.height);
            hasContentRef.current = true;
            resolve();
          };
          img.onerror = () => resolve();
          img.src = existingUrl;
        });
      }
      dirtyRef.current = false;
      setIsEmpty(!hasContentRef.current);
    } catch (renderError) {
      setError(renderError instanceof Error ? renderError.message : "Nie udało się wyrenderować strony.");
    } finally {
      setRenderingPage(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annotationUrlsKey]);

  useEffect(() => {
    if (numPages > 0) {
      void renderCurrentPage();
    }
  }, [numPages, currentPage, renderCurrentPage]);

  async function goToPage(next: number) {
    if (next < 1 || next > numPages || next === currentPage) {
      return;
    }
    commitTextEditor();
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    await flushSave();
    setCurrentPage(next);
  }

  function scheduleSave() {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      void flushSave();
    }, 700);
  }

  function getPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = drawCanvasRef.current;
    if (!canvas) {
      return { x: 0, y: 0 };
    }
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
  }

  function openTextEditor(event: React.PointerEvent<HTMLCanvasElement>) {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return;
    }
    const canvasPoint = getPoint(event);
    const wrapperRect = wrapper.getBoundingClientRect();
    setTextEditor({
      x: canvasPoint.x,
      y: canvasPoint.y,
      cssX: event.clientX - wrapperRect.left,
      cssY: event.clientY - wrapperRect.top,
      value: "",
    });
  }

  function commitTextEditor() {
    setTextEditor((current) => {
      if (!current) {
        return null;
      }
      const text = current.value.trim();
      if (!text) {
        return null;
      }
      const ctx = drawCanvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = penColor;
        const fontSize = TEXT_FONT_SIZE * ratioRef.current;
        ctx.font = `${fontSize}px sans-serif`;
        ctx.textBaseline = "top";
        text.split("\n").forEach((line, index) => {
          ctx.fillText(line, current.x, current.y + index * fontSize * 1.3);
        });
        hasContentRef.current = true;
        dirtyRef.current = true;
        setIsEmpty(false);
        scheduleSave();
      }
      return null;
    });
  }

  function cancelTextEditor() {
    setTextEditor(null);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (readOnly) {
      return;
    }
    if (textEditor) {
      commitTextEditor();
      return;
    }
    if (tool === "text") {
      openTextEditor(event);
      return;
    }
    const ctx = drawCanvasRef.current?.getContext("2d");
    if (!ctx) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = penColor;
    ctx.lineWidth = (tool === "eraser" ? ERASER_WIDTH : PEN_WIDTH) * ratioRef.current;
    const { x, y } = getPoint(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) {
      return;
    }
    const ctx = drawCanvasRef.current?.getContext("2d");
    if (!ctx) {
      return;
    }
    const { x, y } = getPoint(event);
    ctx.lineTo(x, y);
    ctx.stroke();
    strokedRef.current = true;
    hasContentRef.current = true;
    if (isEmpty) {
      setIsEmpty(false);
    }
  }

  function finishStroke() {
    if (!drawingRef.current) {
      return;
    }
    drawingRef.current = false;
    if (strokedRef.current) {
      strokedRef.current = false;
      dirtyRef.current = true;
      scheduleSave();
    }
  }

  function handleClearPage() {
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      return;
    }
    setTextEditor(null);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasContentRef.current = false;
    dirtyRef.current = true;
    setIsEmpty(true);
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    void flushSave();
  }

  if (loadingDoc) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-surface-muted/20 p-6 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Wczytywanie wzoru PDF…
      </div>
    );
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-surface-muted/20 px-3 py-2 text-sm">
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={currentPage <= 1 || renderingPage}
            onClick={() => void goToPage(currentPage - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="min-w-[84px] text-center text-xs text-muted">
            Strona {currentPage} / {numPages || 1}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={currentPage >= numPages || renderingPage}
            onClick={() => void goToPage(currentPage + 1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {saving ? (
            <span className="flex items-center gap-1 text-xs text-muted">
              <Loader2 className="h-3 w-3 animate-spin" />
              Zapisywanie…
            </span>
          ) : null}
          {!readOnly ? (
            <Button type="button" size="sm" variant="outline" disabled={isEmpty} onClick={handleClearPage}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Wyczyść całą stronę
            </Button>
          ) : null}
        </div>
      </div>

      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-surface-muted/20 px-3 py-2">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant={tool === "pen" ? "default" : "outline"}
              onClick={() => {
                commitTextEditor();
                setTool("pen");
              }}
              title="Pisak"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tool === "eraser" ? "default" : "outline"}
              onClick={() => {
                commitTextEditor();
                setTool("eraser");
              }}
              title="Gumka (usuwa fragment odręcznego pisma)"
            >
              <Eraser className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tool === "text" ? "default" : "outline"}
              onClick={() => setTool("text")}
              title="Wstaw pole tekstowe"
            >
              <Type className="h-3.5 w-3.5" />
            </Button>
          </div>
          {tool !== "eraser" ? (
            <div className="flex items-center gap-1.5">
              {PEN_COLORS.map((colorOption) => (
                <button
                  key={colorOption.value}
                  type="button"
                  title={colorOption.label}
                  onClick={() => setPenColor(colorOption.value)}
                  className={cn(
                    "h-6 w-6 rounded-full border-2 transition",
                    penColor === colorOption.value ? "border-foreground scale-110" : "border-border/50",
                  )}
                  style={{ backgroundColor: colorOption.value }}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="text-xs text-rose-400">{error}</p> : null}

      <div
        ref={wrapperRef}
        className="relative mx-auto overflow-hidden rounded-xl border-2 border-dashed border-border/70 bg-white"
        style={{ width: "100%", maxWidth: canvasCssSize.width }}
      >
        <canvas ref={bgCanvasRef} className="block w-full" style={{ height: "auto" }} />
        <canvas
          ref={drawCanvasRef}
          className={cn(
            "absolute inset-0 block w-full",
            readOnly ? "cursor-default" : tool === "text" ? "cursor-text" : "cursor-crosshair",
          )}
          style={{ height: "auto", touchAction: "none" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerLeave={finishStroke}
          onPointerCancel={finishStroke}
        />
        {renderingPage ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <Loader2 className="h-5 w-5 animate-spin text-muted" />
          </div>
        ) : null}
        {textEditor ? (
          <div
            className="absolute z-10 grid gap-1 rounded-lg border border-border bg-white p-1.5 shadow-lg"
            style={{ left: textEditor.cssX, top: textEditor.cssY }}
          >
            <textarea
              autoFocus
              rows={2}
              value={textEditor.value}
              onChange={(event) =>
                setTextEditor((current) => (current ? { ...current, value: event.target.value } : current))
              }
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  cancelTextEditor();
                } else if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  commitTextEditor();
                }
              }}
              style={{ color: penColor }}
              className="w-48 resize-none rounded border border-border/70 bg-white p-1.5 text-sm outline-none"
              placeholder="Wpisz tekst…"
            />
            <div className="flex items-center justify-end gap-1">
              <Button type="button" size="sm" variant="ghost" onClick={cancelTextEditor}>
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" size="sm" onClick={commitTextEditor}>
                <Check className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      {!readOnly ? (
        <p className="text-center text-[11px] text-muted">
          Pisz/rysuj rysikiem lub palcem, użyj gumki do poprawek albo wstaw pole tekstowe — zapisuje się automatycznie.
        </p>
      ) : null}
    </div>
  );
}
