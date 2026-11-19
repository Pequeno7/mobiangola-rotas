/** Loads a city's transit network from the database and maps it to routing-engine types. */
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Fare, Network, Stop, TransitRoute } from "@/lib/routing/types";

export const DEFAULT_CITY = "luanda";

export interface City {
  id: string;
  name: string;
  slug: string;
  centerLat: number;
  centerLng: number;
}

export interface NetworkData {
  city: City;
  stops: Stop[];
  routes: TransitRoute[];
  fares: Fare[];
}

export async function fetchNetwork(citySlug: string = DEFAULT_CITY): Promise<NetworkData> {
  const { data: city, error: cityError } = await supabase
    .from("cities")
    .select("id, name, slug, center_lat, center_lng")
    .eq("slug", citySlug)
    .maybeSingle();
  if (cityError) throw new Error(`Não foi possível carregar a cidade: ${cityError.message}`);
  if (!city) throw new Error(`Cidade não encontrada: ${citySlug}`);

  const [stopsRes, routesRes] = await Promise.all([
    supabase
      .from("stops")
      .select("id, name, lat, lng, verified, boarding_notes")
      .eq("city_id", city.id)
      .order("name"),
    supabase
      .from("routes")
      .select(
        "id, code, name, vehicle_destination, operator, is_demo, verified, transport_types(code, name), route_stops(stop_id, seq, minutes_from_start, can_board, can_alight, boarding_notes)",
      )
      .eq("city_id", city.id)
      .eq("active", true)
      .order("code"),
  ]);
  if (stopsRes.error) throw new Error(`Erro ao carregar paragens: ${stopsRes.error.message}`);
  if (routesRes.error) throw new Error(`Erro ao carregar rotas: ${routesRes.error.message}`);

  const routeIds = routesRes.data.map((r) => r.id);
  const faresRes = routeIds.length
    ? await supabase
        .from("fares")
        .select("route_id, from_stop_id, to_stop_id, amount_kz, is_demo, verified")
        .in("route_id", routeIds)
    : { data: [], error: null };
  if (faresRes.error) throw new Error(`Erro ao carregar tarifas: ${faresRes.error.message}`);

  return {
    city: {
      id: city.id,
      name: city.name,
      slug: city.slug,
      centerLat: city.center_lat,
      centerLng: city.center_lng,
    },
    stops: stopsRes.data.map((s) => ({
      id: s.id,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      verified: s.verified,
      boardingNotes: s.boarding_notes,
    })),
    routes: routesRes.data.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      vehicleDestination: r.vehicle_destination,
      operator: r.operator,
      isDemo: r.is_demo,
      verified: r.verified,
      transportCode: r.transport_types?.code ?? "desconhecido",
      transportName: r.transport_types?.name ?? "Transporte",
      stops: [...(r.route_stops ?? [])]
        .sort((a, b) => a.seq - b.seq)
        .map((rs) => ({
          stopId: rs.stop_id,
          seq: rs.seq,
          minutesFromStart: rs.minutes_from_start,
          canBoard: rs.can_board,
          canAlight: rs.can_alight,
          boardingNotes: rs.boarding_notes,
        })),
    })),
    fares: (faresRes.data ?? []).map((f) => ({
      routeId: f.route_id,
      fromStopId: f.from_stop_id,
      toStopId: f.to_stop_id,
      amountKz: Number(f.amount_kz),
      isDemo: f.is_demo,
      verified: f.verified,
    })),
  };
}

export const networkQuery = (citySlug: string = DEFAULT_CITY) =>
  queryOptions({
    queryKey: ["network", citySlug],
    queryFn: () => fetchNetwork(citySlug),
    staleTime: 5 * 60_000,
  });

export function buildNetwork(data: Pick<NetworkData, "stops" | "routes" | "fares">): Network {
  return {
    stops: new Map(data.stops.map((s) => [s.id, s])),
    routes: data.routes,
    fares: data.fares,
  };
}
