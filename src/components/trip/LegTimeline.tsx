import { ArrowDownToLine, ArrowUpFromLine, Clock, Repeat, Wallet } from "lucide-react";
import type { Itinerary } from "@/lib/routing/types";
import { formatKz, formatMinutes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DemoBadge, TransportBadge, VerificationBadge } from "./DataBadges";
import { shortTransportName, transportIcon } from "./transport";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-2 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

const Unknown = ({ text = "Não registado" }: { text?: string }) => (
  <span className="font-normal italic text-muted-foreground">{text}</span>
);

/** Step-by-step boarding instructions for one itinerary. */
export function LegTimeline({ it }: { it: Itinerary }) {
  return (
    <ol className="space-y-3">
      {it.legs.map((leg, i) => {
        const Icon = transportIcon(leg.route.transportCode);
        const isBus = leg.route.transportCode === "autocarro";
        const next = it.legs[i + 1];
        const intermediate = leg.path.length - 2;
        return (
          <li key={i} className="space-y-3">
            <section className="overflow-hidden rounded-2xl border bg-card shadow-card">
              <header
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-primary-foreground",
                  isBus ? "bg-transit-bus" : "bg-transit-taxi",
                )}
              >
                <span className="grid size-9 place-items-center rounded-xl bg-primary-foreground/20">
                  <Icon className="size-5" />
                </span>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-90">Etapa {i + 1}</p>
                  <h3 className="text-lg font-bold leading-tight">
                    {shortTransportName(leg.route.transportCode)} · {leg.route.code}
                  </h3>
                </div>
              </header>
              <div className="px-4 py-3">
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <TransportBadge code={leg.route.transportCode} label={leg.route.transportName} />
                  {leg.route.isDemo && <DemoBadge />}
                  <VerificationBadge verified={leg.route.verified} />
                </div>
                <dl className="divide-y">
                  <Field label="Transporte">{leg.route.transportName}</Field>
                  <Field label="Código da rota">{leg.route.code}</Field>
                  <Field label="Destino no veículo">
                    <span className="rounded-md bg-accent px-2 py-0.5 font-bold text-accent-foreground">
                      {leg.route.vehicleDestination}
                    </span>
                  </Field>
                  <Field label="Embarque">
                    <span className="flex items-start gap-1.5">
                      <ArrowUpFromLine className="mt-0.5 size-4 shrink-0 text-success" />
                      <span>
                        {leg.board.name}
                        <span className="block text-xs font-normal text-muted-foreground">
                          {leg.boardingNotes ?? "Local exato de embarque ainda não registado."}
                        </span>
                      </span>
                    </span>
                  </Field>
                  <Field label="Desembarque">
                    <span className="flex items-start gap-1.5">
                      <ArrowDownToLine className="mt-0.5 size-4 shrink-0 text-destructive" />
                      <span>
                        {leg.alight.name}
                        {intermediate > 0 && (
                          <span className="block text-xs font-normal text-muted-foreground">
                            Depois de {intermediate} {intermediate === 1 ? "paragem" : "paragens"}:{" "}
                            {leg.path.slice(1, -1).map((s) => s.name).join(", ")}
                          </span>
                        )}
                      </span>
                    </span>
                  </Field>
                  <Field label="Tempo estimado">
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-4 text-primary" />
                      {leg.minutes !== null ? formatMinutes(leg.minutes) : <Unknown />}
                    </span>
                  </Field>
                  <Field label="Custo estimado">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Wallet className="size-4 text-primary" />
                      {leg.fareKz !== null ? formatKz(leg.fareKz) : <Unknown text="Tarifa não registada" />}
                      {leg.fareKz !== null && leg.fareIsDemo && <DemoBadge />}
                    </span>
                  </Field>
                  {leg.route.operator && <Field label="Operador">{leg.route.operator}</Field>}
                </dl>
              </div>
            </section>
            {next && (
              <div className="flex gap-3 rounded-2xl border border-dashed border-primary/40 bg-accent/50 px-4 py-3 text-sm">
                <Repeat className="mt-0.5 size-5 shrink-0 text-primary" />
                <p>
                  <strong>Transferência em {leg.alight.name}.</strong> Apanhe o{" "}
                  {shortTransportName(next.route.transportCode).toLowerCase()} <strong>{next.route.code}</strong> com
                  destino <strong>“{next.route.vehicleDestination}”</strong>.
                </p>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
