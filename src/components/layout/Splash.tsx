import { useEffect, useState } from "react";
import { LogoMark } from "@/components/brand/Logo";

const SEEN_KEY = "mobiangola:splash-seen";

/** Brief branded splash on the first visit of a browser session. */
export function Splash() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem(SEEN_KEY)) {
      setVisible(false);
      return;
    }
    const t = setTimeout(() => {
      sessionStorage.setItem(SEEN_KEY, "1");
      setVisible(false);
    }, 1400);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;
  return (
    <div
      role="status"
      aria-label="A carregar MobiAngola"
      className="fixed inset-0 z-[2000] flex flex-col items-center justify-center gap-5 bg-gradient-hero text-primary-foreground"
    >
      <div className="animate-splash-pop">
        <LogoMark className="size-24 drop-shadow-xl" />
      </div>
      <div className="animate-splash-pop text-center [animation-delay:150ms]">
        <p className="font-display text-4xl font-bold tracking-tight">
          Mobi<span className="text-accent">Angola</span>
        </p>
        <p className="mt-1 text-sm text-primary-foreground/80">Mobilidade urbana em Angola</p>
      </div>
      <div className="mt-6 h-1 w-40 overflow-hidden rounded-full">
        <div className="bg-road animate-road h-full w-[200%]" />
      </div>
    </div>
  );
}
