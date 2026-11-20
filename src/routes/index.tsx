import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowDownUp, Crosshair, Loader2, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { AppShell } from "@/components/layout/AppShell";
import { StopPicker } from "@/components/search/StopPicker";
import { TripTextSearch } from "@/components/search/TripTextSearch";
import { DemoNotice } from "@/components/trip/DataBadges";
import { Button } from "@/components/ui/button";
import { networkQuery } from "@/lib/network";
import { nearestStop } from "@/lib/routing/geo";
import { MAX_TRANSFERS_UI } from "@/lib/search-params";
import { formatKm } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MobiAngola — Como chegar de candongueiro e autocarro" },
      {
        name: "description",
        content: "Indique a origem e o destino e veja que táxis colectivos e autocarros apanhar em Luanda.",
      },
      { property: "og:title", content: "MobiAngola — Como chegar de candongueiro e autocarro" },
      {
        property: "og:description",
        content: "Instruções claras: onde embarcar, onde sair e onde trocar de transporte em Luanda.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(networkQuery()),
  component: Home,
});

function Home() {
  const network = Route.useLoaderData();
  const navigate = useNavigate();
  const [origin, setOrigin] = useState<string | null>(null);
  const [destination, setDestination] = useState<string | null>(null);
  const [maxTransfers, setMaxTransfers] = useState(2);
  const [locating, setLocating] = useState(false);

  const swap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("O seu dispositivo não permite obter a localização.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const near = nearestStop({ lat: pos.coords.latitude, lng: pos.coords.longitude }, network.stops);
        if (!near) {
          toast.error("Ainda não há paragens registadas.");
          return;
        }
        setOrigin(near.stop.id);
        if (near.distanceKm > 3) {
          toast.warning(`A paragem registada mais próxima é ${near.stop.name}, a ${formatKm(near.distanceKm)}.`);
        } else {
          toast.success(`Paragem mais próxima: ${near.stop.name} (${formatKm(near.distanceKm)})`);
        }
      },
      () => {
        setLocating(false);
        toast.error("Não foi possível obter a sua localização. Verifique as permissões.");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination) {
      toast.error("Escolha a origem e o destino.");
      return;
    }
    if (origin === destination) {
      toast.error("A origem e o destino têm de ser diferentes.");
      return;
    }
    navigate({ to: "/viagens", search: { de: origin, para: destination, max: maxTransfers, ordem: "duracao" } });
  };

  const pilot = {
    from: network.stops.find((s) => s.name === "Kilamba"),
    to: network.stops.find((s) => s.name === "Mutamba"),
  };

  return (
    <AppShell>
      <header className="relative overflow-hidden bg-gradient-hero px-5 pb-24 pt-6 text-primary-foreground">
        <div className="pointer-events-none absolute inset-x-0 bottom-10 h-1 bg-road opacity-30" aria-hidden="true" />
        <Logo inverted />
        <h1 className="mt-8 text-3xl font-bold leading-tight">Para onde vamos hoje?</h1>
        <p className="mt-2 max-w-xs text-primary-foreground/85">
          Saiba que candongueiro ou autocarro apanhar, onde subir e onde descer.
        </p>
      </header>

      <div className="relative z-10 -mt-16 space-y-5 px-4">
        <form onSubmit={submit} className="rounded-3xl border bg-card p-3 shadow-card">
          <div className="relative">
            <StopPicker
              label="Origem"
              placeholder="De onde parte?"
              stops={network.stops}
              value={origin}
              onChange={setOrigin}
              dotClassName="bg-success ring-success/20"
            />
            <div className="mx-3 border-t" />
            <StopPicker
              label="Destino"
              placeholder="Para onde vai?"
              stops={network.stops}
              value={destination}
              onChange={setDestination}
              dotClassName="bg-destructive ring-destructive/20"
            />
            <button
              type="button"
              onClick={swap}
              aria-label="Inverter origem e destino"
              className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full border bg-background text-primary shadow-card transition hover:bg-accent"
            >
              <ArrowDownUp className="size-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-primary hover:bg-accent/60 disabled:opacity-60"
          >
            {locating ? <Loader2 className="size-4 animate-spin" /> : <Crosshair className="size-4" />}
            Usar a minha localização atual
          </button>

          <fieldset className="mt-1 px-3 py-2">
            <legend className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Máximo de transferências
            </legend>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {Array.from({ length: MAX_TRANSFERS_UI + 1 }, (_, n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={maxTransfers === n}
                  onClick={() => setMaxTransfers(n)}
                  className={cn(
                    "rounded-xl border py-2 text-sm font-semibold transition",
                    maxTransfers === n
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background text-foreground hover:bg-accent",
                  )}
                >
                  {n === 0 ? "Direta" : n}
                </button>
              ))}
            </div>
          </fieldset>

          <Button type="submit" variant="hero" size="xl" className="mt-3 w-full">
            <Search /> Encontrar viagem
          </Button>
        </form>

        <TripTextSearch
          defaultMaxTransfers={maxTransfers}
          onPartial={(o, d) => {
            if (o) setOrigin(o);
            if (d) setDestination(d);
          }}
        />

        {pilot.from && pilot.to && (
          <section aria-labelledby="pilot-title" className="space-y-2">
            <h2 id="pilot-title" className="px-1 text-sm font-semibold text-muted-foreground">
              Percurso-piloto
            </h2>
            <button
              type="button"
              onClick={() =>
                navigate({
                  to: "/viagens",
                  search: { de: pilot.from!.id, para: pilot.to!.id, max: 2, ordem: "duracao" },
                })
              }
              className="flex w-full items-center gap-3 rounded-2xl border bg-secondary p-4 text-left transition hover:border-primary/40"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Sparkles className="size-5" />
              </span>
              <span className="flex-1">
                <span className="block font-semibold text-secondary-foreground">Kilamba → Mutamba</span>
                <span className="block text-xs text-muted-foreground">Táxis colectivos e autocarros</span>
              </span>
            </button>
          </section>
        )}

        <DemoNotice />
      </div>
    </AppShell>
  );
}
