import { describe, expect, it } from "vitest";
import { resolveTripAnswer, type ModelTripAnswer } from "./resolve";

const stops = [
  { id: "kil", name: "Kilamba" },
  { id: "mut", name: "Mutamba" },
];
const answer = (a: Partial<ModelTripAnswer>): ModelTripAnswer => ({
  origem_mencionada: null, origem_paragem_id: null, destino_mencionado: null, destino_paragem_id: null,
  max_transferencias: null, ...a,
});

describe("resolveTripAnswer", () => {
  it("accepts origin and destination that are registered stops", () => {
    const r = resolveTripAnswer(answer({ origem_paragem_id: "kil", destino_paragem_id: "mut" }), stops, 3);
    expect(r).toMatchObject({ status: "ok", originStopId: "kil", destinationStopId: "mut", maxTransfers: null });
  });

  it("discards ids that are not registered stops instead of trusting the model", () => {
    const r = resolveTripAnswer(
      answer({ origem_paragem_id: "inventado", origem_mencionada: "Viana", destino_paragem_id: "mut" }),
      stops, 3,
    );
    expect(r.status).toBe("incompleto");
    if (r.status === "incompleto") {
      expect(r.originStopId).toBeNull();
      expect(r.destinationStopId).toBe("mut");
      expect(r.message).toContain('"Viana"');
    }
  });

  it("rejects the same stop as origin and destination", () => {
    const r = resolveTripAnswer(answer({ origem_paragem_id: "kil", destino_paragem_id: "kil" }), stops, 3);
    expect(r.status).toBe("incompleto");
  });

  it("clamps the requested number of transfers to the app limit", () => {
    const r = resolveTripAnswer(
      answer({ origem_paragem_id: "kil", destino_paragem_id: "mut", max_transferencias: 9 }), stops, 3,
    );
    expect(r.status === "ok" && r.maxTransfers).toBe(3);
  });
});
