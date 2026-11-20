/** Pure validation rules for admin data entry (no database or UI imports, so they are unit-tested). */

/** Approximate bounding box of Angola, including Cabinda. */
export const ANGOLA_BOUNDS = { minLat: -18.1, maxLat: -4.3, minLng: 11.6, maxLng: 24.1 } as const;

export interface StopInput {
  name: string;
  lat: number | null;
  lng: number | null;
}

export function validateStop(input: StopInput): string[] {
  const errors: string[] = [];
  const name = input.name.trim();
  if (name.length < 2 || name.length > 80) errors.push("O nome da paragem deve ter entre 2 e 80 caracteres.");
  if (input.lat === null || input.lng === null || !Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
    errors.push("Indique a localização da paragem (clique no mapa ou escreva as coordenadas).");
  } else if (
    input.lat < ANGOLA_BOUNDS.minLat ||
    input.lat > ANGOLA_BOUNDS.maxLat ||
    input.lng < ANGOLA_BOUNDS.minLng ||
    input.lng > ANGOLA_BOUNDS.maxLng
  ) {
    errors.push("A localização fica fora de Angola. Confirme a latitude e a longitude.");
  }
  return errors;
}

/** "Mutamba, Largo da Mutamba , mutamba" → ["Mutamba", "Largo da Mutamba"] */
export function parseAliases(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(",")) {
    const v = raw.trim().replace(/\s+/g, " ");
    if (!v || seen.has(v.toLowerCase())) continue;
    seen.add(v.toLowerCase());
    out.push(v);
  }
  return out;
}

/** "Táxi Colectivo" → "taxi_colectivo" */
export function toCode(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** "Luanda Sul" → "luanda-sul" (same format the public API accepts for `cidade`). */
export function toSlug(text: string): string {
  return toCode(text).replace(/_/g, "-");
}

export interface RouteStopDraft {
  stopId: string;
  minutesFromStart: number | null;
  canBoard: boolean;
  canAlight: boolean;
  boardingNotes: string;
}

export function validateRouteStops(stops: RouteStopDraft[], stopName: (id: string) => string = (id) => id): string[] {
  const errors: string[] = [];
  if (stops.length < 2) errors.push("Uma rota precisa de pelo menos 2 paragens.");
  const seen = new Set<string>();
  stops.forEach((s, i) => {
    if (!s.stopId) {
      errors.push(`Escolha a paragem na posição ${i + 1}.`);
      return;
    }
    if (seen.has(s.stopId)) errors.push(`A paragem "${stopName(s.stopId)}" aparece mais de uma vez.`);
    seen.add(s.stopId);
    if (s.minutesFromStart !== null && (!Number.isInteger(s.minutesFromStart) || s.minutesFromStart < 0)) {
      errors.push(`O tempo na posição ${i + 1} deve ser um número inteiro de minutos (0 ou mais).`);
    }
  });
  let last: { min: number; pos: number } | null = null;
  stops.forEach((s, i) => {
    if (s.minutesFromStart === null || s.minutesFromStart < 0) return;
    if (last && s.minutesFromStart < last.min) {
      errors.push(`O tempo na posição ${i + 1} é menor do que na posição ${last.pos}. Os tempos devem aumentar ao longo da rota.`);
    }
    last = { min: s.minutesFromStart, pos: i + 1 };
  });
  if (stops.length >= 2) {
    if (!stops[0]!.canBoard) errors.push("Na primeira paragem tem de ser possível embarcar.");
    if (!stops[stops.length - 1]!.canAlight) errors.push("Na última paragem tem de ser possível desembarcar.");
  }
  return errors;
}

export function toRouteStopsPayload(stops: RouteStopDraft[]) {
  return stops.map((s, i) => ({
    stop_id: s.stopId,
    seq: i + 1,
    minutes_from_start: s.minutesFromStart,
    can_board: s.canBoard,
    can_alight: s.canAlight,
    boarding_notes: s.boardingNotes.trim() || null,
  }));
}

export interface FareInput {
  fromStopId: string | null;
  toStopId: string | null;
  amountKz: number | null;
}

/** A fare is either one flat price for the whole route (no stops) or a price between two stops in route order. */
export function validateFare(input: FareInput, routeStopIds: string[]): string[] {
  const errors: string[] = [];
  if (input.amountKz === null || !Number.isFinite(input.amountKz) || input.amountKz <= 0) {
    errors.push("O valor da tarifa deve ser maior que 0 Kz.");
  } else if (input.amountKz > 100_000) {
    errors.push("O valor da tarifa parece demasiado alto. Confirme o valor em Kz.");
  }
  const hasFrom = !!input.fromStopId;
  const hasTo = !!input.toStopId;
  if (hasFrom !== hasTo) {
    errors.push("Escolha as duas paragens (de / até), ou nenhuma para uma tarifa única da rota.");
  } else if (hasFrom && hasTo) {
    const a = routeStopIds.indexOf(input.fromStopId!);
    const b = routeStopIds.indexOf(input.toStopId!);
    if (a === -1 || b === -1) errors.push("As paragens da tarifa têm de fazer parte desta rota.");
    else if (a >= b) errors.push("A paragem de partida tem de vir antes da paragem de chegada na rota.");
  }
  return errors;
}

export function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
}

/** Only same-origin paths may be used as a post-sign-in destination. */
export function safeRedirect(path: string | undefined | null, fallback = "/admin"): string {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return fallback;
  return path;
}
