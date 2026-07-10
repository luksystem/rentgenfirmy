"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Point = { x: number; y: number };

/**
 * Podpis rysowany palcem/rysikiem/myszą (pointer events).
 *
 * Rysunek jest renderowany jako SVG kontrolowane przez React (nie bitmapa `<canvas>`),
 * bo bitmapa canvasu potrafiła się "czyścić" po puszczeniu myszy wewnątrz modala (Radix
 * Dialog) — samo trzymanie focusu na canvasie nie usuwało tego do końca. SVG jako drzewo
 * React nie ma tego problemu: punkty trzymamy w ref i wymuszamy przerysowanie licznikiem,
 * a do PNG (na potrzeby zapisu/PDF) rastrujemy dopiero na końcu, na osobnym, niewidocznym
 * canvasie tworzonym ad-hoc.
 */
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const strokesRef = useRef<Point[][]>([]);
  const drawingRef = useRef(false);
  const [, setRenderTick] = useState(0);
  const [isEmpty, setIsEmpty] = useState(true);
  const [size, setSize] = useState({ width: 300, height });

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const rect = container.getBoundingClientRect();
    setSize({ width: Math.max(1, rect.width), height: Math.max(1, rect.height) });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  function pointFromEvent(event: React.PointerEvent<SVGSVGElement>): Point {
    const container = containerRef.current;
    if (!container) {
      return { x: 0, y: 0 };
    }
    const rect = container.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function rasterize(): string | null {
    const strokes = strokesRef.current;
    if (strokes.length === 0) {
      return null;
    }
    const ratio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(size.width * ratio));
    canvas.height = Math.max(1, Math.round(size.height * ratio));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.25;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1f2937";
    for (const stroke of strokes) {
      if (stroke.length === 0) {
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      if (stroke.length === 1) {
        ctx.lineTo(stroke[0].x + 0.01, stroke[0].y + 0.01);
      } else {
        for (let i = 1; i < stroke.length; i += 1) {
          ctx.lineTo(stroke[i].x, stroke[i].y);
        }
      }
      ctx.stroke();
    }
    return canvas.toDataURL("image/png");
  }

  function handlePointerDown(event: React.PointerEvent<SVGSVGElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    strokesRef.current = [...strokesRef.current, [pointFromEvent(event)]];
    setIsEmpty(false);
    setRenderTick((tick) => tick + 1);
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!drawingRef.current) {
      return;
    }
    const strokes = strokesRef.current;
    const current = strokes[strokes.length - 1];
    if (!current) {
      return;
    }
    current.push(pointFromEvent(event));
    setRenderTick((tick) => tick + 1);
  }

  function finishStroke() {
    if (!drawingRef.current) {
      return;
    }
    drawingRef.current = false;
    onChange?.(rasterize());
  }

  function handleClear() {
    strokesRef.current = [];
    drawingRef.current = false;
    setIsEmpty(true);
    setRenderTick((tick) => tick + 1);
    onChange?.(null);
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-xl border-2 border-dashed border-border/70 bg-white"
        style={{ height }}
      >
        <svg
          viewBox={`0 0 ${size.width} ${size.height}`}
          style={{ touchAction: "none" }}
          className="block h-full w-full cursor-crosshair select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerLeave={finishStroke}
          onPointerCancel={finishStroke}
        >
          {strokesRef.current.map((stroke, index) =>
            stroke.length > 1 ? (
              <polyline
                key={index}
                points={stroke.map((point) => `${point.x},${point.y}`).join(" ")}
                fill="none"
                stroke="#1f2937"
                strokeWidth={2.25}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : stroke.length === 1 ? (
              <circle key={index} cx={stroke[0].x} cy={stroke[0].y} r={1.2} fill="#1f2937" />
            ) : null,
          )}
        </svg>
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
