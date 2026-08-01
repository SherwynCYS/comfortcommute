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

const loadColor = (load: string | null) =>
  load === "LSD" ? "var(--destructive)" : load === "SDA" ? "#d97706" : "var(--primary)";

function busIcon(bus: MapBus) {
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;gap:4px;transform:translate(-50%,-50%);
      background:${loadColor(bus.load)};color:#fff;font:600 11px/1 'DM Sans',system-ui;
      padding:5px 8px;border-radius:999px;box-shadow:0 4px 14px rgba(0,0,0,.28);white-space:nowrap">
      🚌 ${bus.serviceNo}${bus.etaMinutes !== null ? ` · ${bus.etaMinutes}m` : ""}</div>`,
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

  return <div ref={containerRef} className="h-full w-full" />;
}
