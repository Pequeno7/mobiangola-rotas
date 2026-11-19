import { supabase } from "@/integrations/supabase/client";

/** Records an anonymous search for usage statistics. Failures never block the user. */
export async function logTripSearch(input: {
  originStopId: string;
  destinationStopId: string;
  maxTransfers: number;
  resultsCount: number;
  source: "web" | "api" | "android";
}) {
  const { error } = await supabase.from("trip_searches").insert({
    origin_stop_id: input.originStopId,
    destination_stop_id: input.destinationStopId,
    max_transfers: input.maxTransfers,
    results_count: Math.min(input.resultsCount, 1000),
    source: input.source,
  });
  if (error) console.warn("Falha ao registar pesquisa:", error.message);
}
