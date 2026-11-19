import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, SearchX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TransitMap } from "@/components/map/TransitMap";
import { DemoNotice } from "@/components/trip/DataBadges";
import { ItineraryCard } from "@/components/trip/ItineraryCard";
import { itineraryLines, itineraryMarkers } from "@/components/trip/itinerary-map";
import { Button } from "@/components/ui/button";
import { buildNetwork, networkQuery } from "@/lib/network";
import { findItineraries, sortItineraries } from "@/lib/routing/engine";
import { logTripSearch } from "@/lib/search-log";
import { MAX_TRANSFERS_UI, SORT_LABELS, sortSchema, tripSearchSchema } from "@/lib/search-params";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/viagens")({
  validateSearch: (search: Record<string, unknown>) => tripSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Alternativas de viagem — MobiAngola" },
      { name: "description", content: "Todas as combinações de táxis colectivos e autocarros encontradas para a sua viagem." },
      { property: "og:title", content: "Alternativas de viagem — MobiAngola" },
      { property: "og:description", content: "Compare tempo, custo em Kz e número de transferências." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(networkQuery()),
  component: Results,
});

function Results() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/viagens" });
  const network = useMemo(() => buildNetwork(data), [data]);
  const origin = search.de ? network.stops.get(search.de) : undefined;
  const destination = search.para ? network.stops.get(search.para) : undefined;

  const itineraries = useMemo(() => {
    if (!origin || !destination) return [];
    return findItineraries(network, origin.id, destination.id, { maxTransfers: search.max });
  }, [network, origin, destination, search.max]);
  const sorted = useMemo(() => sortItineraries(itineraries, search.ordem), [itineraries, search.ordem]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = sorted.find((i) => i.id === selectedId) ?? sorted[0];

  useEffect(() => {
    if (!origin || !destination) return;
    void logTripSearch({
      originStopId: origin.id,
      destinationStopId: destination.id,
      maxTransfers: search.max,
      resultsCount: itineraries.length,
      source: "web",
    });
  }, [origin?.id, destination?.id, search.max]); // eslint-disable-line react-hooks/exhaustive-deps

  const { lines, markers } = useMemo(() => {
    if (!selected) return { lines: [], markers: [] };
    const others = sorted.filter((i) => i.id !== selected.id).flatMap((i) => itineraryLines(i, true));
    return { lines: [...others, ...itineraryLines(selected)], markers: itineraryMarkers(selected) };
  }, [sorted, selected]);

  if (!origin || !destination) {
    return (
      <AppShell className="p-6">
        <p className="mb-4">Pesquisa incompleta. Escolha a origem e o destino.</p>
        <Button asChild>
          <Link to="/">Voltar à pesquisa</Link>
        </Button>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="sticky top-0 z-[1001] flex items-center gap-3 border-b bg-background/95 px-3 py-3 backdrop-blur">
        <Button asChild variant="ghost" size="icon" aria-label="Voltar">
          <Link to="/">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold">
            {origin.name} <span className="text-primary">→</span> {destination.name}
          </h1>
          <p className="text-xs text-muted-foreground">
            {sorted.length} {sorted.length === 1 ? "alternativa" : "alternativas"} · até{" "}
            {search.max === 0 ? "0 transferências (direta)" : `${search.max} transferência${search.max > 1 ? "s" : ""}`}
          </p>
        </div>
      </header>

      {sorted.length > 0 && (
        <TransitMap
          center={[data.city.centerLat, data.city.centerLng]}
          lines={lines}
          markers={markers}
          className="h-60"
        />
      )}

      <div className="space-y-4 px-4 py-4">
        {sorted.length > 0 ? (
          <>
            <div role="tablist" aria-label="Ordenar alternativas" className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1">
              {sortSchema.options.map((key) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={search.ordem === key}
                  onClick={() => navigate({ search: (s) => ({ ...s, ordem: key }), replace: true })}
                  className={cn(
                    "rounded-xl py-2 text-xs font-semibold transition",
                    search.ordem === key ? "bg-background text-primary shadow-card" : "text-muted-foreground",
                  )}
                >
                  {SORT_LABELS[key]}
                </button>
              ))}
            </div>

            <ul className="space-y-3">
              {sorted.map((it) => (
                <li key={it.id}>
                  <ItineraryCard
                    it={it}
                    selected={selected?.id === it.id}
                    onSelect={() => setSelectedId(it.id)}
                    footer={
                      <Button asChild variant="soft" className="mt-3 w-full">
                        <Link
                          to="/viagem"
                          search={{ de: origin.id, para: destination.id, max: search.max, ordem: search.ordem, alt: it.id }}
                        >
                          Ver instruções passo a passo <ChevronRight />
                        </Link>
                      </Button>
                    }
                  />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="rounded-3xl border bg-card p-6 text-center shadow-card">
            <SearchX className="mx-auto size-10 text-muted-foreground" />
            <h2 className="mt-3 text-lg font-bold">Sem ligações registadas</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Não existem rotas cadastradas que liguem {origin.name} a {destination.name}
              {search.max < MAX_TRANSFERS_UI ? ` com até ${search.max} transferência(s)` : ""}. O MobiAngola não inventa
              percursos.
            </p>
            {search.max < MAX_TRANSFERS_UI && (
              <Button
                className="mt-4"
                onClick={() => navigate({ search: (s) => ({ ...s, max: MAX_TRANSFERS_UI }) })}
              >
                Permitir até {MAX_TRANSFERS_UI} transferências
              </Button>
            )}
          </div>
        )}
        <DemoNotice />
      </div>
    </AppShell>
  );
}
