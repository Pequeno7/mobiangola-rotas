/**
 * Free-text trip interpretation: prompt, output schema and validation of the model's answer.
 * Pure module (no network, database or UI) so it can be unit-tested.
 */
import type { Stop } from "@/lib/routing/types";

export const TRIP_TEXT_MAX_LENGTH = 300;

/** What the model must return (strict JSON schema). */
export interface ModelTripAnswer {
  origem_mencionada: string | null;
  origem_paragem_id: string | null;
  destino_mencionado: string | null;
  destino_paragem_id: string | null;
  max_transferencias: number | null;
}

export const TRIP_ANSWER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "origem_mencionada",
    "origem_paragem_id",
    "destino_mencionado",
    "destino_paragem_id",
    "max_transferencias",
  ],
  properties: {
    origem_mencionada: { type: ["string", "null"], description: "Local de partida tal como o passageiro o escreveu." },
    origem_paragem_id: { type: ["string", "null"], description: "id da paragem registada que corresponde à origem, ou null." },
    destino_mencionado: { type: ["string", "null"], description: "Local de chegada tal como o passageiro o escreveu." },
    destino_paragem_id: { type: ["string", "null"], description: "id da paragem registada que corresponde ao destino, ou null." },
    max_transferencias: {
      type: ["integer", "null"],
      description: "Máximo de trocas pedido explicitamente (0 = direto), ou null se não for mencionado.",
    },
  },
} as const;

export function buildTripPrompt(stops: Pick<Stop, "id" | "name">[]) {
  const list = stops.map((s) => `- ${s.id} | ${s.name}`).join("\n");
  return [
    "És o assistente de transportes do MobiAngola, em Luanda (Angola).",
    "O passageiro descreve, em português (pode ser informal ou com erros), de onde parte e para onde quer ir.",
    "Identifica a origem e o destino e associa cada um a UMA paragem da lista de paragens registadas abaixo.",
    "Regras:",
    "- Usa apenas ids que estejam na lista. Nunca inventes paragens nem ids.",
    "- Aceita erros de escrita, falta de acentos e artigos (ex.: 'kilamba', 'do Kilamba', 'na mutamba').",
    "- Se o local mencionado não estiver claramente na lista, devolve o id como null, mesmo que conheças um sítio perto.",
    "- Se o passageiro disser onde está agora ('estou em...', 'saio de...'), isso é a origem.",
    "- Se não mencionar origem ou destino, deixa os dois campos correspondentes a null.",
    "- max_transferencias só é preenchido se o passageiro pedir explicitamente (ex.: 'sem trocas' = 0, 'no máximo uma troca' = 1).",
    "",
    "Paragens registadas (id | nome):",
    list,
  ].join("\n");
}

export type TripIntentResult =
  | {
      status: "ok";
      originStopId: string;
      destinationStopId: string;
      originName: string;
      destinationName: string;
      maxTransfers: number | null;
    }
  | {
      status: "incompleto";
      /** Stops that were recognised, so the form can be prefilled. */
      originStopId: string | null;
      destinationStopId: string | null;
      message: string;
    }
  | { status: "erro"; message: string };

const quoted = (s: string | null) => (s && s.trim() ? `"${s.trim()}"` : null);

/** Checks the model's answer against the registered stops. Unknown ids are discarded, never trusted. */
export function resolveTripAnswer(
  answer: ModelTripAnswer,
  stops: Pick<Stop, "id" | "name">[],
  maxTransfersLimit: number,
): TripIntentResult {
  const byId = new Map(stops.map((s) => [s.id, s]));
  const origin = answer.origem_paragem_id ? byId.get(answer.origem_paragem_id) : undefined;
  const destination = answer.destino_paragem_id ? byId.get(answer.destino_paragem_id) : undefined;

  if (origin && destination) {
    if (origin.id === destination.id) {
      return {
        status: "incompleto",
        originStopId: origin.id,
        destinationStopId: null,
        message: `A origem e o destino parecem ser a mesma paragem (${origin.name}). Indique para onde quer ir.`,
      };
    }
    const max = answer.max_transferencias;
    return {
      status: "ok",
      originStopId: origin.id,
      destinationStopId: destination.id,
      originName: origin.name,
      destinationName: destination.name,
      maxTransfers:
        typeof max === "number" && Number.isInteger(max) ? Math.min(Math.max(max, 0), maxTransfersLimit) : null,
    };
  }

  const problems: string[] = [];
  if (!origin) {
    const said = quoted(answer.origem_mencionada);
    problems.push(said ? `não encontrei ${said} nas paragens registadas` : "não percebi de onde parte");
  }
  if (!destination) {
    const said = quoted(answer.destino_mencionado);
    problems.push(said ? `não encontrei ${said} nas paragens registadas` : "não percebi para onde vai");
  }
  const sentence = problems.join(" e ");
  return {
    status: "incompleto",
    originStopId: origin?.id ?? null,
    destinationStopId: destination?.id ?? null,
    message: `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}. Escreva de novo ou escolha a paragem na lista.`,
  };
}
