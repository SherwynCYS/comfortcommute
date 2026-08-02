import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;

type Point = { x: number; y: number };

export default function MrtMap() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const pointers = useRef<Map<number, Point>>(new Map());
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);
  const dragStart = useRef<{ p: Point; offset: Point } | null>(null);
  const lastTap = useRef(0);

  const clamp = useCallback((next: Point, z: number): Point => {
    const el = wrapRef.current;
    if (!el) return next;
    const maxX = (el.clientWidth * (z - 1)) / 2 + 40;
    const maxY = (el.clientHeight * (z - 1)) / 2 + 40;
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }, []);

  const zoomBy = useCallback(
    (factor: number) => {
      setZoom((z) => {
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor));
        setOffset((o) => clamp({ x: (o.x / z) * next, y: (o.y / z) * next }, next));
        return next;
      });
    },
    [clamp],
  );

  const reset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const onPointerDown = (event: React.PointerEvent) => {
    (event.target as Element).setPointerCapture?.(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 1) {
      dragStart.current = { p: { x: event.clientX, y: event.clientY }, offset };
      const now = Date.now();
      if (now - lastTap.current < 300) zoomBy(zoom >= MAX_ZOOM ? MIN_ZOOM / zoom : 1.8);
      lastTap.current = now;
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = { dist: Math.hypot(a!.x - b!.x, a!.y - b!.y), zoom };
      dragStart.current = null;
    }
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      const next = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, (pinchStart.current.zoom * dist) / pinchStart.current.dist),
      );
      setZoom(next);
      setOffset((o) => clamp(o, next));
      return;
    }

    if (dragStart.current) {
      const dx = event.clientX - dragStart.current.p.x;
      const dy = event.clientY - dragStart.current.p.y;
      setOffset(clamp({ x: dragStart.current.offset.x + dx, y: dragStart.current.offset.y + dy }, zoom));
    }
  };

  const endPointer = (event: React.PointerEvent) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) dragStart.current = null;
  };

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomBy(event.deltaY < 0 ? 1.12 : 1 / 1.12);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  const toggleFullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full touch-none overflow-hidden bg-card"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onPointerLeave={endPointer}
      role="application"
      aria-label="Interactive Singapore MRT and LRT system map"
    >
      <img
        src="/assets/singapore-rail-map.png"
        alt="Official Singapore MRT and LRT system map"
        draggable={false}
        className="pointer-events-none absolute left-1/2 top-1/2 h-auto w-full max-w-none select-none"
        style={{
          transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          transformOrigin: "center",
          transition: dragStart.current || pinchStart.current ? "none" : "transform 140ms ease-out",
        }}
      />

      <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-background/90 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground shadow-soft backdrop-blur">
        Drag to move · pinch or use + / − to zoom
      </div>

      <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-xl border border-border bg-background/95 p-1 shadow-lift backdrop-blur">
        <Button size="icon" variant="ghost" onClick={() => zoomBy(1 / 1.5)} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out">
          <Minus />
        </Button>
        <span className="w-12 text-center text-xs font-semibold tabular-nums">{Math.round(zoom * 100)}%</span>
        <Button size="icon" variant="ghost" onClick={() => zoomBy(1.5)} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in">
          <Plus />
        </Button>
        <Button size="icon" variant="ghost" onClick={reset} aria-label="Reset map view">
          <RotateCcw />
        </Button>
        <Button size="icon" variant="ghost" onClick={toggleFullscreen} aria-label="Toggle full screen map">
          <Maximize2 />
        </Button>
      </div>
    </div>
  );
}
