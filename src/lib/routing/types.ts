/** Domain types for the MobiAngola routing engine. Pure data — no database or UI imports. */

export type TransportCode = "taxi_colectivo" | "autocarro" | string;

export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  verified: boolean;
  boardingNotes: string | null;
}

export interface RouteStop {
  stopId: string;
  seq: number;
  minutesFromStart: number | null;
  canBoard: boolean;
  canAlight: boolean;
  boardingNotes: string | null;
}

export interface TransitRoute {
  id: string;
  code: string;
  name: string;
  vehicleDestination: string;
  transportCode: TransportCode;
  transportName: string;
  operator: string | null;
  isDemo: boolean;
  verified: boolean;
  /** Ordered by seq ascending. */
  stops: RouteStop[];
}

export interface Fare {
  routeId: string;
  fromStopId: string | null;
  toStopId: string | null;
  amountKz: number;
  isDemo: boolean;
  verified: boolean;
}

export interface Network {
  stops: Map<string, Stop>;
  routes: TransitRoute[];
  fares: Fare[];
}

export interface Leg {
  route: TransitRoute;
  board: Stop;
  alight: Stop;
  /** Every stop ridden through, board and alight included. */
  path: Stop[];
  boardingNotes: string | null;
  minutes: number | null;
  fareKz: number | null;
  fareIsDemo: boolean;
  fareVerified: boolean;
  distanceKm: number;
}

export interface Itinerary {
  /** Deterministic key: same search always yields the same id. */
  id: string;
  legs: Leg[];
  transfers: number;
  /** Null when any leg has no time registered. */
  totalMinutes: number | null;
  /** Sum of known fares. Check fareComplete before presenting as total. */
  totalFareKz: number;
  fareComplete: boolean;
  distanceKm: number;
  hasDemoData: boolean;
  hasUnverifiedData: boolean;
}

export type SortKey = "preco" | "duracao" | "transferencias";

export interface SearchOptions {
  maxTransfers: number;
  /** Minutes added per transfer for walking/waiting. */
  transferPenaltyMin?: number;
  maxResults?: number;
}
