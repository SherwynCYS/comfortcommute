import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { RAIL_STATIONS } from "@/data/mrt-stations";

const LINE_COLORS: Record<string, string> = {
  NS: "#d42e12",
  EW: "#009645",
  NE: "#9900aa",
  CC: "#fa9e0d",
  DT: "#005ec4",
  TE: "#9d5b25",
  BP: "#718472",
  SK: "#718472",
  PG: "#718472",
};

const codeLine = (code: string) => code.match(/^[A-Z]+/)?.[0] ?? "";
const codeNumber = (code: string) => Number(code.match(/\d+/)?.[0] ?? 0);

export default function MrtMap() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false }).setView([1.3521, 103.8198], 11);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);

    for (const [line, color] of Object.entries(LINE_COLORS)) {
      const stations = RAIL_STATIONS.flatMap((station) =>
        station.codes
          .filter((code) => codeLine(code) === line)
          .map((code) => ({ station, code }))
      ).sort((a, b) => codeNumber(a.code) - codeNumber(b.code));
      if (stations.length > 1) {
        L.polyline(stations.map(({ station }) => [station.lat, station.lng] as L.LatLngTuple), {
          color,
          weight: 4,
          opacity: 0.8,
        }).addTo(map);
      }
    }

    for (const station of RAIL_STATIONS) {
      const primaryLine = codeLine(station.codes[0] ?? "");
      const marker = L.circleMarker([station.lat, station.lng], {
        radius: station.codes.length > 1 ? 6 : 4,
        color: "#ffffff",
        weight: 2,
        fillColor: LINE_COLORS[primaryLine] ?? "#64748b",
        fillOpacity: 1,
      });
      marker.bindPopup(`<strong>${station.name}</strong><br>${station.codes.join(" · ")}`);
      marker.bindTooltip(station.name, { direction: "top" });
      marker.addTo(map);
    }

    return () => map.remove();
  }, []);

  return <div ref={containerRef} className="h-full w-full" aria-label="Interactive Singapore MRT and LRT map" />;
}