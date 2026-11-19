import type { MapLine, MapMarker } from "@/components/map/TransitMap";
import type { Itinerary } from "@/lib/routing/types";
import { lineKind, shortTransportName } from "./transport";

export function itineraryLines(it: Itinerary, faded = false): MapLine[] {
  return it.legs.map((leg, i) => ({
    id: `${it.id}#${i}`,
    points: leg.path.map((s) => [s.lat, s.lng] as [number, number]),
    kind: lineKind(leg.route.transportCode),
    faded,
    label: `${shortTransportName(leg.route.transportCode)} ${leg.route.code} → ${leg.route.vehicleDestination}`,
  }));
}

export function itineraryMarkers(it: Itinerary, withIntermediate = false): MapMarker[] {
  const first = it.legs[0]!;
  const last = it.legs[it.legs.length - 1]!;
  const markers: MapMarker[] = [];
  if (withIntermediate) {
    for (const leg of it.legs) {
      for (const s of leg.path.slice(1, -1)) {
        markers.push({ id: `stop-${s.id}`, lat: s.lat, lng: s.lng, kind: "stop", label: s.name });
      }
    }
  }
  it.legs.slice(1).forEach((leg) => {
    markers.push({
      id: `transfer-${leg.board.id}`,
      lat: leg.board.lat,
      lng: leg.board.lng,
      kind: "transfer",
      label: `Transferência: ${leg.board.name}`,
    });
  });
  markers.push({ id: "origin", lat: first.board.lat, lng: first.board.lng, kind: "origin", label: `Origem: ${first.board.name}` });
  markers.push({ id: "destination", lat: last.alight.lat, lng: last.alight.lng, kind: "destination", label: `Destino: ${last.alight.name}` });
  return markers;
}
