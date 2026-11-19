import { MapPin, X } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import type { Stop } from "@/lib/routing/types";
import { cn } from "@/lib/utils";

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

interface Props {
  label: string;
  placeholder: string;
  stops: Stop[];
  value: string | null;
  onChange: (stopId: string | null) => void;
  dotClassName: string;
}

/** Text field with stop suggestions. Only registered stops can be chosen. */
export function StopPicker({ label, placeholder, stops, value, onChange, dotClassName }: Props) {
  const selected = stops.find((s) => s.id === value) ?? null;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    const q = normalize(query);
    const list = q ? stops.filter((s) => normalize(s.name).includes(q)) : stops;
    return list.slice(0, 8);
  }, [query, stops]);

  const choose = (s: Stop) => {
    onChange(s.id);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="relative">
      <label className="flex items-center gap-3 rounded-xl px-3 py-2.5 focus-within:bg-accent/60">
        <span className={cn("size-3 shrink-0 rounded-full ring-4", dotClassName)} aria-hidden="true" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            className="w-full bg-transparent text-base font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground/70"
            placeholder={placeholder}
            value={open ? query : (selected?.name ?? query)}
            onFocus={() => {
              setOpen(true);
              setQuery("");
              setActive(0);
            }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, suggestions.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && open && suggestions[active]) {
                e.preventDefault();
                choose(suggestions[active]);
                inputRef.current?.blur();
              }
            }}
          />
        </span>
        {selected && !open && (
          <button
            type="button"
            aria-label={`Limpar ${label.toLowerCase()}`}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted"
            onClick={() => onChange(null)}
          >
            <X className="size-4" />
          </button>
        )}
      </label>
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-72 overflow-auto rounded-xl border bg-popover p-1 shadow-card"
        >
          {suggestions.length === 0 ? (
            <li className="px-3 py-3 text-sm text-muted-foreground">
              Nenhuma paragem registada com esse nome.
            </li>
          ) : (
            suggestions.map((s, i) => (
              <li
                key={s.id}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(s)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                  i === active ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                )}
              >
                <MapPin className="size-4 shrink-0 text-primary" />
                <span className="flex-1 font-medium">{s.name}</span>
                {!s.verified && <span className="text-[11px] text-muted-foreground">não verificada</span>}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
