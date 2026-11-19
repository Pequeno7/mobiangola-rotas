import { Link } from "@tanstack/react-router";
import { Home, Map as MapIcon, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const NAV: { to: "/" | "/mapa"; label: string; icon: LucideIcon }[] = [
  { to: "/", label: "Início", icon: Home },
  { to: "/mapa", label: "Mapa", icon: MapIcon },
];

export function AppShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col bg-background">
      <main className={cn("flex-1 pb-24", className)}>{children}</main>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-[1000] border-t bg-background/95 backdrop-blur"
      >
        <ul className="mx-auto flex max-w-xl">
          {NAV.map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex-1">
              <Link
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="flex flex-col items-center gap-1 py-2.5 text-xs font-medium text-muted-foreground transition-colors data-[status=active]:text-primary"
              >
                <Icon className="size-5" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
