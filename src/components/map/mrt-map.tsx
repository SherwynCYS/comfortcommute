import { useState } from "react";
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MrtMap() {
  const [zoom, setZoom] = useState(1);
  const changeZoom = (amount: number) => setZoom((value) => Math.min(3, Math.max(1, value + amount)));

  return (
    <div className="relative h-full w-full overflow-auto bg-card" aria-label="Official Singapore MRT and LRT system map">
      <div className="flex min-h-full min-w-full items-center justify-center p-3">
        <img
          src="/assets/singapore-rail-map.png"
          alt="Official Singapore MRT and LRT system map"
          draggable={false}
          className="max-w-none select-none transition-[width] duration-200"
          style={{ width: `${zoom * 100}%` }}
        />
      </div>
      <div className="sticky bottom-3 ml-auto mr-3 flex w-fit items-center gap-1 rounded-md border border-border bg-background/95 p-1 shadow-lift backdrop-blur">
        <Button size="icon" variant="ghost" onClick={() => changeZoom(-0.5)} disabled={zoom <= 1} aria-label="Zoom out"><Minus /></Button>
        <span className="w-10 text-center text-xs font-semibold">{Math.round(zoom * 100)}%</span>
        <Button size="icon" variant="ghost" onClick={() => changeZoom(0.5)} disabled={zoom >= 3} aria-label="Zoom in"><Plus /></Button>
        <Button size="icon" variant="ghost" onClick={() => setZoom(1)} aria-label="Reset map"><RotateCcw /></Button>
        <Button size="icon" variant="ghost" onClick={() => document.fullscreenElement ? document.exitFullscreen() : document.querySelector('[aria-label="Official Singapore MRT and LRT system map"]')?.requestFullscreen()} aria-label="Toggle full screen"><Maximize2 /></Button>
      </div>
    </div>
  );
}