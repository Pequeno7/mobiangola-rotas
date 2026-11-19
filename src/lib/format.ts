const kz = new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 0 });

export function formatKz(value: number): string {
  return `${kz.format(value)} Kz`;
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function formatKm(km: number): string {
  return `${km < 10 ? km.toFixed(1).replace(".", ",") : Math.round(km)} km`;
}

export function transfersLabel(n: number): string {
  if (n === 0) return "Direta";
  return n === 1 ? "1 transferência" : `${n} transferências`;
}
