const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function nearestStop<T extends { lat: number; lng: number }>(
  point: { lat: number; lng: number },
  stops: Iterable<T>,
): { stop: T; distanceKm: number } | null {
  let best: { stop: T; distanceKm: number } | null = null;
  for (const stop of stops) {
    const d = haversineKm(point, stop);
    if (!best || d < best.distanceKm) best = { stop, distanceKm: d };
  }
  return best;
}
