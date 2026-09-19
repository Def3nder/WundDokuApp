"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { fokussiereRadio, radioZielIndex } from "@/lib/tastatur";

const MODI = [
  { wert: "light", label: "Hell", Icon: Sun },
  { wert: "dark", label: "Dunkel", Icon: Moon },
  { wert: "system", label: "System", Icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [bereit, setBereit] = useState(false);

  function mitTastatur(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const ziel = radioZielIndex(event.key, index, MODI.length);
    if (ziel == null) return;
    event.preventDefault();
    setTheme(MODI[ziel].wert);
    fokussiereRadio(event.currentTarget, ziel);
  }

  // Vor der Hydration kennt der Server das Theme nicht; ohne diese Sperre
  // blinkt der aktive Zustand beim ersten Rendern kurz falsch auf.
  useEffect(() => setBereit(true), []);

  return (
    <div
      role="radiogroup"
      aria-label="Farbschema"
      className="inline-flex rounded-lg border border-border bg-surface p-1"
    >
      {MODI.map(({ wert, label, Icon }, index) => {
        const aktiv = bereit && theme === wert;
        return (
          <button
            key={wert}
            type="button"
            role="radio"
            aria-checked={aktiv}
            aria-label={label}
            title={label}
            tabIndex={aktiv || (!bereit && index === 0) ? 0 : -1}
            onClick={() => setTheme(wert)}
            onKeyDown={(event) => mitTastatur(event, index)}
            className={cn(
              "tippziel flex items-center justify-center rounded-md px-3 transition-colors duration-200",
              aktiv
                ? "bg-primary text-on-primary"
                : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
