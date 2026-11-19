/**
 * MobiAngola routing engine.
 *
 * Enumerates every itinerary between two registered stops using only registered
 * routes, up to `maxTransfers` transfers. A transfer happens at a shared stop.
 *
 * Rules that reject invalid or redundant combinations:
 *  - a stop is never visited twice (no cycles);
 *  - a route is never used twice;
 *  - boarding only where can_board, alighting only where can_alight, always forward in the route;
 *  - if the current route continues to the destination, the only allowed alighting is the destination;
 *  - a route is not boarded at a stop if it could have been boarded at an earlier stop of the trip.
 *
 * Nothing is invented: unknown times stay null and unknown fares mark the itinerary as incomplete.
 */
import { haversineKm } from "./geo";
import type { Fare, Itinerary, Leg, Network, SearchOptions, SortKey, Stop, TransitRoute } from "./types";

export const DEFAULT_TRANSFER_PENALTY_MIN = 10;
export const MAX_TRANSFERS_LIMIT = 4;

export function resolveFare(
  fares: Fare[],
  routeId: string,
  fromStopId: string,
  toStopId: string,
): Fare | null {
  const forRoute = fares.filter((f) => f.routeId === routeId);
  return (
    forRoute.find((f) => f.fromStopId === fromStopId && f.toStopId === toStopId) ??
    forRoute.find((f) => f.fromStopId === null && f.toStopId === null) ??
    null
  );
}

function buildLeg(network: Network, route: TransitRoute, fromIdx: number, toIdx: number): Leg {
  const slice = route.stops.slice(fromIdx, toIdx + 1);
  const path = slice.map((rs) => network.stops.get(rs.stopId)!).filter(Boolean);
  const from = route.stops[fromIdx]!;
  const to = route.stops[toIdx]!;
  const minutes =
    from.minutesFromStart !== null && to.minutesFromStart !== null
      ? to.minutesFromStart - from.minutesFromStart
      : null;
  const fare = resolveFare(network.fares, route.id, from.stopId, to.stopId);
  let distanceKm = 0;
  for (let i = 1; i < path.length; i++) distanceKm += haversineKm(path[i - 1]!, path[i]!);
  return {
    route,
    board: network.stops.get(from.stopId)!,
    alight: network.stops.get(to.stopId)!,
    path,
    boardingNotes: from.boardingNotes ?? network.stops.get(from.stopId)?.boardingNotes ?? null,
    minutes,
    fareKz: fare ? fare.amountKz : null,
    fareIsDemo: fare?.isDemo ?? false,
    fareVerified: fare?.verified ?? false,
    distanceKm,
  };
}

function summarize(legs: Leg[], transferPenaltyMin: number): Itinerary {
  const transfers = legs.length - 1;
  const allTimed = legs.every((l) => l.minutes !== null);
  const ride = legs.reduce((s, l) => s + (l.minutes ?? 0), 0);
  const fareComplete = legs.every((l) => l.fareKz !== null);
  const id = legs.map((l) => `${l.route.code}:${l.board.id}>${l.alight.id}`).join("|");
  return {
    id,
    legs,
    transfers,
    totalMinutes: allTimed ? ride + transfers * transferPenaltyMin : null,
    totalFareKz: legs.reduce((s, l) => s + (l.fareKz ?? 0), 0),
    fareComplete,
    distanceKm: legs.reduce((s, l) => s + l.distanceKm, 0),
    hasDemoData: legs.some((l) => l.route.isDemo || l.fareIsDemo),
    hasUnverifiedData: legs.some(
      (l) => !l.route.verified || (l.fareKz !== null && !l.fareVerified) || l.path.some((s) => !s.verified),
    ),
  };
}

export function findItineraries(
  network: Network,
  originId: string,
  destinationId: string,
  options: SearchOptions,
): Itinerary[] {
  if (originId === destinationId) return [];
  if (!network.stops.has(originId) || !network.stops.has(destinationId)) return [];

  const maxTransfers = Math.max(0, Math.min(MAX_TRANSFERS_LIMIT, Math.floor(options.maxTransfers)));
  const maxLegs = maxTransfers + 1;
  const penalty = options.transferPenaltyMin ?? DEFAULT_TRANSFER_PENALTY_MIN;
  const maxResults = options.maxResults ?? 100;

  // Index: stopId -> [{route, idx}]
  const servedBy = new Map<string, { route: TransitRoute; idx: number }[]>();
  for (const route of network.routes) {
    route.stops.forEach((rs, idx) => {
      const list = servedBy.get(rs.stopId) ?? [];
      list.push({ route, idx });
      servedBy.set(rs.stopId, list);
    });
  }

  const results: Itinerary[] = [];
  const visited = new Set<string>([originId]);
  const visitedOrder: string[] = [originId];
  const usedRoutes = new Set<string>();
  const legs: Leg[] = [];

  const couldBoardEarlier = (route: TransitRoute, idx: number): boolean => {
    // Any earlier stop of the trip (excluding the current one) where this route could be boarded before idx.
    for (let i = 0; i < visitedOrder.length - 1; i++) {
      const j = route.stops.findIndex((rs) => rs.stopId === visitedOrder[i]);
      if (j !== -1 && j < idx && route.stops[j]!.canBoard) return true;
    }
    return false;
  };

  const explore = (stopId: string) => {
    if (results.length >= maxResults) return;
    for (const { route, idx } of servedBy.get(stopId) ?? []) {
      if (usedRoutes.has(route.id)) continue;
      if (!route.stops[idx]!.canBoard) continue;
      if (couldBoardEarlier(route, idx)) continue;

      const destIdx = route.stops.findIndex((rs, k) => k > idx && rs.stopId === destinationId);
      const reachesDest = destIdx !== -1 && route.stops[destIdx]!.canAlight;

      for (let k = idx + 1; k < route.stops.length; k++) {
        const rs = route.stops[k]!;
        if (visited.has(rs.stopId)) break; // riding through a visited stop would be a cycle
        if (!rs.canAlight) continue;
        if (reachesDest && k !== destIdx) continue; // never leave a route that already reaches the destination

        const leg = buildLeg(network, route, idx, k);
        if (rs.stopId === destinationId) {
          results.push(summarize([...legs, leg], penalty));
          if (results.length >= maxResults) return;
          continue;
        }
        if (legs.length + 1 >= maxLegs) continue;

        legs.push(leg);
        usedRoutes.add(route.id);
        for (const s of leg.path.slice(1)) {
          visited.add(s.id);
          visitedOrder.push(s.id);
        }
        explore(rs.stopId);
        for (const s of leg.path.slice(1)) {
          visited.delete(s.id);
          visitedOrder.pop();
        }
        usedRoutes.delete(route.id);
        legs.pop();
      }
    }
  };

  explore(originId);

  const unique = new Map(results.map((r) => [r.id, r]));
  return sortItineraries([...unique.values()], "duracao");
}

const nullLast = (a: number | null, b: number | null) =>
  a === null && b === null ? 0 : a === null ? 1 : b === null ? -1 : a - b;

export function sortItineraries(list: Itinerary[], key: SortKey): Itinerary[] {
  const price = (i: Itinerary) => (i.fareComplete ? i.totalFareKz : null);
  const cmp: Record<SortKey, (a: Itinerary, b: Itinerary) => number> = {
    preco: (a, b) => nullLast(price(a), price(b)) || nullLast(a.totalMinutes, b.totalMinutes) || a.transfers - b.transfers,
    duracao: (a, b) => nullLast(a.totalMinutes, b.totalMinutes) || a.transfers - b.transfers || nullLast(price(a), price(b)),
    transferencias: (a, b) => a.transfers - b.transfers || nullLast(a.totalMinutes, b.totalMinutes) || nullLast(price(a), price(b)),
  };
  return [...list].sort((a, b) => cmp[key](a, b) || a.id.localeCompare(b.id));
}

export function stopById(network: Network, id: string): Stop | undefined {
  return network.stops.get(id);
}
