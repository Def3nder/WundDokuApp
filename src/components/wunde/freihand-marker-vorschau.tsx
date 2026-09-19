import { KOERPERKARTE_BREITE, KOERPERKARTE_HOEHE } from "@/lib/koerperkarte";

const HOEHENFAKTOR = KOERPERKARTE_BREITE / KOERPERKARTE_HOEHE;

/**
 * Nur-Lese-Ansicht des frei eingezeichneten Markers, z. B. im Wund-Cockpit.
 * Kein Klick-/Zieh-Verhalten - dafür siehe `FreihandKarte`.
 */
export function FreihandMarkerVorschau({
  x,
  y,
  radius,
}: {
  x: number;
  y: number;
  radius: number;
}) {
  return (
    <div className="relative w-full max-w-[280px] overflow-hidden rounded-lg border border-border-strong">
      <div style={{ paddingTop: `${(KOERPERKARTE_HOEHE / KOERPERKARTE_BREITE) * 100}%` }} />
      <img
        src="/koerperkarte-leer.webp"
        alt="Eingezeichnete Wundlokalisation"
        width={KOERPERKARTE_BREITE}
        height={KOERPERKARTE_HOEHE}
        className="absolute inset-0 size-full"
      />
      <div
        aria-hidden="true"
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-destructive bg-destructive/15"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          width: `${radius * 2}%`,
          height: `${radius * 2 * HOEHENFAKTOR}%`,
        }}
      />
    </div>
  );
}
