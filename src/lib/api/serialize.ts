/** JSON shapes of the public REST API (snake_case, stable for the Android client). */
import type { Itinerary, Stop, TransitRoute } from "@/lib/routing/types";

export const API_VERSION = "1";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { ...CORS_HEADERS, "Cache-Control": status === 200 ? "public, max-age=60" : "no-store" },
  });
}

export function apiError(status: number, code: string, message: string, details?: unknown) {
  return json({ error: { code, message, details } }, status);
}

export const preflight = () => new Response(null, { status: 204, headers: CORS_HEADERS });

export const serializeStop = (s: Stop) => ({
  id: s.id,
  nome: s.name,
  lat: s.lat,
  lng: s.lng,
  verificada: s.verified,
  notas_embarque: s.boardingNotes,
});

export const serializeRoute = (r: TransitRoute, stops: Map<string, Stop>) => ({
  id: r.id,
  codigo: r.code,
  nome: r.name,
  transporte: { codigo: r.transportCode, nome: r.transportName },
  destino_no_veiculo: r.vehicleDestination,
  operador: r.operator,
  ficticio: r.isDemo,
  verificada: r.verified,
  paragens: r.stops.map((rs) => ({
    ordem: rs.seq,
    paragem_id: rs.stopId,
    nome: stops.get(rs.stopId)?.name ?? null,
    minutos_desde_inicio: rs.minutesFromStart,
    embarque_permitido: rs.canBoard,
    desembarque_permitido: rs.canAlight,
  })),
});

const nextLeg = (it: Itinerary, i: number) => it.legs[i + 1];

export const serializeItinerary = (it: Itinerary) => ({
  id: it.id,
  transferencias: it.transfers,
  tempo_estimado_min: it.totalMinutes,
  custo_estimado_kz: it.fareComplete ? it.totalFareKz : null,
  custo_conhecido_kz: it.totalFareKz,
  custo_completo: it.fareComplete,
  distancia_km: Math.round(it.distanceKm * 10) / 10,
  contem_dados_ficticios: it.hasDemoData,
  contem_dados_nao_verificados: it.hasUnverifiedData,
  etapas: it.legs.map((l, i) => ({
    ordem: i + 1,
    transporte: { codigo: l.route.transportCode, nome: l.route.transportName },
    rota: {
      id: l.route.id,
      codigo: l.route.code,
      nome: l.route.name,
      ficticia: l.route.isDemo,
      verificada: l.route.verified,
    },
    destino_no_veiculo: l.route.vehicleDestination,
    embarque: serializeStop(l.board),
    local_exato_embarque: l.boardingNotes,
    desembarque: serializeStop(l.alight),
    paragens_percorridas: l.path.map((s) => ({ id: s.id, nome: s.name, lat: s.lat, lng: s.lng })),
    tempo_estimado_min: l.minutes,
    custo_estimado_kz: l.fareKz,
    tarifa_ficticia: l.fareIsDemo,
    proximo_transporte: nextLeg(it, i)
      ? {
          paragem_transferencia: l.alight.name,
          codigo_rota: nextLeg(it, i)!.route.code,
          destino_no_veiculo: nextLeg(it, i)!.route.vehicleDestination,
        }
      : null,
  })),
});
