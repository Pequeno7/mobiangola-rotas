import { ChevronRight, Clock, Repeat, Route as RouteIcon, Wallet } from "lucide-react";
import type { Itinerary } from "@/lib/routing/types";
import { formatKm, formatKz, formatMinutes, transfersLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DemoBadge, VerificationBadge } from "./DataBadges";
import { transportIcon } from "./transport";

export function ItinerarySummary({ it }: { it: Itinerary }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
      <div className="flex items-center gap-2">
        <Clock className="size-4 text-primary" />
        <dt className="sr-only">Tempo estimado</dt>
        <dd className="font-semibold">{it.totalMinutes !== null ? `~${formatMinutes(it.totalMinutes)}` : "Tempo não registado"}</dd>
      </div>
      <div className="flex items-center gap-2">
        <Wallet className="size-4 text-primary" />
        <dt className="sr-only">Custo estimado</dt>
        <dd className="font-semibold">
          {it.fareComplete ? formatKz(it.totalFareKz) : it.totalFareKz > 0 ? `${formatKz(it.totalFareKz)} + ?` : "Tarifa não registada"}
        </dd>
      </div>
      <div className="flex items-center gap-2">
        <Repeat className="size-4 text-primary" />
        <dt className="sr-only">Transferências</dt>
        <dd>{transfersLabel(it.transfers)}</dd>
      </div>
      <div className="flex items-center gap-2">
        <RouteIcon className="size-4 text-primary" />
        <dt className="sr-only">Distância estimada</dt>
        <dd>≈ {formatKm(it.distanceKm)}</dd>
      </div>
    </dl>
  );
}

export function LegChain({ it }: { it: Itinerary }) {
  return (
    <ol className="flex flex-wrap items-center gap-1.5" aria-label="Transportes">
      {it.legs.map((leg, i) => {
        const Icon = transportIcon(leg.route.transportCode);
        const isBus = leg.route.transportCode === "autocarro";
        return (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />}
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-primary-foreground",
                isBus ? "bg-transit-bus" : "bg-transit-taxi",
              )}
            >
              <Icon className="size-3.5" />
              {leg.route.code}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function ItineraryCard({
  it,
  selected,
  onSelect,
  footer,
}: {
  it: Itinerary;
  selected: boolean;
  onSelect: () => void;
  footer?: React.ReactNode;
}) {
  return (
    <article
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-card transition-all",
        selected ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/40",
      )}
    >
      <button type="button" onClick={onSelect} className="block w-full space-y-3 text-left" aria-pressed={selected}>
        <div className="flex items-start justify-between gap-2">
          <LegChain it={it} />
          <div className="flex shrink-0 gap-1">
            {it.hasDemoData && <DemoBadge />}
          </div>
        </div>
        <ItinerarySummary it={it} />
        <p className="text-xs text-muted-foreground">
          {it.legs.map((l) => l.board.name).join(" → ")} → {it.legs[it.legs.length - 1]!.alight.name}
        </p>
        {it.hasUnverifiedData && (
          <div>
            <VerificationBadge verified={false} />
          </div>
        )}
      </button>
      {footer}
    </article>
  );
}
