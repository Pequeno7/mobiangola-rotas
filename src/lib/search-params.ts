import { z } from "zod";

export const MAX_TRANSFERS_UI = 3;

export const sortSchema = z.enum(["duracao", "preco", "transferencias"]);

export const tripSearchSchema = z.object({
  de: z.string().uuid().optional().catch(undefined),
  para: z.string().uuid().optional().catch(undefined),
  max: z.coerce.number().int().min(0).max(MAX_TRANSFERS_UI).catch(2),
  ordem: sortSchema.catch("duracao"),
});
export type TripSearch = z.infer<typeof tripSearchSchema>;

export const tripDetailSchema = tripSearchSchema.extend({
  alt: z.string().max(2000).optional().catch(undefined),
});
export type TripDetailSearch = z.infer<typeof tripDetailSchema>;

export const SORT_LABELS: Record<z.infer<typeof sortSchema>, string> = {
  duracao: "Mais rápida",
  preco: "Mais barata",
  transferencias: "Menos trocas",
};
