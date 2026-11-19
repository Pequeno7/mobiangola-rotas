import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TransitMap, type MapLine, type MapMarker } from "@/components/map/TransitMap";
import { DemoBadge, VerificationBadge } from "@/components/trip/DataBadges";
import { lineKind, transportIcon } from "@/components/trip/transport";
import { networkQuery } from "@/lib/network";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mapa")({
  head: () => ({
    meta: [
      { title: "Mapa de paragens e rotas — MobiAngola" },
      { name: "description", content: "Mapa OpenStreetMap com as paragens e rotas de táxis colectivos e autocarros registadas." },
      { property: "og:title", content: "Mapa de paragens e rotas — MobiAngola" },
      { property: "og:description", content: "Veja no mapa as paragens e os percursos registados em Luanda." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(networkQuery()),
  component: MapPage,
});

function MapPage() {
  const data = Route.useLoaderData();
  const [focus, setFocus] = useState<string | null>(null);
  const stopsById = useMemo(() => new Map(data.stops.map((s) => [s.id, s])), [data.stops]);

  const lines: MapLine[] = useMemo(
    () =>
      data.routes.map((r) => ({
        id: r.id,
        kind: lineKind(r.transportCode),
        faded: focus !== null && focus !== r.id,
        label: `${r.code} → ${r.vehicleDestination}`,
        points: r.stops
          .map((rs) => stopsById.get(rs.stopId))
          .filter((s) => s !== undefined)
          .map((s) => [s.lat, s.lng] as [number, number]),
      })),
    [data.routes, focus, stopsById],
  );

  const markers: MapMarker[] = useMemo(() => {
    const route = data.routes.find((r) => r.id === focus);
    const ids = route ? new Set(route.stops.map((s) => s.stopId)) : null;
    return data.stops
      .filter((s) => !ids || ids.has(s.id))
      .map((s) => ({ id: s.id, lat: s.lat, lng: s.lng, kind: "stop" as const, label: s.name }));
  }, [data, focus]);

  return (
    <AppShell>
      <header className="px-4 pb-3 pt-5">
        <h1 className="text-2xl font-bold">Mapa</h1>
        <p className="text-sm text-muted-foreground">
          {data.stops.length} paragens e {data.routes.length} rotas registadas em {data.city.name}.
        </p>
      </header>
      <TransitMap center={[data.city.centerLat, data.city.centerLng]} lines={lines} markers={markers} className="h-[52vh]" />
      <div className="flex gap-4 px-4 pt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-5 rounded-full bg-transit-taxi" /> Táxi colectivo</span>
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-5 rounded-full bg-transit-bus" /> Autocarro</span>
      </div>
      <section className="space-y-2 px-4 py-4">
        <h2 className="text-sm font-semibold text-muted-foreground">Rotas — toque para destacar</h2>
        <ul className="space-y-2">
          {data.routes.map((r) => {
            const Icon = transportIcon(r.transportCode);
            const active = focus === r.id;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFocus(active ? null : r.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left transition",
                    active ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/40",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-10 place-items-center rounded-xl text-primary-foreground",
                      r.transportCode === "autocarro" ? "bg-transit-bus" : "bg-transit-taxi",
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">
                      {r.code} · <span className="text-primary">“{r.vehicleDestination}”</span>
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {r.stops.map((rs) => stopsById.get(rs.stopId)?.name).join(" → ")}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    {r.isDemo && <DemoBadge />}
                    {!r.isDemo && <VerificationBadge verified={r.verified} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </AppShell>
  );
}
