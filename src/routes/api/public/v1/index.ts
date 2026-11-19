import { createFileRoute } from "@tanstack/react-router";
import { API_VERSION, json, preflight } from "@/lib/api/serialize";

export const Route = createFileRoute("/api/public/v1/")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async () =>
        json({
          nome: "MobiAngola API",
          versao: API_VERSION,
          endpoints: {
            "GET /api/public/v1/paragens?cidade=luanda": "Lista de paragens registadas",
            "GET /api/public/v1/rotas?cidade=luanda": "Rotas activas com paragens por ordem",
            "GET /api/public/v1/viagens?origem=<id>&destino=<id>&max_transferencias=2&ordem=duracao&fonte=android":
              "Alternativas de viagem calculadas pelo motor de rotas",
          },
          aviso: "Dados com 'ficticio: true' são de demonstração e não representam transportes reais.",
        }),
    },
  },
});
