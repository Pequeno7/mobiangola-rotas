/** Server-only: asks the AI Gateway model to read a passenger's free-text trip description. */
import {
  GatewayError,
  generateResponse,
  PaymentRequiredError,
  RateLimitError,
} from "@lovable.dev/ai-gateway";
import { DEFAULT_CITY, fetchNetwork } from "@/lib/network";
import { MAX_TRANSFERS_UI } from "@/lib/search-params";
import {
  buildTripPrompt,
  resolveTripAnswer,
  TRIP_ANSWER_SCHEMA,
  type ModelTripAnswer,
  type TripIntentResult,
} from "./resolve";

const MODEL = "openai/gpt-6-astra";

export async function interpretTripText(text: string, citySlug: string = DEFAULT_CITY): Promise<TripIntentResult> {
  const network = await fetchNetwork(citySlug);
  if (network.stops.length === 0) return { status: "erro", message: "Ainda não há paragens registadas." };

  let raw: string;
  try {
    const response = await generateResponse({
      model: MODEL,
      reasoning: { effort: "low" },
      instructions: buildTripPrompt(network.stops),
      input: [{ role: "user", content: text }],
      text: {
        format: { type: "json_schema", name: "viagem_pedida", strict: true, schema: TRIP_ANSWER_SCHEMA },
      },
    });
    raw = extractText(response.output);
  } catch (e) {
    if (e instanceof GatewayError) {
      console.error("AI Gateway error", e.code, e.httpStatus, e.ids);
      if (e instanceof RateLimitError)
        return { status: "erro", message: "Muitos pedidos neste momento. Tente daqui a um minuto." };
      if (e instanceof PaymentRequiredError)
        return { status: "erro", message: "A pesquisa por texto está temporariamente indisponível. Use a pesquisa normal." };
      return { status: "erro", message: "Não foi possível interpretar o texto agora. Tente de novo ou use a pesquisa normal." };
    }
    throw e;
  }

  let answer: ModelTripAnswer;
  try {
    answer = JSON.parse(raw) as ModelTripAnswer;
  } catch {
    console.error("AI answer was not JSON:", raw.slice(0, 200));
    return { status: "erro", message: "Não consegui perceber o pedido. Tente escrever de outra forma." };
  }
  return resolveTripAnswer(answer, network.stops, MAX_TRANSFERS_UI);
}

function extractText(output: unknown): string {
  if (!Array.isArray(output)) return "";
  const parts: string[] = [];
  for (const item of output) {
    if (item && typeof item === "object" && (item as { type?: string }).type === "message") {
      for (const c of (item as { content?: unknown[] }).content ?? []) {
        const part = c as { type?: string; text?: string };
        if (part.type === "output_text" && typeof part.text === "string") parts.push(part.text);
      }
    }
  }
  return parts.join("");
}
