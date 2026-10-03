import { z } from "zod";
import { gueltigesDatum, zeitAusEingabe } from "@/lib/arbeitszeit";

const minuten = z.coerce.number().int("Bitte ganze Minuten eingeben").min(0, "Die Pause darf nicht negativ sein").max(1440, "Höchstens 1.440 Minuten Pause");
const zeitpunkt = z.string().refine((v) => gueltigesDatum(v.slice(0, 10)) && zeitAusEingabe(v) !== null, "Bitte ein gültiges Datum mit Uhrzeit eingeben (Berliner Zeit; Zeitumstellung beachten)");
const vorkommen = z.enum(["erstes", "zweites"]).default("erstes");
const uhrzeit = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Bitte eine gültige Uhrzeit eingeben");

export const zeitBuchungSchema = z.object({
  id: z.string().max(100).optional(),
  version: z.coerce.number().int().min(0).default(0),
  beginn: zeitpunkt,
  beginnVorkommen: vorkommen,
  ende: z.union([z.literal(""), zeitpunkt]),
  endeVorkommen: vorkommen,
  pauseMinuten: minuten,
  notiz: z.string().trim().max(500, "Höchstens 500 Zeichen"),
}).transform((v) => ({
  ...v,
  beginn: zeitAusEingabe(v.beginn, v.beginnVorkommen)!,
  ende: v.ende ? zeitAusEingabe(v.ende, v.endeVorkommen) : null,
})).superRefine((v, ctx) => {
  if (!v.ende) return;
  const dauer = (v.ende.getTime() - v.beginn.getTime()) / 60_000;
  if (dauer <= 0) ctx.addIssue({ code: "custom", path: ["ende"], message: "Das Ende muss nach dem Beginn liegen" });
  if (dauer > 1440) ctx.addIssue({ code: "custom", path: ["ende"], message: "Eine Buchung darf höchstens 24 Stunden dauern. Bitte Datum prüfen oder in mehrere Einträge aufteilen." });
  if (v.pauseMinuten >= dauer) ctx.addIssue({ code: "custom", path: ["pauseMinuten"], message: "Die Pause muss kürzer als die Anwesenheit sein" });
});

export const zeitVorgabeSchema = z.object({
  id: z.string().max(100).optional(),
  version: z.coerce.number().int().min(0).default(0),
  abDatum: z.string().refine(gueltigesDatum, "Bitte ein gültiges Datum eingeben"),
  standardBeginn: uhrzeit,
  standardEnde: uhrzeit,
  wochenStunden: z.coerce.number().min(0, "Wochenstunden dürfen nicht negativ sein").max(168, "Höchstens 168 Stunden pro Woche"),
  pauseMinuten: minuten,
  arbeitstage: z.array(z.coerce.number().int().min(1).max(7)).min(1, "Bitte mindestens einen Arbeitstag wählen")
    .refine((tage) => new Set(tage).size === tage.length, "Arbeitstage dürfen nicht doppelt vorkommen"),
}).transform(({ wochenStunden, ...rest }) => ({ ...rest, wochenMinuten: Math.round(wochenStunden * 60) }))
  .superRefine((v, ctx) => {
    const inMinuten = (zeit: string) => Number(zeit.slice(0, 2)) * 60 + Number(zeit.slice(3));
    const dauer = (inMinuten(v.standardEnde) - inMinuten(v.standardBeginn) + 1440) % 1440;
    if (dauer === 0 || v.pauseMinuten >= dauer) {
      ctx.addIssue({ code: "custom", path: ["pauseMinuten"], message: "Standardbeginn und -ende müssen sich unterscheiden; die Pause muss kürzer als diese Zeitspanne sein" });
    }
    if (v.wochenMinuten / v.arbeitstage.length + v.pauseMinuten > 1440) {
      ctx.addIssue({ code: "custom", path: ["wochenStunden"], message: "Arbeitszeit und Pause dürfen zusammen höchstens 24 Stunden pro Arbeitstag ergeben" });
    }
  });

export type ZeitBuchungDaten = z.output<typeof zeitBuchungSchema>;
export type ZeitVorgabeDaten = z.output<typeof zeitVorgabeSchema>;
export type ZeitErgebnis = { ok?: boolean; meldung?: string; fehler?: Record<string, string> };
