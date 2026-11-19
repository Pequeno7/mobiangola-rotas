import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { apiError, json, preflight, serializeItinerary, serializeStop } from "@/lib/api/serialize";
import { buildNetwork, DEFAULT_CITY, fetchNetwork } from "@/lib/network";
import { findItineraries, MAX_TRANSFERS_LIMIT, sortItineraries } from "@/lib/routing/engine";
import { logTripSearch } from "@/lib/search-log";

const query = z.object({
  cidade: z.string().regex(/^[a-z0-9-]{2,40}$/).default(DEFAULT_CITY),
  origem: z.string().uuid(),
  destino: z.string().uuid(),
  max_transferencias: z.coerce.number().int().min(0).max(MAX_TRANSFERS_LIMIT).default(2),
  ordem: z.enum(["duracao", "preco", "transferencias"]).default("duracao"),
  fonte: z.enum(["api", "android"]).default("api"),
});

export const Route = createFileRoute("/api/public/v1/viagens")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request }) => {
        const parsed = query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!parsed.success) return apiError(400, "parametros_invalidos", "Parâmetros inválidos.", parsed.error.flatten());
        const q = parsed.data;
        if (q.origem === q.destino) return apiError(400, "origem_igual_destino", "A origem e o destino têm de ser diferentes.");

        let data;
        try {
          data = await fetchNetwork(q.cidade);
        } catch (e) {
          return apiError(404, "cidade_nao_encontrada", e instanceof Error ? e.message : "Erro desconhecido.");
        }
        const network = buildNetwork(data);
        const origin = network.stops.get(q.origem);
        const destination = network.stops.get(q.destino);
        if (!origin || !destination) return apiError(404, "paragem_nao_encontrada", "Origem ou destino não registados.");

        const results = sortItineraries(
          findItineraries(network, origin.id, destination.id, { maxTransfers: q.max_transferencias }),
          q.ordem,
        );
        await logTripSearch({
          originStopId: origin.id,
          destinationStopId: destination.id,
          maxTransfers: q.max_transferencias,
          resultsCount: results.length,
          source: q.fonte,
        });
        return json({
          origem: serializeStop(origin),
          destino: serializeStop(destination),
          max_transferencias: q.max_transferencias,
          ordem: q.ordem,
          total: results.length,
          mensagem: results.length === 0 ? "Não existem rotas registadas que liguem estas paragens dentro dos limites definidos." : null,
          alternativas: results.map(serializeItinerary),
        });
      },
    },
  },
});
