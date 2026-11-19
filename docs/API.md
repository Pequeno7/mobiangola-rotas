# MobiAngola API REST — v1

Base: `https://<domínio>/api/public/v1`. Respostas em JSON (UTF-8). Só leitura, sem autenticação.
Campos `ficticio`/`ficticia: true` indicam dados de demonstração.

## GET /api/public/v1/paragens

Parâmetros: `cidade` (opcional, padrão `luanda`).

```json
{ "cidade": {...}, "total": 10, "paragens": [{ "id": "uuid", "nome": "Kilamba", "lat": -8.996, "lng": 13.272, "verificada": false, "notas_embarque": "..." }] }
```

## GET /api/public/v1/rotas

Parâmetros: `cidade`. Devolve rotas activas com `codigo`, `transporte`, `destino_no_veiculo`,
`ficticio`, `verificada` e `paragens` por `ordem` (com `minutos_desde_inicio`, `embarque_permitido`,
`desembarque_permitido`).

## GET /api/public/v1/viagens

| Parâmetro | Obrigatório | Valores |
|---|---|---|
| `origem` | sim | id (uuid) da paragem |
| `destino` | sim | id (uuid) da paragem |
| `max_transferencias` | não | 0–4 (padrão 2) |
| `ordem` | não | `duracao` (padrão), `preco`, `transferencias` |
| `fonte` | não | `api` (padrão) ou `android` — apenas para estatísticas |
| `cidade` | não | padrão `luanda` |

Cada alternativa: `transferencias`, `tempo_estimado_min` (ou `null`), `custo_estimado_kz` (ou `null` se faltar
alguma tarifa), `distancia_km`, `contem_dados_ficticios`, `etapas[]` com `transporte`, `rota.codigo`,
`destino_no_veiculo`, `embarque`, `local_exato_embarque`, `desembarque`, `paragens_percorridas`,
`tempo_estimado_min`, `custo_estimado_kz` e `proximo_transporte`.

## Erros

```json
{ "error": { "code": "parametros_invalidos", "message": "Parâmetros inválidos.", "details": {...} } }
```

Códigos: `parametros_invalidos` (400), `origem_igual_destino` (400), `cidade_nao_encontrada` (404),
`paragem_nao_encontrada` (404).
