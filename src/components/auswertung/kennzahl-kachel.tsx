"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Mindestabstand der Einblendung zum Fensterrand. */
const RAND = 12;
/** Regulaerer Abstand zwischen Kachelunterkante und Einblendung. */
const ABSTAND = 8;
/** Rahmen und Innenabstand der Einblendung (`border` + `p-3`, beidseitig). */
const INNENMASS = 26;

/**
 * Kennzahl mit Einblendung: Mouseover auf dem Desktop, Antippen auf
 * Touchgeraeten, Tabulator per Tastatur.
 *
 * Die Einblendung liegt im DOM innerhalb der Kachel - nur so kann die Maus
 * hineinfahren, ohne dass `onMouseLeave` sie vorher schliesst. Ihre Breite und
 * waagerechte Verschiebung werden in Pixeln gerechnet statt per CSS: Ein
 * absolut positioniertes, frisch eingeblendetes Element misst sich auf iOS
 * Safari sonst mit Breite 0 (siehe Wundflaechen-Vorschau), und die rechte
 * Kachel wuerde linksbuendig ueber den Fensterrand hinauslaufen.
 *
 * `dekorativ` kennzeichnet eine rein optische Einblendung ohne eigene
 * Bedienelemente; sie bleibt fuer Screenreader ausgeblendet.
 */
export function KennzahlKachel({
  titel,
  wert,
  wertKlasse,
  hinweis,
  vorschauTitel,
  maxBreite,
  dekorativ = false,
  className,
  inhalt,
}: {
  titel: string;
  wert: React.ReactNode;
  wertKlasse?: string;
  hinweis: React.ReactNode;
  vorschauTitel: string;
  maxBreite: number;
  dekorativ?: boolean;
  className?: string;
  inhalt?: (innenBreite: number) => React.ReactNode;
}) {
  const [offen, setOffen] = useState(false);
  const [masse, setMasse] = useState({ breite: maxBreite, versatz: 0 });
  const [versatzY, setVersatzY] = useState(ABSTAND);
  // Startwert `true` (Desktop als Normalfall), bis die Messung nach der
  // Hydration greift.
  const [hatHover, setHatHover] = useState(true);
  const kachelRef = useRef<HTMLDivElement>(null);
  const knopfRef = useRef<HTMLButtonElement>(null);
  const vorschauRef = useRef<HTMLDivElement>(null);
  // Merkt den Fokussprung zurueck auf den Knopf nach Escape, damit der dabei
  // ausgeloeste Fokus die Einblendung nicht sofort wieder aufklappt.
  const ruecksprung = useRef(false);
  const vorschauId = useId();

  useEffect(() => {
    const anfrage = window.matchMedia("(hover: hover) and (pointer: fine)");
    setHatHover(anfrage.matches);
    const aktualisieren = (event: MediaQueryListEvent) => setHatHover(event.matches);
    anfrage.addEventListener("change", aktualisieren);
    return () => anfrage.removeEventListener("change", aktualisieren);
  }, []);

  useEffect(() => {
    const kachel = kachelRef.current;
    if (!kachel) return;
    const messen = () => {
      const kasten = kachel.getBoundingClientRect();
      const fenster = document.documentElement.clientWidth;
      const breite = Math.max(1, Math.min(maxBreite, fenster - 2 * RAND));
      const gehalten = Math.max(RAND, Math.min(kasten.left, fenster - RAND - breite));
      setMasse({ breite, versatz: gehalten - kasten.left });
    };
    messen();
    const beobachter = new ResizeObserver(messen);
    beobachter.observe(kachel);
    window.addEventListener("resize", messen);
    return () => {
      beobachter.disconnect();
      window.removeEventListener("resize", messen);
    };
    // `offen` misst beim Aufklappen neu: die Kachel steht je nach Scrollstand
    // unterschiedlich hoch im Fenster.
  }, [maxBreite, offen]);

  // Senkrechte Lage erst nach dem Rendern: Die Hoehe der Einblendung steht
  // vorher nicht fest. Passt sie unter der Kachel nicht mehr ins Fenster, ruckt
  // sie nach oben und darf die Kachel dabei ueberdecken - lieber verdeckte
  // Kennzahl als unerreichbare Bedienelemente. `useLayoutEffect` korrigiert das
  // noch vor dem Zeichnen, es entsteht also kein sichtbarer Sprung.
  useLayoutEffect(() => {
    const vorschau = vorschauRef.current;
    const kachel = kachelRef.current;
    if (!vorschau || !kachel) return;
    const unterkante = kachel.getBoundingClientRect().bottom;
    const wunschhoehe = vorschau.scrollHeight;
    const passtDarunter = unterkante + ABSTAND + wunschhoehe <= window.innerHeight - RAND;
    const zielOben = passtDarunter
      ? unterkante + ABSTAND
      : Math.max(RAND, window.innerHeight - RAND - wunschhoehe);
    setVersatzY(zielOben - unterkante);
  }, [offen, masse.breite]);

  useEffect(() => {
    if (hatHover || !offen) return;
    function aussenKlick(event: MouseEvent) {
      if (!kachelRef.current?.contains(event.target as Node)) setOffen(false);
    }
    document.addEventListener("click", aussenKlick);
    return () => document.removeEventListener("click", aussenKlick);
  }, [hatHover, offen]);

  return (
    <div
      ref={kachelRef}
      className={cn("relative", className)}
      {...(hatHover
        ? {
            onMouseEnter: () => setOffen(true),
            onMouseLeave: () => {
              // Nicht schliessen, solange die Tastatur im Inhalt arbeitet. Ein
              // per Maus angeklickter Regler behaelt zwar den Fokus, matcht
              // aber kein `:focus-visible` - die Einblendung folgt dort also
              // weiter der Maus.
              const aktiv = document.activeElement;
              const tastatur =
                aktiv instanceof HTMLElement &&
                aktiv.matches(":focus-visible") &&
                kachelRef.current?.contains(aktiv);
              if (!tastatur) setOffen(false);
            },
          }
        : {})}
      onFocus={(event) => {
        if (ruecksprung.current) {
          ruecksprung.current = false;
          return;
        }
        // Nur bei Tastaturfokus: sonst oeffnet der Fokus beim Antippen und der
        // direkt folgende Klick schliesst sofort wieder.
        if ((event.target as HTMLElement).matches(":focus-visible")) setOffen(true);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOffen(false);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !offen) return;
        setOffen(false);
        const knopf = knopfRef.current;
        if (knopf && document.activeElement !== knopf) {
          ruecksprung.current = true;
          knopf.focus();
        }
      }}
    >
      <button
        ref={knopfRef}
        type="button"
        aria-expanded={offen}
        {...(dekorativ ? {} : { "aria-controls": vorschauId })}
        onClick={() => setOffen((sichtbar) => (hatHover ? true : !sichtbar))}
        className="block w-full cursor-pointer p-5 text-left"
      >
        <span className="flex items-start justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {titel}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              offen && "rotate-180",
            )}
          />
        </span>
        <span className={cn("messwert mt-2 block text-2xl font-semibold", wertKlasse)}>{wert}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{hinweis}</span>
      </button>

      {offen && inhalt && (
        <div
          ref={vorschauRef}
          id={vorschauId}
          {...(dekorativ ? { "aria-hidden": true } : {})}
          style={{
            width: `${masse.breite}px`,
            left: `${masse.versatz}px`,
            marginTop: `${versatzY}px`,
            // Kein Deckel fuer die dekorative Vorschau: `pointer-events-none`
            // liesse sich ohnehin nicht scrollen. Sie ist fest hoch genug, um
            // bei jeder ueblichen Fensterhoehe vollstaendig zu passen.
            ...(dekorativ ? {} : { maxHeight: `calc(100vh - ${2 * RAND}px)` }),
          }}
          className={cn(
            "absolute top-full z-30 rounded-lg border border-border bg-card p-3 shadow-lg",
            dekorativ ? "pointer-events-none overflow-hidden" : "overflow-auto",
          )}
        >
          <p className="mb-1 text-xs font-semibold text-heading">{vorschauTitel}</p>
          {inhalt(masse.breite - INNENMASS)}
        </div>
      )}
    </div>
  );
}
