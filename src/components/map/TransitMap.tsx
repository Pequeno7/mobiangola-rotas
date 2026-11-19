/**
 * OpenStreetMap map built on Leaflet. Leaflet touches `window` on import, so it is
 * loaded dynamically after mount — this module is safe to import from SSR routes.
 */
import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { cn } from "@/lib/utils";
import type { LineKind } from "@/components/trip/transport";

export interface MapLine {
  id: string;
  points: [number, number][];
  kind: LineKind;
  faded?: boolean;
  label?: string;
}

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  kind: "origin" | "destination" | "transfer" | "stop";
  label: string;
}

interface Props {
  lines?: MapLine[];
  markers?: MapMarker[];
  center: [number, number];
  zoom?: number;
  className?: string;
  onMarkerClick?: (id: string) => void;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function TransitMap({ lines = [], markers = [], center, zoom = 12, className, onMarkerClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const clickRef = useRef(onMarkerClick);
  clickRef.current = onMarkerClick;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((mod) => {
      const L = (mod as unknown as { default?: typeof Leaflet }).default ?? (mod as typeof Leaflet);
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true }).setView(center, zoom);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady(true);
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!ready || !L || !map || !layer) return;
    layer.clearLayers();

    const boundsPoints: [number, number][] = [];
    // Faded lines first so highlighted ones draw on top.
    for (const line of [...lines].sort((a, b) => Number(!!b.faded) - Number(!!a.faded))) {
      const poly = L.polyline(line.points, {
        className: cn("map-leg", `map-leg-${line.kind}`, line.faded && "map-leg-faded"),
      });
      if (line.label) poly.bindTooltip(line.label, { sticky: true });
      poly.addTo(layer);
      if (!line.faded) boundsPoints.push(...line.points);
    }

    for (const m of markers) {
      let marker: Leaflet.Layer;
      if (m.kind === "stop") {
        marker = L.circleMarker([m.lat, m.lng], { radius: 6, className: "map-stop" });
      } else {
        const letter = m.kind === "origin" ? "A" : m.kind === "destination" ? "B" : "⇄";
        const size = m.kind === "transfer" ? 26 : 30;
        marker = L.marker([m.lat, m.lng], {
          icon: L.divIcon({
            className: "",
            html: `<div class="map-pin map-pin-${m.kind}"><span>${letter}</span></div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size + 4],
            popupAnchor: [0, -size],
          }),
          zIndexOffset: m.kind === "transfer" ? 500 : 1000,
        });
      }
      marker.bindPopup(`<strong>${escapeHtml(m.label)}</strong>`);
      marker.on("click", () => clickRef.current?.(m.id));
      marker.addTo(layer);
      boundsPoints.push([m.lat, m.lng]);
    }

    if (boundsPoints.length > 1) {
      map.fitBounds(L.latLngBounds(boundsPoints), { padding: [32, 32], maxZoom: 15 });
    } else if (boundsPoints.length === 1) {
      map.setView(boundsPoints[0]!, 15);
    }
  }, [ready, lines, markers]);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Mapa"
      className={cn("relative z-0 h-64 w-full overflow-hidden bg-muted", className)}
    />
  );
}
