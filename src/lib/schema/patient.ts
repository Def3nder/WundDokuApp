import { z } from "zod";

/** Leere Formularfelder kommen als "" an und sollen als "nicht angegeben" gelten. */
export const leerZuNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

const HEUTE_ENDE = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

export const patientSchema = z.object({
  nachname: z
    .string()
    .trim()
    .min(1, "Nachname ist erforderlich")
    .max(100, "Höchstens 100 Zeichen"),

  vorname: z
    .string()
    .trim()
    .min(1, "Vorname ist erforderlich")
    .max(100, "Höchstens 100 Zeichen"),

  geburtsdatum: z.coerce
    .date({ errorMap: () => ({ message: "Bitte ein gültiges Datum angeben" }) })
    .max(HEUTE_ENDE(), "Das Geburtsdatum kann nicht in der Zukunft liegen")
    .min(new Date("1900-01-01"), "Bitte ein Datum ab 1900 angeben"),

  patientennummer: z
    .string()
    .trim()
    .min(1, "Patientennummer ist erforderlich")
    .max(50, "Höchstens 50 Zeichen"),

  arztId: z.string().trim().min(1, "Bitte einen Arzt auswählen"),
  neuerArztName: z.preprocess(leerZuNull, z.string().trim().max(150, "Höchstens 150 Zeichen").nullable()),
  neueArztPraxis: z.preprocess(leerZuNull, z.string().trim().max(150, "Höchstens 150 Zeichen").nullable()),
  pflegedienstId: z.preprocess(leerZuNull, z.string().trim().nullable()),
  neuerPflegedienstName: z.preprocess(leerZuNull, z.string().trim().max(150, "Höchstens 150 Zeichen").nullable()),
  neuerPflegedienstAnsprechpartner: z.preprocess(leerZuNull, z.string().trim().max(150, "Höchstens 150 Zeichen").nullable()),

  notizen: z.preprocess(
    leerZuNull,
    z.string().trim().max(2000, "Höchstens 2000 Zeichen").nullable(),
  ),
});

export type PatientEingabe = z.infer<typeof patientSchema>;

/** Liest die Formulardaten so aus, wie sie im Browser abgeschickt werden. */
export function patientAusFormData(fd: FormData) {
  return patientSchema.safeParse({
    nachname: fd.get("nachname"),
    vorname: fd.get("vorname"),
    geburtsdatum: fd.get("geburtsdatum"),
    patientennummer: fd.get("patientennummer"),
    arztId: fd.get("arztId"),
    neuerArztName: fd.get("neuerArztName"),
    neueArztPraxis: fd.get("neueArztPraxis"),
    pflegedienstId: fd.get("pflegedienstId"),
    neuerPflegedienstName: fd.get("neuerPflegedienstName"),
    neuerPflegedienstAnsprechpartner: fd.get("neuerPflegedienstAnsprechpartner"),
    notizen: fd.get("notizen"),
  });
}

/** Alter in Jahren - fuer die Kopfzeile der Patientenakte. */
export function alterJahre(geburtsdatum: Date, stichtag = new Date()): number {
  let alter = stichtag.getFullYear() - geburtsdatum.getFullYear();
  const monat = stichtag.getMonth() - geburtsdatum.getMonth();
  if (monat < 0 || (monat === 0 && stichtag.getDate() < geburtsdatum.getDate())) {
    alter--;
  }
  return alter;
}
