import { Bus, CarTaxiFront, type LucideIcon } from "lucide-react";

export type LineKind = "taxi" | "bus" | "other";

export function lineKind(transportCode: string): LineKind {
  if (transportCode === "autocarro") return "bus";
  if (transportCode === "taxi_colectivo") return "taxi";
  return "other";
}

export function transportIcon(transportCode: string): LucideIcon {
  return transportCode === "autocarro" ? Bus : CarTaxiFront;
}

export function shortTransportName(transportCode: string): string {
  if (transportCode === "autocarro") return "Autocarro";
  if (transportCode === "taxi_colectivo") return "Táxi colectivo";
  return "Transporte";
}
