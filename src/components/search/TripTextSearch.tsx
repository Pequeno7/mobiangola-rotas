import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MessageSquareText, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TRIP_TEXT_MAX_LENGTH } from "@/lib/trip-intent/resolve";
import { interpretTrip } from "@/lib/trip-intent/trip-intent.functions";

interface Props {
  defaultMaxTransfers: number;
  /** Prefills the main form with whatever stops were recognised. */
  onPartial: (originStopId: string | null, destinationStopId: string | null) => void;
}

const EXAMPLE = "Estou no Kilamba e quero ir para a Mutamba";

/** Lets passengers describe the trip in their own words; a model maps it to registered stops. */
export function TripTextSearch({ defaultMaxTransfers, onPartial }: Props) {
  const navigate = useNavigate();
  const interpret = useServerFn(interpretTrip);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (value.length < 3) {
      setMessage("Escreva de onde parte e para onde vai.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const result = await interpret({ data: { text: value } });
      if (result.status === "ok") {
        toast.success(`Entendi: ${result.originName} → ${result.destinationName}`);
        navigate({
          to: "/viagens",
          search: {
            de: result.originStopId,
            para: result.destinationStopId,
            max: result.maxTransfers ?? defaultMaxTransfers,
            ordem: "duracao",
          },
        });
        return;
      }
      if (result.status === "incompleto") onPartial(result.originStopId, result.destinationStopId);
      setMessage(result.message);
    } catch {
      setMessage("Não foi possível interpretar o texto agora. Tente de novo ou use a pesquisa acima.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section aria-labelledby="trip-text-title" className="rounded-3xl border bg-card p-4 shadow-card">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-accent text-primary">
          <MessageSquareText className="size-5" />
        </span>
        <div>
          <h2 id="trip-text-title" className="font-semibold">Descreva a sua viagem</h2>
          <p className="text-xs text-muted-foreground">Escreva por palavras suas e nós encontramos as paragens.</p>
        </div>
      </div>
      <form onSubmit={submit} className="mt-3 space-y-2">
        <label htmlFor="trip-text" className="sr-only">Descrição da viagem</label>
        <textarea
          id="trip-text"
          rows={2}
          maxLength={TRIP_TEXT_MAX_LENGTH}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder={`Ex.: ${EXAMPLE}`}
          className="w-full resize-none rounded-xl border bg-background px-3 py-2.5 text-base outline-none placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-ring/30"
        />
        {message && (
          <p role="status" className="rounded-xl bg-secondary px-3 py-2 text-sm text-secondary-foreground">
            {message}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <Send />}
          {loading ? "A interpretar…" : "Interpretar e procurar"}
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Só são usadas paragens e rotas registadas no MobiAngola. Confirme a origem e o destino nos resultados.
        </p>
      </form>
    </section>
  );
}
