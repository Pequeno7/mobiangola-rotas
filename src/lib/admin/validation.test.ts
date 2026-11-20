import { describe, expect, it } from "vitest";
import {
  parseAliases,
  safeRedirect,
  toCode,
  toRouteStopsPayload,
  toSlug,
  validateFare,
  validateRouteStops,
  validateStop,
  type RouteStopDraft,
} from "./validation";

const rs = (stopId: string, minutes: number | null, extra: Partial<RouteStopDraft> = {}): RouteStopDraft => ({
  stopId,
  minutesFromStart: minutes,
  canBoard: true,
  canAlight: true,
  boardingNotes: "",
  ...extra,
});

describe("validateStop", () => {
  it("accepts a stop in Luanda", () => {
    expect(validateStop({ name: "Mutamba", lat: -8.8147, lng: 13.2302 })).toEqual([]);
  });
  it("rejects a location outside Angola", () => {
    expect(validateStop({ name: "Lisboa", lat: 38.72, lng: -9.14 })).toHaveLength(1);
  });
  it("requires a location", () => {
    expect(validateStop({ name: "Kilamba", lat: null, lng: null })).toHaveLength(1);
  });
  it("requires a name of at least 2 characters", () => {
    expect(validateStop({ name: " K ", lat: -8.99, lng: 13.27 })).toHaveLength(1);
  });
});

describe("codes and aliases", () => {
  it("turns a transport name into a code", () => {
    expect(toCode("Táxi Colectivo")).toBe("taxi_colectivo");
  });
  it("turns a city name into a slug", () => {
    expect(toSlug("Luanda Sul")).toBe("luanda-sul");
  });
  it("splits aliases and drops duplicates", () => {
    expect(parseAliases("Mutamba, Largo da Mutamba , mutamba,")).toEqual(["Mutamba", "Largo da Mutamba"]);
  });
});

describe("validateRouteStops", () => {
  it("accepts an ordered route with increasing times", () => {
    expect(validateRouteStops([rs("a", 0), rs("b", null), rs("c", 25)])).toEqual([]);
  });
  it("needs at least 2 stops", () => {
    expect(validateRouteStops([rs("a", 0)])).toHaveLength(1);
  });
  it("rejects the same stop twice", () => {
    expect(validateRouteStops([rs("a", 0), rs("b", 5), rs("a", 10)]).join()).toMatch(/mais de uma vez/);
  });
  it("rejects times that go down along the route", () => {
    expect(validateRouteStops([rs("a", 0), rs("b", 20), rs("c", 10)]).join()).toMatch(/menor/);
  });
  it("requires boarding at the first stop and alighting at the last", () => {
    const errors = validateRouteStops([rs("a", 0, { canBoard: false }), rs("b", 10, { canAlight: false })]);
    expect(errors).toHaveLength(2);
  });
  it("numbers stops from 1 in the order given", () => {
    expect(toRouteStopsPayload([rs("x", 0), rs("y", 4)]).map((p) => [p.stop_id, p.seq])).toEqual([
      ["x", 1],
      ["y", 2],
    ]);
  });
});

describe("validateFare", () => {
  const route = ["a", "b", "c"];
  it("accepts a flat fare for the whole route", () => {
    expect(validateFare({ fromStopId: null, toStopId: null, amountKz: 300 }, route)).toEqual([]);
  });
  it("accepts a fare between two stops in route order", () => {
    expect(validateFare({ fromStopId: "a", toStopId: "c", amountKz: 500 }, route)).toEqual([]);
  });
  it("rejects a fare of 0 Kz", () => {
    expect(validateFare({ fromStopId: null, toStopId: null, amountKz: 0 }, route)).toHaveLength(1);
  });
  it("rejects stops in the wrong order", () => {
    expect(validateFare({ fromStopId: "c", toStopId: "a", amountKz: 200 }, route)).toHaveLength(1);
  });
  it("rejects only one of the two stops", () => {
    expect(validateFare({ fromStopId: "a", toStopId: null, amountKz: 200 }, route)).toHaveLength(1);
  });
});

describe("safeRedirect", () => {
  it("keeps same-origin paths", () => {
    expect(safeRedirect("/admin/rotas")).toBe("/admin/rotas");
  });
  it("blocks other sites", () => {
    expect(safeRedirect("//evil.example")).toBe("/admin");
    expect(safeRedirect("https://evil.example")).toBe("/admin");
  });
});
