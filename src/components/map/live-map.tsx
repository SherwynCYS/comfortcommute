import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapBus = {
  id: string;
  serviceNo: string;
  lat: number;
  lng: number;
  etaMinutes: number | null;
  load: string | null;
};

export type MapStop = {
  code: string;
  name: string;
  lat: number;
  lng: number;
  active?: boolean;
};

export type MapIncident = {
  id: string;
  type: string;
  lat: number;
  lng: number;
};

type Props = {
  center: { lat: number; lng: number };
  buses: MapBus[];
  stops: MapStop[];
  incidents?: MapIncident[];
  routeLine?: { lat: number; lng: number }[];
  onSelectStop?: (code: string) => void;
};

const BUS_GLYPH = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6v6M15 6v6M2 12h19.6M18 18h.01M6 18h.01"/><path d="M4 6a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/></svg>`;

function busIcon(bus: MapBus) {
  const loadClass = bus.load === "LSD" ? "is-crowded" : bus.load === "SDA" ? "is-standing" : "is-seated";
  return L.divIcon({
    className: "cc-map-marker",
    html: `<div class="cc-bus-marker ${loadClass}"><span class="cc-bus-icon">${BUS_GLYPH}</span><strong>${bus.serviceNo}</strong>${bus.etaMinutes !== null ? `<span class="cc-bus-eta">${bus.etaMinutes <= 0 ? "Arr" : `${bus.etaMinutes}m`}</span>` : ""}</div>`,
    iconSize: [0, 0],
  });
}


function stopIcon(stop: MapStop) {
  const size = stop.active ? 16 : 11;
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;transform:translate(-50%,-50%);
      border-radius:50%;background:${stop.active ? "var(--primary)" : "#fff"};
      border:3px solid ${stop.active ? "#fff" : "var(--primary)"};
      box-shadow:0 2px 8px rgba(0,0,0,.25)"></div>`,
    iconSize: [0, 0],
  });
}

function incidentIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="transform:translate(-50%,-50%);font-size:18px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.3))">⚠️</div>`,
    iconSize: [0, 0],
  });
}

export default function LiveMap({ center, buses, stops, incidents = [], routeLine = [], onSelectStop }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false, attributionControl: true }).setView(
      [center.lat, center.lng],
      16
    );
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [center.lat, center.lng]);

  useEffect(() => {
    mapRef.current?.setView([center.lat, center.lng], mapRef.current.getZoom(), { animate: true });
  }, [center.lat, center.lng]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (routeLine.length > 1) {
      L.polyline(routeLine.map((point) => [point.lat, point.lng] as L.LatLngTuple), {
        color: "var(--primary)",
        weight: 5,
        opacity: 0.75,
      }).addTo(layer);
    }

    for (const stop of stops) {
      L.marker([stop.lat, stop.lng], { icon: stopIcon(stop) })
        .bindTooltip(stop.name, { direction: "top" })
        .on("click", () => onSelectStop?.(stop.code))
        .addTo(layer);
    }

    for (const incident of incidents) {
      L.marker([incident.lat, incident.lng], { icon: incidentIcon() })
        .bindTooltip(incident.type.replace("_", " "), { direction: "top" })
        .addTo(layer);
    }

    for (const bus of buses) {
      L.marker([bus.lat, bus.lng], { icon: busIcon(bus), zIndexOffset: 500 }).addTo(layer);
    }
  }, [buses, stops, incidents, routeLine, onSelectStop]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute left-3 top-3 z-[500] flex gap-1 rounded-md border border-border bg-background/95 p-1.5 text-[10px] font-semibold text-foreground shadow-soft backdrop-blur">
        <span className="rounded bg-success px-1.5 py-1 text-success-foreground">Seats</span>
        <span className="rounded bg-warning px-1.5 py-1 text-warning-foreground">Standing</span>
        <span className="rounded bg-destructive px-1.5 py-1 text-destructive-foreground">Crowded</span>
      </div>
    </div>
  );
}
