/**
 * Koordinaten der 67 Markierungen auf der Körperkarte
 * (`public/koerperkarte.webp`, Vorder-/Rückseite, Fußrücken/-sohlen und
 * Bein-Nahaufnahmen lateral/medial).
 *
 * `x`/`y` sind Prozentwerte relativ zur Bildgröße (aus den roten Kreisen der
 * Vorlage vermessen), damit die Markierung bei jeder Bildbreite an der
 * richtigen Stelle sitzt. Seite folgt der medizinischen Konvention: Auf der
 * Vorderansicht ist die Patientenseite gespiegelt (Bild links = Patient
 * rechts), auf der Rückansicht nicht.
 *
 * Die beiden Kopf-Punkte je Ansicht (vorne/hinten) liegen im Bild nur 44px
 * auseinander - knapper als der WCAG-Mindestabstand von 24px zwischen zwei
 * Zielflächen (SC 2.5.8, von axe geprüft). Deshalb braucht die Körperkarte
 * eine grössere Mindestbreite als die übrigen, weiter auseinanderliegenden
 * Markierungen (siehe `koerperkarte.tsx` und der Abstandstest in
 * `koerperkarte.test.ts`).
 */

/** Originalgröße von `public/koerperkarte.webp` in Pixeln - für Abstandsprüfungen. */
export const KOERPERKARTE_BREITE = 1055;
export const KOERPERKARTE_HOEHE = 1491;

export type KoerperKarteMarker = {
  x: number;
  y: number;
  region: string;
  seite: "LINKS" | "RECHTS" | null;
  ausrichtung: "LATERAL" | "MEDIAL" | "VENTRAL" | "DORSAL" | null;
  ansicht: "vorne" | "hinten" | "fussruecken" | "fusssohle" | "bein";
};

export const KOERPERKARTE_MARKER: readonly KoerperKarteMarker[] = [
  { x: 20.54, y: 7.54, region: "KOPF", seite: "RECHTS", ausrichtung: "VENTRAL", ansicht: "vorne" },
  { x: 24.72, y: 7.55, region: "KOPF", seite: "LINKS", ausrichtung: "VENTRAL", ansicht: "vorne" },
  { x: 14.43, y: 17.72, region: "SCHULTER", seite: "RECHTS", ausrichtung: "VENTRAL", ansicht: "vorne" },
  { x: 30.82, y: 17.73, region: "SCHULTER", seite: "LINKS", ausrichtung: "VENTRAL", ansicht: "vorne" },
  { x: 18.77, y: 20.86, region: "BRUSTKORB", seite: "RECHTS", ausrichtung: null, ansicht: "vorne" },
  { x: 26.30, y: 20.84, region: "BRUSTKORB", seite: "LINKS", ausrichtung: null, ansicht: "vorne" },
  { x: 11.83, y: 23.44, region: "OBERARM", seite: "RECHTS", ausrichtung: "VENTRAL", ansicht: "vorne" },
  { x: 33.09, y: 23.50, region: "OBERARM", seite: "LINKS", ausrichtung: "VENTRAL", ansicht: "vorne" },
  { x: 9.96, y: 30.13, region: "UNTERARM", seite: "RECHTS", ausrichtung: "VENTRAL", ansicht: "vorne" },
  { x: 34.89, y: 30.12, region: "UNTERARM", seite: "LINKS", ausrichtung: "VENTRAL", ansicht: "vorne" },
  { x: 19.21, y: 31.31, region: "BAUCH", seite: "RECHTS", ausrichtung: null, ansicht: "vorne" },
  { x: 25.82, y: 31.31, region: "BAUCH", seite: "LINKS", ausrichtung: null, ansicht: "vorne" },
  { x: 7.74, y: 36.38, region: "HANDGELENK", seite: "RECHTS", ausrichtung: "VENTRAL", ansicht: "vorne" },
  { x: 36.63, y: 36.37, region: "HANDGELENK", seite: "LINKS", ausrichtung: "VENTRAL", ansicht: "vorne" },
  { x: 17.72, y: 41.12, region: "OBERSCHENKEL", seite: "RECHTS", ausrichtung: "VENTRAL", ansicht: "vorne" },
  { x: 27.15, y: 41.13, region: "OBERSCHENKEL", seite: "LINKS", ausrichtung: "VENTRAL", ansicht: "vorne" },
  { x: 18.45, y: 49.99, region: "KNIE", seite: "RECHTS", ausrichtung: "VENTRAL", ansicht: "vorne" },
  { x: 26.39, y: 50.00, region: "KNIE", seite: "LINKS", ausrichtung: "VENTRAL", ansicht: "vorne" },
  { x: 18.07, y: 56.86, region: "UNTERSCHENKEL", seite: "RECHTS", ausrichtung: "VENTRAL", ansicht: "vorne" },
  { x: 26.69, y: 56.84, region: "UNTERSCHENKEL", seite: "LINKS", ausrichtung: "VENTRAL", ansicht: "vorne" },
  { x: 18.90, y: 64.17, region: "KNOECHEL", seite: "RECHTS", ausrichtung: "VENTRAL", ansicht: "vorne" },
  { x: 25.83, y: 64.16, region: "KNOECHEL", seite: "LINKS", ausrichtung: "VENTRAL", ansicht: "vorne" },

  { x: 74.88, y: 7.52, region: "KOPF", seite: "LINKS", ausrichtung: "DORSAL", ansicht: "hinten" },
  { x: 79.38, y: 7.52, region: "KOPF", seite: "RECHTS", ausrichtung: "DORSAL", ansicht: "hinten" },
  { x: 68.98, y: 17.72, region: "SCHULTER", seite: "LINKS", ausrichtung: "DORSAL", ansicht: "hinten" },
  { x: 85.39, y: 17.74, region: "SCHULTER", seite: "RECHTS", ausrichtung: "DORSAL", ansicht: "hinten" },
  { x: 73.93, y: 23.31, region: "RUECKEN", seite: "LINKS", ausrichtung: null, ansicht: "hinten" },
  { x: 80.45, y: 23.32, region: "RUECKEN", seite: "RECHTS", ausrichtung: null, ansicht: "hinten" },
  { x: 66.52, y: 23.45, region: "OBERARM", seite: "LINKS", ausrichtung: "DORSAL", ansicht: "hinten" },
  { x: 87.95, y: 23.45, region: "OBERARM", seite: "RECHTS", ausrichtung: "DORSAL", ansicht: "hinten" },
  { x: 65.25, y: 30.14, region: "UNTERARM", seite: "LINKS", ausrichtung: "DORSAL", ansicht: "hinten" },
  { x: 89.27, y: 30.15, region: "UNTERARM", seite: "RECHTS", ausrichtung: "DORSAL", ansicht: "hinten" },
  { x: 74.45, y: 30.83, region: "LENDE", seite: "LINKS", ausrichtung: null, ansicht: "hinten" },
  { x: 79.95, y: 30.83, region: "LENDE", seite: "RECHTS", ausrichtung: null, ansicht: "hinten" },
  { x: 77.20, y: 34.98, region: "STEISS_SAKRAL", seite: null, ausrichtung: null, ansicht: "hinten" },
  { x: 63.72, y: 36.39, region: "HANDGELENK", seite: "LINKS", ausrichtung: "DORSAL", ansicht: "hinten" },
  { x: 91.69, y: 36.37, region: "HANDGELENK", seite: "RECHTS", ausrichtung: "DORSAL", ansicht: "hinten" },
  { x: 72.98, y: 41.43, region: "OBERSCHENKEL", seite: "LINKS", ausrichtung: "DORSAL", ansicht: "hinten" },
  { x: 81.48, y: 41.43, region: "OBERSCHENKEL", seite: "RECHTS", ausrichtung: "DORSAL", ansicht: "hinten" },
  { x: 73.32, y: 50.71, region: "KNIE", seite: "LINKS", ausrichtung: "DORSAL", ansicht: "hinten" },
  { x: 81.15, y: 50.70, region: "KNIE", seite: "RECHTS", ausrichtung: "DORSAL", ansicht: "hinten" },
  { x: 73.07, y: 56.72, region: "UNTERSCHENKEL", seite: "LINKS", ausrichtung: "DORSAL", ansicht: "hinten" },
  { x: 81.41, y: 56.72, region: "UNTERSCHENKEL", seite: "RECHTS", ausrichtung: "DORSAL", ansicht: "hinten" },
  { x: 74.19, y: 64.16, region: "KNOECHEL", seite: "LINKS", ausrichtung: "DORSAL", ansicht: "hinten" },
  { x: 80.32, y: 64.15, region: "KNOECHEL", seite: "RECHTS", ausrichtung: "DORSAL", ansicht: "hinten" },

  { x: 47.19, y: 32.93, region: "ZEHEN", seite: "LINKS", ausrichtung: null, ansicht: "fussruecken" },
  { x: 45.82, y: 36.98, region: "FUSSRUECKEN", seite: "LINKS", ausrichtung: null, ansicht: "fussruecken" },
  { x: 52.93, y: 32.92, region: "ZEHEN", seite: "RECHTS", ausrichtung: null, ansicht: "fussruecken" },
  { x: 54.36, y: 37.00, region: "FUSSRUECKEN", seite: "RECHTS", ausrichtung: null, ansicht: "fussruecken" },

  { x: 44.97, y: 57.19, region: "FUSSBALLEN", seite: "LINKS", ausrichtung: null, ansicht: "fusssohle" },
  { x: 45.58, y: 61.57, region: "FUSSSOHLE", seite: "LINKS", ausrichtung: null, ansicht: "fusssohle" },
  { x: 46.50, y: 66.24, region: "FERSE", seite: "LINKS", ausrichtung: null, ansicht: "fusssohle" },
  { x: 55.14, y: 57.19, region: "FUSSBALLEN", seite: "RECHTS", ausrichtung: null, ansicht: "fusssohle" },
  { x: 54.54, y: 61.59, region: "FUSSSOHLE", seite: "RECHTS", ausrichtung: null, ansicht: "fusssohle" },
  { x: 53.69, y: 66.38, region: "FERSE", seite: "RECHTS", ausrichtung: null, ansicht: "fusssohle" },

  { x: 7.69, y: 79.23, region: "UNTERSCHENKEL", seite: "LINKS", ausrichtung: "LATERAL", ansicht: "bein" },
  { x: 8.59, y: 87.45, region: "KNOECHEL", seite: "LINKS", ausrichtung: "LATERAL", ansicht: "bein" },
  { x: 14.44, y: 90.08, region: "FERSE", seite: "LINKS", ausrichtung: "LATERAL", ansicht: "bein" },
  { x: 39.90, y: 80.04, region: "UNTERSCHENKEL", seite: "LINKS", ausrichtung: "MEDIAL", ansicht: "bein" },
  { x: 39.14, y: 87.47, region: "KNOECHEL", seite: "LINKS", ausrichtung: "MEDIAL", ansicht: "bein" },
  { x: 34.41, y: 90.08, region: "FERSE", seite: "LINKS", ausrichtung: "MEDIAL", ansicht: "bein" },
  { x: 60.15, y: 80.01, region: "UNTERSCHENKEL", seite: "RECHTS", ausrichtung: "MEDIAL", ansicht: "bein" },
  { x: 60.95, y: 87.48, region: "KNOECHEL", seite: "RECHTS", ausrichtung: "MEDIAL", ansicht: "bein" },
  { x: 65.49, y: 90.06, region: "FERSE", seite: "RECHTS", ausrichtung: "MEDIAL", ansicht: "bein" },
  { x: 92.10, y: 79.26, region: "UNTERSCHENKEL", seite: "RECHTS", ausrichtung: "LATERAL", ansicht: "bein" },
  { x: 91.17, y: 87.46, region: "KNOECHEL", seite: "RECHTS", ausrichtung: "LATERAL", ansicht: "bein" },
  { x: 85.49, y: 90.08, region: "FERSE", seite: "RECHTS", ausrichtung: "LATERAL", ansicht: "bein" },
] as const;
