import { AlertTriangle, BadgeCheck, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function DemoBadge() {
  return (
    <Badge variant="demo" className="gap-1">
      <FlaskConical className="size-3" /> Fictício
    </Badge>
  );
}

export function VerificationBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <Badge variant="verified" className="gap-1">
      <BadgeCheck className="size-3" /> Verificado
    </Badge>
  ) : (
    <Badge variant="unverified" className="gap-1">
      <AlertTriangle className="size-3" /> Não verificado
    </Badge>
  );
}

export function TransportBadge({ code, label }: { code: string; label?: string }) {
  const isBus = code === "autocarro";
  return <Badge variant={isBus ? "bus" : "taxi"}>{label ?? (isBus ? "Autocarro" : "Táxi colectivo")}</Badge>;
}

export function DemoNotice() {
  return (
    <div className="flex gap-3 rounded-2xl border border-warning/50 bg-warning/15 p-4 text-sm text-warning-foreground">
      <FlaskConical className="mt-0.5 size-5 shrink-0" />
      <p>
        <strong>Dados de demonstração.</strong> As rotas, códigos e tarifas atuais são fictícios e servem
        apenas para testar a plataforma. As localizações das paragens são aproximadas e ainda não foram
        verificadas.
      </p>
    </div>
  );
}
