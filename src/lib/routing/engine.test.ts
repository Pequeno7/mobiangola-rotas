import { describe, expect, it } from "vitest";
import { findItineraries, resolveFare, sortItineraries } from "./engine";
import type { Fare, Network, Stop, TransitRoute } from "./types";

const stop = (id: string, lat = -8.9, lng = 13.2): Stop => ({
  id, name: id, lat, lng, verified: true, boardingNotes: null,
});

const route = (
  code: string,
  stops: [string, number | null][],
  transportCode = "taxi_colectivo",
  extra: Partial<TransitRoute> = {},
): TransitRoute => ({
  id: code, code, name: code, vehicleDestination: stops[stops.length - 1]![0],
  transportCode, transportName: transportCode, operator: null, isDemo: false, verified: true,
  stops: stops.map(([stopId, minutesFromStart], i) => ({
    stopId, seq: i + 1, minutesFromStart, canBoard: true, canAlight: true, boardingNotes: null,
  })),
  ...extra,
});

const fare = (routeId: string, amountKz: number, from: string | null = null, to: string | null = null): Fare => ({
  routeId, fromStopId: from, toStopId: to, amountKz, isDemo: false, verified: true,
});

// Mirrors the pilot demo network Kilamba (K) → Mutamba (M).
function pilotNetwork(): Network {
  const ids = ["K", "CAM", "G2", "RP", "AER", "CON", "SP", "1M", "M", "BEN"];
  return {
    stops: new Map(ids.map((id) => [id, stop(id)])),
    routes: [
      route("TXD-01", [["K", 0], ["CAM", 12], ["G2", 25], ["CON", 45]]),
      route("TXD-02", [["CON", 0], ["SP", 8], ["M", 18]]),
      route("TXD-03", [["K", 0], ["CAM", 10]]),
      route("TXD-04", [["1M", 0], ["M", 8]]),
      route("TXD-05", [["G2", 0], ["AER", 15], ["SP", 30]]),
      route("ABD-01", [["K", 0], ["CAM", 15], ["RP", 35], ["AER", 45], ["1M", 60], ["M", 70]], "autocarro"),
      route("ABD-02", [["CAM", 0], ["G2", 12], ["RP", 22], ["AER", 30], ["1M", 45]], "autocarro"),
    ],
    fares: [
      fare("TXD-01", 300), fare("TXD-01", 150, "K", "CAM"), fare("TXD-02", 200), fare("TXD-03", 150),
      fare("TXD-05", 250), fare("ABD-01", 200), fare("ABD-02", 150),
      // TXD-04 intentionally has no fare
    ],
  };
}

const codes = (it: { legs: { route: { code: string } }[] }) => it.legs.map((l) => l.route.code).join(">");

describe("findItineraries", () => {
  it("finds the direct bus Kilamba → Mutamba with its registered time and fare", () => {
    const res = findItineraries(pilotNetwork(), "K", "M", { maxTransfers: 0 });
    expect(res.map(codes)).toEqual(["ABD-01"]);
    expect(res[0]!.totalMinutes).toBe(70);
    expect(res[0]!.totalFareKz).toBe(200);
    expect(res[0]!.transfers).toBe(0);
  });

  it("with 1 transfer adds taxi TXD-01 → TXD-02 via Congolenses", () => {
    const res = findItineraries(pilotNetwork(), "K", "M", { maxTransfers: 1 });
    expect(res.map(codes).sort()).toEqual(["ABD-01", "TXD-01>TXD-02"]);
    const combo = res.find((r) => codes(r) === "TXD-01>TXD-02")!;
    expect(combo.legs[0]!.alight.id).toBe("CON");
    expect(combo.totalFareKz).toBe(500);
    expect(combo.totalMinutes).toBe(45 + 18 + 10); // ride + 10 min transfer penalty
  });

  it("never returns more transfers than the configured maximum", () => {
    for (const max of [0, 1, 2, 3]) {
      const res = findItineraries(pilotNetwork(), "K", "M", { maxTransfers: max });
      expect(res.every((r) => r.transfers <= max)).toBe(true);
    }
  });

  it("with 2 transfers includes taxi + bus + taxi combinations", () => {
    const res = findItineraries(pilotNetwork(), "K", "M", { maxTransfers: 2 });
    expect(res.map(codes)).toContain("TXD-03>ABD-02>TXD-04");
    expect(res.map(codes)).toContain("TXD-01>TXD-05>TXD-02");
  });

  it("never visits a stop twice or reuses a route", () => {
    const res = findItineraries(pilotNetwork(), "K", "M", { maxTransfers: 3 });
    for (const it of res) {
      const visited = it.legs.flatMap((l, i) => (i === 0 ? l.path : l.path.slice(1))).map((s) => s.id);
      expect(new Set(visited).size).toBe(visited.length);
      const used = it.legs.map((l) => l.route.id);
      expect(new Set(used).size).toBe(used.length);
    }
  });

  it("does not leave a route that already continues to the destination", () => {
    const res = findItineraries(pilotNetwork(), "K", "M", { maxTransfers: 3 });
    expect(res.filter((r) => r.legs[0]!.route.code === "ABD-01").map(codes)).toEqual(["ABD-01"]);
  });

  it("marks the price incomplete when a leg has no registered fare", () => {
    const res = findItineraries(pilotNetwork(), "K", "M", { maxTransfers: 2 });
    const it = res.find((r) => codes(r) === "TXD-03>ABD-02>TXD-04")!;
    expect(it.fareComplete).toBe(false);
    expect(it.legs[2]!.fareKz).toBeNull();
  });

  it("returns nothing (never invents) when no registered route connects the stops", () => {
    expect(findItineraries(pilotNetwork(), "K", "BEN", { maxTransfers: 3 })).toEqual([]);
    expect(findItineraries(pilotNetwork(), "K", "K", { maxTransfers: 3 })).toEqual([]);
    expect(findItineraries(pilotNetwork(), "K", "UNKNOWN", { maxTransfers: 3 })).toEqual([]);
  });

  it("respects can_board / can_alight restrictions", () => {
    const net = pilotNetwork();
    const abd = net.routes.find((r) => r.code === "ABD-01")!;
    abd.stops[5]!.canAlight = false; // cannot alight at Mutamba
    const res = findItineraries(net, "K", "M", { maxTransfers: 0 });
    expect(res).toEqual([]);
  });

  it("keeps the total time unknown when a leg has no registered time", () => {
    const net = pilotNetwork();
    net.routes.find((r) => r.code === "ABD-01")!.stops[5]!.minutesFromStart = null;
    const res = findItineraries(net, "K", "M", { maxTransfers: 0 });
    expect(res[0]!.totalMinutes).toBeNull();
  });
});

describe("resolveFare", () => {
  it("prefers a segment fare over the route's flat fare", () => {
    const { fares } = pilotNetwork();
    expect(resolveFare(fares, "TXD-01", "K", "CAM")?.amountKz).toBe(150);
    expect(resolveFare(fares, "TXD-01", "K", "CON")?.amountKz).toBe(300);
    expect(resolveFare(fares, "TXD-04", "1M", "M")).toBeNull();
  });
});

describe("sortItineraries", () => {
  it("orders by price, duration and number of transfers", () => {
    const res = findItineraries(pilotNetwork(), "K", "M", { maxTransfers: 2 });
    const byPrice = sortItineraries(res, "preco");
    expect(codes(byPrice[0]!)).toBe("ABD-01"); // 200 Kz
    expect(byPrice.at(-1)!.fareComplete).toBe(false); // unknown price goes last
    const byTransfers = sortItineraries(res, "transferencias");
    expect(byTransfers[0]!.transfers).toBe(0);
    const byTime = sortItineraries(res, "duracao");
    expect(byTime[0]!.totalMinutes).toBe(70);
  });
});
