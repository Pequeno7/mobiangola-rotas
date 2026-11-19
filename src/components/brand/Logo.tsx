import { cn } from "@/lib/utils";

/** MobiAngola mark: a map pin carrying a road. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={cn("size-9", className)}>
      <rect width="48" height="48" rx="14" className="fill-primary-foreground" />
      <path
        d="M24 8c-7.2 0-13 5.6-13 12.6C11 30 24 40 24 40s13-10 13-19.4C37 13.6 31.2 8 24 8Z"
        className="fill-primary"
      />
      <path d="M17 22.5h14" className="stroke-primary-foreground" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M20 17.5h8M20 27.5h8" className="stroke-primary-foreground/70" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span
        className={cn(
          "font-display text-xl font-bold tracking-tight",
          inverted ? "text-primary-foreground" : "text-primary-deep",
        )}
      >
        Mobi<span className={inverted ? "text-accent" : "text-primary"}>Angola</span>
      </span>
    </span>
  );
}
