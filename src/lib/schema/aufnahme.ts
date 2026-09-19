import { z } from "zod";
import {
  DEKUBITUS_KATEGORIEN,
  ENTZUENDUNGSZEICHEN,
  EXSUDAT_FARBEN,
  EXSUDAT_KONSISTENZ,
  EXSUDAT_MENGEN,
  FIXIERUNG,
  KOMPRESSION,
  KOMPRESSIONSKLASSEN,
  LOKALE_INFEKTZEICHEN,
  REINIGUNG,
  SCHMERZ_ORT_MODI,
  VAS_MAX,
  VAS_MIN,
  WAGNER_GRADE,
  WUNDABDECKUNG,
  WUNDFUELLUNG,
  WUNDGRUND,
  WUNDRAND,
  WUNDSPUELUNG,
  WUNDUMGEBUNG,
} from "@/lib/enums";

const werte = (liste: readonly { wert: string }[]) =>
  liste.map((o) => o.wert) as [string, ...string[]];

/** Mehrfachauswahl: unbekannte Werte werden verworfen statt zu scheitern. */
const auswahl = (liste: readonly { wert: string }[]) =>
  z.array(z.enum(werte(liste))).default([]);

/** Einfachauswahl, darf leer bleiben. */
const einzel = (liste: readonly { wert: string }[]) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.enum(werte(liste)).nullable(),
  );

const text = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().max(max, `Höchstens ${max} Zeichen`).nullable(),
  );

/** Messwert in mm bzw. cm: Kommazahl, positiv, oder leer. */
const mass = (max: number, feld: string) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.replace(",", ".").trim() || null : v),
    z.coerce
      .number({ invalid_type_error: `${feld}: bitte eine Zahl angeben` })
      .positive(`${feld}: muss größer als 0 sein`)
      .max(max, `${feld}: höchstens ${max}`)
      .nullable(),
  );

const vas = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.coerce
    .number()
    .int()
    .min(VAS_MIN, `Skala von ${VAS_MIN} bis ${VAS_MAX}`)
    .max(VAS_MAX, `Skala von ${VAS_MIN} bis ${VAS_MAX}`)
    .nullable(),
);

const uhr = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.coerce.number().int().min(1).max(12).nullable(),
);

const ganzzahl = (max: number, feld: string) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.coerce
      .number({ invalid_type_error: `${feld}: bitte eine Zahl angeben` })
      .int(`${feld}: bitte eine ganze Zahl angeben`)
      .min(1, `${feld}: mindestens 1`)
      .max(max, `${feld}: höchstens ${max}`)
      .nullable(),
  );

export const aufnahmeSchema = z
  .object({
    datum: z.coerce
      .date({ errorMap: () => ({ message: "Bitte ein gültiges Datum angeben" }) })
      .max(new Date(Date.now() + 86_400_000), "Das Datum kann nicht in der Zukunft liegen"),

    // --- Graduierung ---
    wagnerArmstrongGrad: einzel(WAGNER_GRADE),
    dekubitusKategorie: einzel(DEKUBITUS_KATEGORIEN),

    // --- Befund ---
    wundumgebung: auswahl(WUNDUMGEBUNG),
    wundrand: auswahl(WUNDRAND),
    wundgrund: auswahl(WUNDGRUND),
    wundgrundSonstigesText: text(300),

    // --- Wundgröße ---
    breiteMm: mass(2000, "Breite"),
    laengeMm: mass(2000, "Länge"),
    tiefeMm: mass(500, "Tiefe"),

    // --- Exsudation ---
    exsudatMenge: einzel(EXSUDAT_MENGEN),
    exsudatFarben: auswahl(EXSUDAT_FARBEN),
    exsudatFarbeSonstiges: text(200),
    exsudatKonsistenz: auswahl(EXSUDAT_KONSISTENZ),

    geruch: z.coerce.boolean(),

    // --- Entzündung und Infektion ---
    entzuendungszeichen: auswahl(ENTZUENDUNGSZEICHEN),
    lokaleInfektzeichen: auswahl(LOKALE_INFEKTZEICHEN),
    systemischeZeichen: z.coerce.boolean(),
    infektionSonstiges: text(500),

    abstrichGenommen: z.coerce.boolean(),
    abstrichErgebnis: text(500),

    // --- Schmerz ---
    schmerzen: z.coerce.boolean(),
    schmerzVas: vas,
    schmerzWundeModus: einzel(SCHMERZ_ORT_MODI),
    schmerzWundeUhr: uhr,
    schmerzWundrandModus: einzel(SCHMERZ_ORT_MODI),
    schmerzWundrandUhr: uhr,
    schmerzWundumgebungModus: einzel(SCHMERZ_ORT_MODI),
    schmerzWundumgebungUhr: uhr,
    schmerzVerbandwechsel: z.coerce.boolean(),
    schmerzVerbandwechselVas: vas,
    schmerzDruck: z.coerce.boolean(),
    schmerzDruckVas: vas,
    schmerzUeberall: z.coerce.boolean(),
    schmerzUeberallVas: vas,
    schmerztagebuch: z.coerce.boolean(),
    schmerzSonstiges: text(1000),

    wundheilungsfaktoren: text(2000),

    // --- Therapieplan ---
    wundspuelung: auswahl(WUNDSPUELUNG),
    wundspuelungSonstiges: text(200),
    reinigung: auswahl(REINIGUNG),
    reinigungSonstiges: text(200),
    hautpflege: text(300),
    wundrandschutz: text(300),

    wundfuellung: auswahl(WUNDFUELLUNG),
    wundfuellungGroesseCm: mass(100, "Größe der Wundfüllung"),
    wundfuellungSonstiges: text(200),

    wundabdeckung: auswahl(WUNDABDECKUNG),
    wundabdeckungGroesseCm: mass(100, "Größe der Wundabdeckung"),
    wundabdeckungSonstiges: text(200),

    fixierung: auswahl(FIXIERUNG),
    fixierungSonstiges: text(200),

    kompression: auswahl(KOMPRESSION),
    kompressionBinde1BreiteCm: mass(50, "Breite der ersten Binde"),
    kompressionBinde1Anzahl: ganzzahl(20, "Anzahl der ersten Binde"),
    kompressionBinde2BreiteCm: mass(50, "Breite der zweiten Binde"),
    kompressionBinde2Anzahl: ganzzahl(20, "Anzahl der zweiten Binde"),
    kompressionKlasse: einzel(KOMPRESSIONSKLASSEN),
    kompressionMass: text(200),

    therapieSonstiges: text(1000),
    anmerkungen: text(2000),
  })
  .superRefine((d, ctx) => {
    // Breite und Laenge gehoeren zusammen - mit nur einem Wert laesst sich
    // keine Flaeche berechnen, und der Verlauf bekommt eine Luecke.
    if ((d.breiteMm == null) !== (d.laengeMm == null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [d.breiteMm == null ? "breiteMm" : "laengeMm"],
        message: "Breite und Länge zusammen angeben, sonst fehlt die Fläche im Verlauf",
      });
    }

    // "Auf … Uhr" ohne Uhrzeit sagt nichts aus.
    const orte = [
      ["schmerzWundeModus", "schmerzWundeUhr"],
      ["schmerzWundrandModus", "schmerzWundrandUhr"],
      ["schmerzWundumgebungModus", "schmerzWundumgebungUhr"],
    ] as const;
    for (const [modusFeld, uhrFeld] of orte) {
      if (d[modusFeld] === "UHR" && d[uhrFeld] == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [uhrFeld],
          message: "Bitte die Uhrzeit auf dem Zifferblatt auswählen",
        });
      }
    }

    // Abstrichergebnis ohne Abstrich waere widerspruechlich.
    if (!d.abstrichGenommen && d.abstrichErgebnis) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["abstrichErgebnis"],
        message: "Ergebnis nur angeben, wenn ein Abstrich genommen wurde",
      });
    }
  });

export type AufnahmeEingabe = z.infer<typeof aufnahmeSchema>;
