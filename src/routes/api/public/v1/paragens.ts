import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { apiError, json, preflight, serializeStop } from "@/lib/api/serialize";
import { DEFAULT_CITY, fetchNetwork } from "@/lib/network";

const query = z.object({ cidade: z.string().regex(/^[a-z0-9-]{2,40}$/).default(DEFAULT_CITY) });

export const Route = createFileRoute("/api/public/v1/paragens")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request }) => {
        const parsed = query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!parsed.success) return apiError(400, "parametros_invalidos", "Parâmetros inválidos.", parsed.error.flatten());
        try {
          const net = await fetchNetwork(parsed.data.cidade);
          return json({ cidade: net.city, total: net.stops.length, paragens: net.stops.map(serializeStop) });
        } catch (e) {
          return apiError(404, "cidade_nao_encontrada", e instanceof Error ? e.message : "Erro desconhecido.");
        }
      },
    },
  },
});
