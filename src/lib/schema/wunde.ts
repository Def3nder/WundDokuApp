import { z } from "zod";
import {
  AUSRICHTUNGEN,
  DIAGNOSE_TYPEN,
  KOERPERREGIONEN,
  SEITEN,
  ZEITEINHEITEN,
} from "@/lib/enums";
import { leerZuNull } from "./patient";

const werte = (liste: readonly { wert: string }[]) =>
  liste.map((o) => o.wert) as [string, ...string[]];

/** Zahlenfelder: "" -> null, "12" -> 12, Unsinn -> Fehlermeldung. */
const zahlOderNull = (max: number, feld: string) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.coerce
      .number({ invalid_type_error: `${feld}: bitte eine Zahl angeben` })
      .int(`${feld}: bitte eine ganze Zahl angeben`)
      .min(1, `${feld}: mindestens 1`)
      .max(max, `${feld}: höchstens ${max}`)
      .nullable(),
  );

/** Prozentwert (0-100) mit Nachkommastellen, für den frei gezeichneten Marker. */
const prozentOderNull = (feld: string) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.coerce
      .number({ invalid_type_error: `${feld}: bitte eine Zahl angeben` })
      .min(0, `${feld}: mindestens 0`)
      .max(100, `${feld}: höchstens 100`)
      .nullable(),
  );

export const wundeSchema = z
  .object({
    bezeichnung: z
      .string()
      .trim()
      .min(1, "Bezeichnung ist erforderlich")
      .max(150, "Höchstens 150 Zeichen"),

    diagnoseTyp: z.enum(werte(DIAGNOSE_TYPEN), {
      errorMap: () => ({ message: "Bitte eine Diagnose auswählen" }),
    }),

    diagnoseFreitext: z.preprocess(
      leerZuNull,
      z.string().trim().max(500, "Höchstens 500 Zeichen").nullable(),
    ),

    // Kein .cuid() - Stammdaten-IDs sind nicht zwangsläufig echte CUIDs (die
    // Testärzte/-pflegedienste aus dem Seed haben feste IDs wie
    // "seed-doctor-01"). Ob die ID tatsächlich existiert, prüft ohnehin
    // stammdatenFehler() in src/actions/wunden.ts gegen die Datenbank.
    arztId: z.preprocess(leerZuNull, z.string().trim().min(1, "Ungültiger Arzt").nullable()),
    neuerArztName: z.preprocess(
      leerZuNull,
      z.string().trim().max(150, "Höchstens 150 Zeichen").nullable(),
    ),
    neueArztPraxis: z.preprocess(
      leerZuNull,
      z.string().trim().max(150, "Höchstens 150 Zeichen").nullable(),
    ),
    pflegedienstId: z.preprocess(
      leerZuNull,
      z.string().trim().min(1, "Ungültiger Pflegedienst").nullable(),
    ),
    neuerPflegedienstName: z.preprocess(
      leerZuNull,
      z.string().trim().max(150, "Höchstens 150 Zeichen").nullable(),
    ),
    neuerPflegedienstAnsprechpartner: z.preprocess(
      leerZuNull,
      z.string().trim().max(150, "Höchstens 150 Zeichen").nullable(),
    ),

    lokalisationRegion: z.preprocess(
      leerZuNull,
      z.enum(werte(KOERPERREGIONEN)).nullable(),
    ),
    lokalisationSeite: z.preprocess(leerZuNull, z.enum(werte(SEITEN)).nullable()),
    lokalisationAusrichtung: z.preprocess(
      leerZuNull,
      z.enum(werte(AUSRICHTUNGEN)).nullable(),
    ),
    lokalisationFreitext: z.preprocess(
      leerZuNull,
      z.string().trim().max(500, "Höchstens 500 Zeichen").nullable(),
    ),
    lokalisationModus: z.enum(["MARKER", "FREIHAND"], {
      errorMap: () => ({ message: "Bitte eine Art der Lokalisation auswählen" }),
    }),
    lokalisationMarkerX: prozentOderNull("Marker-Position"),
    lokalisationMarkerY: prozentOderNull("Marker-Position"),
    lokalisationMarkerRadius: prozentOderNull("Marker-Größe"),

    bestehtSeitWert: zahlOderNull(999, "Bestehtsdauer"),
    bestehtSeitEinheit: z.preprocess(
      leerZuNull,
      z.enum(werte(ZEITEINHEITEN)).nullable(),
    ),

    rezidiv: z.coerce.boolean(),
    rezidivAnzahl: zahlOderNull(99, "Anzahl der Rezidive"),
  })
  .superRefine((daten, ctx) => {
    // Eine Zahl ohne Einheit ist nicht auswertbar - und eine Einheit ohne Zahl
    // sagt nichts aus. Beide Haelften gehoeren zusammen.
    if (daten.bestehtSeitWert != null && !daten.bestehtSeitEinheit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bestehtSeitEinheit"],
        message: "Bitte die Einheit auswählen",
      });
    }
    if (daten.bestehtSeitEinheit && daten.bestehtSeitWert == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bestehtSeitWert"],
        message: "Bitte die Dauer angeben",
      });
    }
    // Eine Rezidivanzahl ohne gesetztes Rezidiv waere widerspruechlich.
    if (!daten.rezidiv && daten.rezidivAnzahl != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rezidivAnzahl"],
        message: "Anzahl nur angeben, wenn ein Rezidiv vorliegt",
      });
    }
    // Der frei gezeichnete Marker ist ein einzelner Kreis - entweder ganz
    // oder gar nicht gesetzt, nie nur teilweise.
    const markerFelder = [
      daten.lokalisationMarkerX,
      daten.lokalisationMarkerY,
      daten.lokalisationMarkerRadius,
    ];
    if (markerFelder.some((f) => f != null) && markerFelder.some((f) => f == null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lokalisationMarkerX"],
        message: "Marker unvollständig - bitte neu einzeichnen",
      });
    }
  });

export type WundeEingabe = z.infer<typeof wundeSchema>;

export function wundeAusFormData(fd: FormData) {
  return wundeSchema.safeParse({
    bezeichnung: fd.get("bezeichnung"),
    diagnoseTyp: fd.get("diagnoseTyp"),
    diagnoseFreitext: fd.get("diagnoseFreitext"),
    arztId: fd.get("arztId"),
    neuerArztName: fd.get("neuerArztName"),
    neueArztPraxis: fd.get("neueArztPraxis"),
    pflegedienstId: fd.get("pflegedienstId"),
    neuerPflegedienstName: fd.get("neuerPflegedienstName"),
    neuerPflegedienstAnsprechpartner: fd.get("neuerPflegedienstAnsprechpartner"),
    lokalisationRegion: fd.get("lokalisationRegion"),
    lokalisationSeite: fd.get("lokalisationSeite"),
    lokalisationAusrichtung: fd.get("lokalisationAusrichtung"),
    lokalisationFreitext: fd.get("lokalisationFreitext"),
    lokalisationModus: fd.get("lokalisationModus"),
    lokalisationMarkerX: fd.get("lokalisationMarkerX"),
    lokalisationMarkerY: fd.get("lokalisationMarkerY"),
    lokalisationMarkerRadius: fd.get("lokalisationMarkerRadius"),
    bestehtSeitWert: fd.get("bestehtSeitWert"),
    bestehtSeitEinheit: fd.get("bestehtSeitEinheit"),
    rezidiv: fd.get("rezidiv") === "on" || fd.get("rezidiv") === "true",
    rezidivAnzahl: fd.get("rezidivAnzahl"),
  });
}
