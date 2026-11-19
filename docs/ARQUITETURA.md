# MobiAngola — Arquitetura

## Visão geral

```text
┌──────────────────────────┐      HTTP/JSON       ┌────────────────────────────┐
│ App web (telemóvel)      │ ───────────────────▶ │ Base de dados (Postgres)   │
│ React + TanStack Start   │   leitura pública    │ províncias, cidades,       │
│ Mapa Leaflet + OSM       │   (RLS)              │ paragens, rotas, tarifas…  │
└──────────┬───────────────┘                      └─────────────▲──────────────┘
           │ motor de rotas (TypeScript, puro)                  │
           ▼                                                    │
┌──────────────────────────┐   GET /api/public/v1/*   ┌─────────┴──────────────┐
│ API REST pública v1      │ ◀─────────────────────── │ App Android nativa     │
│ (mesmo motor de rotas)   │                          │ Kivy/KivyMD (externa)  │
└──────────────────────────┘                          └────────────────────────┘
```

## Pastas

| Pasta | Conteúdo |
|---|---|
| `src/lib/routing/` | Motor de rotas puro (sem base de dados nem UI) + testes |
| `src/lib/network.ts` | Carrega a rede de uma cidade e converte para tipos do motor |
| `src/lib/api/` | Formato JSON da API pública |
| `src/routes/` | Ecrãs: `/` pesquisa, `/viagens` alternativas, `/viagem` instruções, `/mapa` |
| `src/routes/api/public/v1/` | API REST: `paragens`, `rotas`, `viagens` |
| `src/components/` | Mapa, cartões de alternativas, linha temporal das etapas |

## Base de dados

- `provinces` → `cities` → `stops` (coordenadas, notas de embarque, `verified`, `is_demo`)
- `transport_types` (`taxi_colectivo`, `autocarro`)
- `routes` (código, destino escrito no veículo, operador, `is_demo`, `verified`, `active`)
- `route_stops` (ordem, minutos desde o início, embarque/desembarque permitidos)
- `fares` (tarifa da rota inteira ou de um troço, em Kz)
- `verifications` (histórico de verificação), `trip_searches` (estatísticas)
- `user_roles` + função `has_role` (administradores)

Acesso: leitura pública de paragens/rotas/tarifas; escrita só para administradores; qualquer pessoa regista
pesquisas; só administradores leem estatísticas.

## Motor de rotas

Pesquisa em profundidade sobre as rotas registadas, até `max_transferencias`:

- sem ciclos (nenhuma paragem visitada duas vezes) e sem repetir a mesma rota;
- embarque/desembarque só onde permitido e sempre no sentido da rota;
- não sai de uma rota que já segue até ao destino;
- não apanha uma rota numa paragem se podia tê-la apanhado numa paragem anterior da viagem;
- tempo = soma dos tempos registados + 10 min por transferência (desconhecido se faltar algum tempo);
- custo = tarifa do troço, senão tarifa da rota; se faltar alguma, o custo fica marcado como incompleto;
- ordenação por duração, preço ou transferências.

Nada é inventado: sem dados, sem resultados.

## Dados de demonstração

Rotas `TXD-*` (táxi) e `ABD-*` (autocarro) e as suas tarifas são **fictícias** (`is_demo = true`).
As paragens têm nomes reais mas coordenadas aproximadas e não verificadas.

## Testes

`bunx vitest run` — `src/lib/routing/engine.test.ts` cobre diretas, transferências, limite de
transferências, ciclos, restrições de embarque, tarifas em falta e ordenação.
