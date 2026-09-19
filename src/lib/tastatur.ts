const VORWAERTS = new Set(["ArrowRight", "ArrowDown"]);
const RUECKWAERTS = new Set(["ArrowLeft", "ArrowUp"]);

/** Liefert fuer eine ARIA-Radiogruppe das Ziel der ueblichen Pfeiltasten-Navigation. */
export function radioZielIndex(taste: string, index: number, anzahl: number): number | null {
  if (anzahl < 1 || index < 0 || index >= anzahl) return null;
  if (VORWAERTS.has(taste)) return (index + 1) % anzahl;
  if (RUECKWAERTS.has(taste)) return (index - 1 + anzahl) % anzahl;
  if (taste === "Home") return 0;
  if (taste === "End") return anzahl - 1;
  return null;
}

/** Setzt nach einer Auswahl per Pfeiltaste den Fokus auf das neue Radio. */
export function fokussiereRadio(ausloeser: HTMLElement, index: number): void {
  const gruppe = ausloeser.closest<HTMLElement>('[role="radiogroup"]');
  gruppe?.querySelectorAll<HTMLElement>('[role="radio"]')[index]?.focus();
}
