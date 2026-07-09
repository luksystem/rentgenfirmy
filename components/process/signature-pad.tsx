"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Podpis rysowany palcem/rysikiem/myszą (pointer events — działa na tablecie). */
export function SignaturePad({
  onChange,
  height = 160,
  className,
}: {
  /** Wywoływane po każdym pociągnięciu z aktualnym PNG (data URL) albo null gdy pusto. */
  onChange?: (dataUrl: string | null) => void;
  height?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const hasStrokeRef = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  function getContext() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }
    return canvas.getContext("2d");
  }

  function resizeCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ratio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    const ctx = getContext();
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.25;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1f2937";
    }
  }

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { x: 0, y: 0 };
    }
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = getContext();
    if (!ctx) {
      return;
    }
    // Canvas nie jest domyślnie fokusowalny — po puszczeniu myszy focus wraca do <body>,
    // co w oknach modalnych (Radix Dialog, FocusScope) wymusza przeniesienie fokusu
    // z powrotem do dialogu i wywołuje przemalowanie, które potrafi "wyczyścić" widok
    // canvasu (podpis znika po puszczeniu myszki — tylko na desktopie, dotyk tego nie robi).
    // Trzymanie fokusu na samym canvasie przez cały gest zapobiega temu przeskokowi.
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    const { x, y } = pointFromEvent(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) {
      return;
    }
    const ctx = getContext();
    if (!ctx) {
      return;
    }
    const { x, y } = pointFromEvent(event);
    ctx.lineTo(x, y);
    ctx.stroke();
    hasStrokeRef.current = true;
    if (isEmpty) {
      setIsEmpty(false);
    }
  }

  function finishStroke() {
    if (!drawingRef.current) {
      return;
    }
    drawingRef.current = false;
    if (hasStrokeRef.current) {
      onChange?.(canvasRef.current?.toDataURL("image/png") ?? null);
    }
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) {
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasStrokeRef.current = false;
    setIsEmpty(true);
    onChange?.(null);
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-border/70 bg-white">
        <canvas
          ref={canvasRef}
          tabIndex={-1}
          style={{ height, touchAction: "none", outline: "none" }}
          className="block w-full cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerLeave={finishStroke}
          onPointerCancel={finishStroke}
        />
        {isEmpty ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-400">
            Podpisz palcem, rysikiem lub myszą
          </p>
        ) : null}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={handleClear} disabled={isEmpty}>
        <Eraser className="mr-1.5 h-3.5 w-3.5" />
        Wyczyść
      </Button>
    </div>
  );
}
