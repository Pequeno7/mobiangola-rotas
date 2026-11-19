import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TransitMap } from "@/components/map/TransitMap";
import { DemoNotice } from "@/components/trip/DataBadges";
import { ItinerarySummary, LegChain } from "@/components/trip/ItineraryCard";
import { itineraryLines, itineraryMarkers } from "@/components/trip/itinerary-map";
import { LegTimeline } from "@/components/trip/LegTimeline";
import { Button } from "@/components/ui/button";
import { buildNetwork, networkQuery } from "@/lib/network";
import { DEFAULT_TRANSFER_PENALTY_MIN, findItineraries } from "@/lib/routing/engine";
import { tripDetailSchema } from "@/lib/search-params";

export const Route = createFileRoute("/viagem")({
  validateSearch: (search: Record<string, unknown>) => tripDetailSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Instruções da viagem — MobiAngola" },
      { name: "description", content: "Etapa a etapa: transporte, código da rota, destino no veículo, embarque e desembarque." },
      { property: "og:title", content: "Instruções da viagem — MobiAngola" },
      { property: "og:description", content: "Saiba exatamente onde embarcar, onde sair e onde trocar de transporte." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(networkQuery()),
  component: TripDetail,
});

function TripDetail() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const network = useMemo(() => buildNetwork(data), [data]);

  const it = useMemo(() => {
    if (!search.de || !search.para || !search.alt) return undefined;
    return findItineraries(network, search.de, search.para, { maxTransfers: search.max }).find((i) => i.id === search.alt);
  }, [network, search.de, search.para, search.max, search.alt]);

  const lines = useMemo(() => (it ? itineraryLines(it) : []), [it]);
  const markers = useMemo(() => (it ? itineraryMarkers(it, true) : []), [it]);

  const backSearch = { de: search.de, para: search.para, max: search.max, ordem: search.ordem };

  if (!it) {
    return (
      <AppShell className="p-6">
        <p className="mb-4">Esta alternativa já não está disponível. Os dados podem ter sido atualizados.</p>
        <Button asChild>
          <Link to="/viagens" search={backSearch}>Ver alternativas</Link>
        </Button>
      </AppShell>
    );
  }

  const first = it.legs[0]!;
  const last = it.legs[it.legs.length - 1]!;

  return (
    <AppShell>
      <header className="sticky top-0 z-[1001] flex items-center gap-3 border-b bg-background/95 px-3 py-3 backdrop-blur">
        <Button asChild variant="ghost" size="icon" aria-label="Voltar às alternativas">
          <Link to="/viagens" search={backSearch}>
            <ArrowLeft />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold">
            {first.board.name} <span className="text-primary">→</span> {last.alight.name}
          </h1>
          <p className="text-xs text-muted-foreground">Instruções da viagem</p>
        </div>
      </header>

      <TransitMap center={[data.city.centerLat, data.city.centerLng]} lines={lines} markers={markers} className="h-72" />

      <div className="space-y-4 px-4 py-4">
        <section className="space-y-3 rounded-2xl border bg-card p-4 shadow-card">
          <LegChain it={it} />
          <ItinerarySummary it={it} />
          {it.transfers > 0 && it.totalMinutes !== null && (
            <p className="text-xs text-muted-foreground">
              O tempo inclui cerca de {DEFAULT_TRANSFER_PENALTY_MIN} min por transferência. Não inclui a espera inicial.
            </p>
          )}
          <p className="text-xs text-muted-foreground">Distância aproximada, medida entre paragens.</p>
        </section>

        <LegTimeline it={it} />

        <div className="rounded-2xl bg-secondary p-4 text-sm text-secondary-foreground">
          <strong>Chegada:</strong> desça em <strong>{last.alight.name}</strong>.
        </div>

        <DemoNotice />
      </div>
    </AppShell>
  );
}
