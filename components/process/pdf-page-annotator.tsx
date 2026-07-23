"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Loader2,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Stamp,
  Trash2,
  Type,
  X,
} from "lucide-react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import { Button } from "@/components/ui/button";
import type { ProtocolOverlayItem } from "@/lib/process/protocol-types";
import { cn } from "@/lib/utils";

const RENDER_WIDTH = 760;
const MIN_ZOOM_WIDTH = 420;
const MAX_ZOOM_WIDTH = 1500;
const ZOOM_STEP = 140;
const ERASER_WIDTH = 22;
const DEFAULT_FONT_SIZE_RATIO = 0.022;
const DEFAULT_SIGNATURE_WIDTH_RATIO = 0.22;
const DRAG_THRESHOLD_PX = 4;

type Tool = "pen" | "eraser" | "text" | "stamp-company" | "stamp-client";

const PEN_COLORS = [
  { value: "#dc2626", label: "Czerwony" },
  { value: "#111827", label: "Czarny" },
  { value: "#2563eb", label: "Niebieski" },
  { value: "#16a34a", label: "Zielony" },
  { value: "#ea580c", label: "Pomarańczowy" },
];

const PEN_WIDTHS = [
  { value: 1.5, label: "Cienki" },
  { value: 3, label: "Średni" },
  { value: 5, label: "Gruby" },
  { value: 8, label: "Bardzo gruby" },
];

type TextEditorState = {
  /** `null` = tworzenie nowego pola tekstowego, w przeciwnym razie edycja istniejącego elementu. */
  id: string | null;
  page: number;
  xRatio: number;
  yRatio: number;
  cssX: number;
  cssY: number;
  value: string;
  color: string;
};

type DragState = {
  itemId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startXRatio: number;
  startYRatio: number;
  moved: boolean;
};

type PdfPageAnnotatorProps = {
  pdfUrl: string;
  /** Podpisane URL-e istniejących adnotacji (PNG) per numer strony (1-indeksowane). */
  annotationUrlsByPage: Record<number, string>;
  /** Wywoływane po dokończeniu pociągnięcia / wyczyszczeniu strony — `null` usuwa adnotację. */
  onSaveAnnotation: (page: number, dataUrl: string | null) => Promise<void>;
  /** Pola tekstowe i umieszczone podpisy na stronach wzoru (dane strukturalne, edytowalne). */
  overlayItems?: ProtocolOverlayItem[];
  onSaveOverlayItems?: (items: ProtocolOverlayItem[]) => Promise<void>;
  /** Data URL złożonego podpisu — pozwala wstawić go jako pieczątkę w wybranym miejscu strony. */
  companySignatureUrl?: string | null;
  clientSignatureUrl?: string | null;
  readOnly?: boolean;
  className?: string;
};

/**
 * Renderuje wzór PDF strona po stronie (pdf.js) z nakładką do odręcznego pisania/rysowania
 * (rysik/palec — pointer events) oraz edytowalnymi elementami strukturalnymi: polami tekstowymi
 * i umieszczonymi w wybranym miejscu podpisami. Optymalizowane pod tablet: strony renderowane
 * w logicznej rozdzielczości sterowanej poziomem przybliżenia, współrzędne zawsze przeliczane
 * względem faktycznego rozmiaru na ekranie.
 */
export function PdfPageAnnotator({
  pdfUrl,
  annotationUrlsByPage,
  onSaveAnnotation,
  overlayItems = [],
  onSaveOverlayItems,
  companySignatureUrl,
  clientSignatureUrl,
  readOnly = false,
  className,
}: PdfPageAnnotatorProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const drawingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const penDetectedRef = useRef(false);
  const strokedRef = useRef(false);
  const hasContentRef = useRef(false);
  const dirtyRef = useRef(false);
  const currentPageRef = useRef(1);
  const ratioRef = useRef(1);
  const saveTimeoutRef = useRef<number | null>(null);
  const overlaySaveTimeoutRef = useRef<number | null>(null);
  const overlayDirtyRef = useRef(false);
  const itemsRef = useRef<ProtocolOverlayItem[]>(overlayItems);
  const dragStateRef = useRef<DragState | null>(null);
  const skipNextRenderRef = useRef(false);
  const lastRenderNavSignatureRef = useRef("");

  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [renderingPage, setRenderingPage] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoomWidth, setZoomWidth] = useState(RENDER_WIDTH);
  const [maxZoomWidth, setMaxZoomWidth] = useState(MAX_ZOOM_WIDTH);
  const [canvasCssSize, setCanvasCssSize] = useState({ width: RENDER_WIDTH, height: Math.round(RENDER_WIDTH * 1.414) });
  const [tool, setTool] = useState<Tool>("pen");
  const [penColor, setPenColor] = useState(PEN_COLORS[0].value);
  const [penWidth, setPenWidth] = useState(PEN_WIDTHS[1].value);
  const [textEditor, setTextEditor] = useState<TextEditorState | null>(null);
  const [items, setItems] = useState<ProtocolOverlayItem[]>(overlayItems);

  const annotationUrlsKey = JSON.stringify(annotationUrlsByPage);
  const overlayItemsKey = JSON.stringify(overlayItems);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    setItems(overlayItems);
    itemsRef.current = overlayItems;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayItemsKey]);

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
    try {
      // Zapis odświeży `annotationUrlsByPage` u rodzica (nowy podpisany URL tego samego pliku) —
      // płótno już pokazuje dokładnie to, co właśnie zapisaliśmy, więc pomijamy zbędne
      // przerysowanie strony, żeby uniknąć widocznego "odświeżenia"/przesunięcia po puszczeniu rysika.
      // Zapis dzieje się w tle — celowo bez widocznego wskaźnika "Zapisywanie…", żeby nie
      // powodować przeskoku układu paska narzędzi.
      skipNextRenderRef.current = true;
      await onSaveAnnotation(currentPageRef.current, dataUrl);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać adnotacji.");
    }
  }, [onSaveAnnotation, readOnly]);

  const flushOverlaySave = useCallback(async () => {
    if (!overlayDirtyRef.current || readOnly || !onSaveOverlayItems) {
      return;
    }
    overlayDirtyRef.current = false;
    try {
      await onSaveOverlayItems(itemsRef.current);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać elementów strony.");
    }
  }, [onSaveOverlayItems, readOnly]);

  function commitItems(next: ProtocolOverlayItem[], { immediate = false }: { immediate?: boolean } = {}) {
    setItems(next);
    itemsRef.current = next;
    overlayDirtyRef.current = true;
    if (overlaySaveTimeoutRef.current) {
      window.clearTimeout(overlaySaveTimeoutRef.current);
      overlaySaveTimeoutRef.current = null;
    }
    if (immediate) {
      void flushOverlaySave();
    } else {
      overlaySaveTimeoutRef.current = window.setTimeout(() => {
        void flushOverlaySave();
      }, 600);
    }
  }

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
      if (overlaySaveTimeoutRef.current) {
        window.clearTimeout(overlaySaveTimeoutRef.current);
      }
      void flushSave();
      void flushOverlaySave();
    };
  }, [flushSave, flushOverlaySave]);

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

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || typeof ResizeObserver === "undefined") {
      return;
    }
    // Ogranicza maksymalne przybliżenie do faktycznie widocznej szerokości — w przeciwnym razie
    // dokument mógłby się poszerzyć poza ekran, a płótno (touch-action: none) blokuje przewijanie
    // dotykiem, więc nie dałoby się już wrócić do reszty strony.
    const updateMax = (width: number) => {
      setMaxZoomWidth(Math.max(MIN_ZOOM_WIDTH, Math.min(MAX_ZOOM_WIDTH, Math.floor(width))));
    };
    updateMax(container.clientWidth);
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) {
        updateMax(width);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setZoomWidth((current) => Math.min(current, maxZoomWidth));
  }, [maxZoomWidth]);

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
      const cssWidth = zoomWidth;
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
  }, [annotationUrlsKey, zoomWidth]);

  useEffect(() => {
    if (numPages > 0) {
      // `renderCurrentPage` też zmienia tożsamość, gdy zmieni się `annotationUrlsByPage` (np. echo
      // naszego własnego zapisu z nowym podpisanym URL-em tego samego pliku) — w takim wypadku
      // płótno ma już poprawną zawartość, więc pomijamy przerysowanie, chyba że realnie zmieniła
      // się strona lub przybliżenie.
      const navSignature = `${currentPage}:${zoomWidth}`;
      const isRealNavigation = lastRenderNavSignatureRef.current !== navSignature;
      lastRenderNavSignatureRef.current = navSignature;
      if (!isRealNavigation && skipNextRenderRef.current) {
        skipNextRenderRef.current = false;
        return;
      }
      skipNextRenderRef.current = false;
      void renderCurrentPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  function getCssRatio(clientX: number, clientY: number) {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return { xRatio: 0, yRatio: 0, cssX: 0, cssY: 0 };
    }
    const rect = wrapper.getBoundingClientRect();
    const cssX = clientX - rect.left;
    const cssY = clientY - rect.top;
    return {
      xRatio: Math.min(1, Math.max(0, cssX / canvasCssSize.width)),
      yRatio: Math.min(1, Math.max(0, cssY / canvasCssSize.height)),
      cssX,
      cssY,
    };
  }

  function openNewTextEditor(clientX: number, clientY: number) {
    const { xRatio, yRatio, cssX, cssY } = getCssRatio(clientX, clientY);
    setTextEditor({ id: null, page: currentPage, xRatio, yRatio, cssX, cssY, value: "", color: penColor });
  }

  function openEditForItem(item: ProtocolOverlayItem) {
    if (readOnly || item.kind !== "text") {
      return;
    }
    setTextEditor({
      id: item.id,
      page: item.page,
      xRatio: item.xRatio,
      yRatio: item.yRatio,
      cssX: item.xRatio * canvasCssSize.width,
      cssY: item.yRatio * canvasCssSize.height,
      value: item.text ?? "",
      color: item.color ?? penColor,
    });
  }

  function commitTextEditor() {
    setTextEditor((current) => {
      if (!current) {
        return null;
      }
      const text = current.value.trim();
      if (current.id) {
        if (!text) {
          commitItems(itemsRef.current.filter((entry) => entry.id !== current.id));
        } else {
          commitItems(
            itemsRef.current.map((entry) =>
              entry.id === current.id ? { ...entry, text, color: current.color } : entry,
            ),
          );
        }
      } else if (text) {
        const newItem: ProtocolOverlayItem = {
          id: crypto.randomUUID(),
          page: current.page,
          xRatio: current.xRatio,
          yRatio: current.yRatio,
          kind: "text",
          text,
          color: current.color,
          fontSizeRatio: DEFAULT_FONT_SIZE_RATIO,
        };
        commitItems([...itemsRef.current, newItem]);
      }
      return null;
    });
  }

  function cancelTextEditor() {
    setTextEditor(null);
  }

  function removeItem(id: string) {
    commitItems(
      itemsRef.current.filter((entry) => entry.id !== id),
      { immediate: true },
    );
  }

  function placeSignatureStamp(clientX: number, clientY: number, which: "company" | "client") {
    const { xRatio, yRatio } = getCssRatio(clientX, clientY);
    const newItem: ProtocolOverlayItem = {
      id: crypto.randomUUID(),
      page: currentPage,
      xRatio,
      yRatio,
      kind: "signature",
      which,
      widthRatio: DEFAULT_SIGNATURE_WIDTH_RATIO,
    };
    commitItems([...itemsRef.current, newItem], { immediate: true });
    setTool("pen");
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
      openNewTextEditor(event.clientX, event.clientY);
      return;
    }
    if (tool === "stamp-company" || tool === "stamp-client") {
      placeSignatureStamp(event.clientX, event.clientY, tool === "stamp-company" ? "company" : "client");
      return;
    }
    if (event.pointerType === "pen") {
      // Rysik wykryty — od teraz ignorujemy dotyk palcem (odłożona dłoń) na tej stronie.
      penDetectedRef.current = true;
    } else if (event.pointerType === "touch" && penDetectedRef.current) {
      return;
    }
    if (drawingRef.current) {
      // Kreska już trwa z innego wskaźnika — nie pozwól kolejnemu dotknięciu jej przejąć.
      return;
    }
    const ctx = drawCanvasRef.current?.getContext("2d");
    if (!ctx) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerIdRef.current = event.pointerId;
    drawingRef.current = true;
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = penColor;
    ctx.lineWidth = (tool === "eraser" ? ERASER_WIDTH : penWidth) * ratioRef.current;
    const { x, y } = getPoint(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || event.pointerId !== activePointerIdRef.current) {
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

  function finishStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || event.pointerId !== activePointerIdRef.current) {
      return;
    }
    drawingRef.current = false;
    activePointerIdRef.current = null;
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

  function handleItemPointerDown(event: React.PointerEvent<HTMLDivElement>, item: ProtocolOverlayItem) {
    if (readOnly) {
      return;
    }
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      itemId: item.id,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startXRatio: item.xRatio,
      startYRatio: item.yRatio,
      moved: false,
    };
  }

  function handleItemPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragStateRef.current;
    if (!drag) {
      return;
    }
    const deltaX = event.clientX - drag.startClientX;
    const deltaY = event.clientY - drag.startClientY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD_PX) {
      return;
    }
    drag.moved = true;
    const nextXRatio = Math.min(1, Math.max(0, drag.startXRatio + deltaX / canvasCssSize.width));
    const nextYRatio = Math.min(1, Math.max(0, drag.startYRatio + deltaY / canvasCssSize.height));
    const next = itemsRef.current.map((entry) =>
      entry.id === drag.itemId ? { ...entry, xRatio: nextXRatio, yRatio: nextYRatio } : entry,
    );
    itemsRef.current = next;
    setItems(next);
  }

  function handleItemPointerUp(event: React.PointerEvent<HTMLDivElement>, item: ProtocolOverlayItem) {
    const drag = dragStateRef.current;
    dragStateRef.current = null;
    if (!drag || drag.itemId !== item.id) {
      return;
    }
    if (drag.moved) {
      commitItems(itemsRef.current);
    } else if (item.kind === "text") {
      openEditForItem(item);
    }
  }

  if (loadingDoc) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-surface-muted/20 p-6 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Wczytywanie wzoru PDF…
      </div>
    );
  }

  const currentPageItems = items.filter((entry) => entry.page === currentPage);
  const zoomPercent = Math.round((zoomWidth / RENDER_WIDTH) * 100);

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
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={zoomWidth <= MIN_ZOOM_WIDTH || renderingPage}
            onClick={() => setZoomWidth((current) => Math.max(MIN_ZOOM_WIDTH, current - ZOOM_STEP))}
            title="Pomniejsz"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="min-w-[44px] text-center text-xs text-muted">{zoomPercent}%</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={zoomWidth >= maxZoomWidth || renderingPage}
            onClick={() => setZoomWidth((current) => Math.min(maxZoomWidth, current + ZOOM_STEP))}
            title="Powiększ"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          {zoomWidth !== RENDER_WIDTH ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setZoomWidth(RENDER_WIDTH)}
              title="Przywróć domyślny rozmiar"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {!readOnly ? (
            <Button type="button" size="sm" variant="outline" disabled={isEmpty} onClick={handleClearPage}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Wyczyść odręczne pismo
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
              title="Wstaw pole tekstowe (kliknij istniejące, aby edytować)"
            >
              <Type className="h-3.5 w-3.5" />
            </Button>
          </div>
          {onSaveOverlayItems ? (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant={tool === "stamp-company" ? "default" : "outline"}
                disabled={!companySignatureUrl}
                onClick={() => {
                  commitTextEditor();
                  setTool("stamp-company");
                }}
                title={
                  companySignatureUrl
                    ? "Wstaw podpis firmy w wybranym miejscu na stronie"
                    : "Najpierw złóż podpis firmy poniżej"
                }
              >
                <Stamp className="mr-1.5 h-3.5 w-3.5" />
                Podpis firmy
              </Button>
              <Button
                type="button"
                size="sm"
                variant={tool === "stamp-client" ? "default" : "outline"}
                disabled={!clientSignatureUrl}
                onClick={() => {
                  commitTextEditor();
                  setTool("stamp-client");
                }}
                title={
                  clientSignatureUrl
                    ? "Wstaw podpis klienta w wybranym miejscu na stronie"
                    : "Najpierw złóż podpis klienta poniżej"
                }
              >
                <Stamp className="mr-1.5 h-3.5 w-3.5" />
                Podpis klienta
              </Button>
            </div>
          ) : null}
          {tool !== "eraser" && tool !== "stamp-company" && tool !== "stamp-client" ? (
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
          {tool === "pen" ? (
            <div className="flex items-center gap-1">
              {PEN_WIDTHS.map((widthOption) => (
                <button
                  key={widthOption.value}
                  type="button"
                  title={widthOption.label}
                  onClick={() => setPenWidth(widthOption.value)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md border transition",
                    penWidth === widthOption.value
                      ? "border-foreground bg-surface-muted/40"
                      : "border-border/50",
                  )}
                >
                  <span
                    className="rounded-full"
                    style={{
                      width: Math.round(widthOption.value * 2),
                      height: Math.round(widthOption.value * 2),
                      backgroundColor: penColor,
                    }}
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="text-xs text-rose-400">{error}</p> : null}

      <div ref={scrollContainerRef} className="overflow-x-auto">
        <div
          ref={wrapperRef}
          className="relative mx-auto overflow-hidden rounded-xl border-2 border-dashed border-border/70 bg-white"
          style={{ width: canvasCssSize.width, maxWidth: "none" }}
        >
          <canvas ref={bgCanvasRef} className="block w-full" style={{ height: "auto" }} />
          <canvas
            ref={drawCanvasRef}
            className={cn(
              "absolute inset-0 block w-full",
              readOnly
                ? "cursor-default"
                : tool === "text"
                  ? "cursor-text"
                  : tool === "stamp-company" || tool === "stamp-client"
                    ? "cursor-copy"
                    : "cursor-crosshair",
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

          {currentPageItems.map((item) => {
            if (textEditor?.id === item.id) {
              return null;
            }
            if (item.kind === "signature") {
              const imageUrl = item.which === "company" ? companySignatureUrl : clientSignatureUrl;
              const width = (item.widthRatio ?? DEFAULT_SIGNATURE_WIDTH_RATIO) * canvasCssSize.width;
              return (
                <div
                  key={item.id}
                  className={cn(
                    "group absolute rounded-md border border-dashed border-accent/50 bg-white/70 p-1",
                    !readOnly && "cursor-move",
                  )}
                  style={{ left: item.xRatio * canvasCssSize.width, top: item.yRatio * canvasCssSize.height, width }}
                  onPointerDown={(event) => handleItemPointerDown(event, item)}
                  onPointerMove={handleItemPointerMove}
                  onPointerUp={(event) => handleItemPointerUp(event, item)}
                  onPointerCancel={() => {
                    dragStateRef.current = null;
                  }}
                >
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="Podpis" className="pointer-events-none w-full object-contain" draggable={false} />
                  ) : (
                    <p className="text-center text-[10px] text-muted">
                      {item.which === "company" ? "Podpis firmy" : "Podpis klienta"} — brak
                    </p>
                  )}
                  {!readOnly ? (
                    <button
                      type="button"
                      title="Usuń podpis z tego miejsca"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeItem(item.id);
                      }}
                      className="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full border border-border bg-white text-muted shadow group-hover:flex"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>
              );
            }
            const fontSize = (item.fontSizeRatio ?? DEFAULT_FONT_SIZE_RATIO) * canvasCssSize.height;
            return (
              <div
                key={item.id}
                className={cn("group absolute max-w-[80%]", !readOnly && "cursor-move")}
                style={{ left: item.xRatio * canvasCssSize.width, top: item.yRatio * canvasCssSize.height }}
                onPointerDown={(event) => handleItemPointerDown(event, item)}
                onPointerMove={handleItemPointerMove}
                onPointerUp={(event) => handleItemPointerUp(event, item)}
                onPointerCancel={() => {
                  dragStateRef.current = null;
                }}
              >
                <span
                  className="whitespace-pre-wrap break-words rounded px-0.5"
                  style={{ color: item.color ?? penColor, fontSize, lineHeight: 1.25 }}
                >
                  {item.text}
                </span>
                {!readOnly ? (
                  <button
                    type="button"
                    title="Usuń pole tekstowe"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeItem(item.id);
                    }}
                    className="absolute -right-3 -top-3 hidden h-5 w-5 items-center justify-center rounded-full border border-border bg-white text-muted shadow group-hover:flex"
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </div>
            );
          })}

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
                style={{ color: textEditor.color }}
                className="w-48 resize-none rounded border border-border/70 bg-white p-1.5 text-sm outline-none"
                placeholder="Wpisz tekst…"
              />
              <div className="flex items-center gap-1.5">
                {PEN_COLORS.map((colorOption) => (
                  <button
                    key={colorOption.value}
                    type="button"
                    title={colorOption.label}
                    onClick={() =>
                      setTextEditor((current) => (current ? { ...current, color: colorOption.value } : current))
                    }
                    className={cn(
                      "h-4 w-4 rounded-full border-2 transition",
                      textEditor.color === colorOption.value ? "border-foreground scale-110" : "border-border/50",
                    )}
                    style={{ backgroundColor: colorOption.value }}
                  />
                ))}
              </div>
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
      </div>
      {!readOnly ? (
        <p className="text-center text-[11px] text-muted">
          Pisz/rysuj rysikiem lub palcem, użyj gumki do poprawek, wstaw pole tekstowe (kliknij, aby edytować) albo
          złożony podpis w wybranym miejscu — przeciągnij, aby przesunąć. Zapisuje się automatycznie. Po pierwszym
          dotknięciu rysikiem dotyk dłonią jest ignorowany — można swobodnie oprzeć rękę na ekranie.
        </p>
      ) : null}
    </div>
  );
}
