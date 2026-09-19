/**
 * Testdaten fuer die Entwicklung.
 *
 * Legt ein Admin-Konto, ein Pflege-Konto und zwei Patienten mit je einer Wunde
 * und mehreren Aufnahmen an, damit Zeitleiste und Verlaufsdiagramme sofort
 * etwas anzeigen. Laeuft mehrfach ohne Schaden (upsert auf Patientennummer).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const j = (werte: string[]) => JSON.stringify(werte);
const tageVorher = (n: number) => new Date(Date.now() - n * 86_400_000);

async function main() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@praxis.local").toLowerCase();
  const adminPasswort = process.env.SEED_ADMIN_PASSWORD ?? "WundDoku!2026";

  const admin = await db.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Dr. A. Administrator",
      handzeichen: "ADM",
      passwordHash: await bcrypt.hash(adminPasswort, 12),
      rolle: "ADMIN",
    },
  });

  const pflege = await db.user.upsert({
    where: { email: "pflege@praxis.local" },
    update: {},
    create: {
      email: "pflege@praxis.local",
      name: "M. Musterpfleger",
      handzeichen: "MM",
      passwordHash: await bcrypt.hash("Pflege!2026", 12),
      rolle: "PFLEGE",
    },
  });

  // --- Patient 1: Ulcus cruris venosum, heilt ab -------------------------
  const p1 = await db.patient.upsert({
    where: { patientennummer: "P-10001" },
    update: {},
    create: {
      patientennummer: "P-10001",
      nachname: "Berger",
      vorname: "Hannelore",
      geburtsdatum: new Date("1946-03-14"),
      arztTherapieverantwortlich: "Dr. med. K. Schneider",
      angelegtVonId: admin.id,
    },
  });

  const bestehtWunde1 = await db.wound.findFirst({ where: { patientId: p1.id } });
  if (!bestehtWunde1) {
    const w1 = await db.wound.create({
      data: {
        patientId: p1.id,
        bezeichnung: "Ulcus cruris links lateral",
        diagnoseTyp: "ULCUS_CRURIS_VENOSUM",
        lokalisationRegion: "UNTERSCHENKEL",
        lokalisationSeite: "LINKS",
        lokalisationAusrichtung: "LATERAL",
        bestehtSeitWert: 8,
        bestehtSeitEinheit: "MONATE",
        rezidiv: true,
        rezidivAnzahl: 2,
      },
    });

    // Flaeche geht von 1200 auf 476 mm^2 zurueck - die Diagramme zeigen Heilung.
    const verlauf = [
      { tage: 42, typ: "ERSTAUFNAHME", b: 30, l: 40, t: 4, menge: "MAESSIG_BIS_STARK",
        grund: ["FIBRINBELAEGE", "FEHLENDE_GRANULATION", "WEICHE_NEKROSE"], vas: 6 },
      { tage: 28, typ: "FOLGEAUFNAHME", b: 28, l: 36, t: 3, menge: "SCHWACH_BIS_MAESSIG",
        grund: ["FIBRINBELAEGE", "GRANULATION"], vas: 5 },
      { tage: 14, typ: "FOLGEAUFNAHME", b: 24, l: 30, t: 2, menge: "SCHWACH_BIS_MAESSIG",
        grund: ["GRANULATION", "EPITHELGEWEBE"], vas: 3 },
      { tage: 3, typ: "FOLGEAUFNAHME", b: 17, l: 28, t: 1, menge: "KEINE_BIS_SCHWACH",
        grund: ["GRANULATION", "EPITHELGEWEBE"], vas: 2 },
    ];

    for (const v of verlauf) {
      await db.assessment.create({
        data: {
          woundId: w1.id,
          typ: v.typ,
          datum: tageVorher(v.tage),
          erstelltVonId: pflege.id,
          breiteMm: v.b,
          laengeMm: v.l,
          tiefeMm: v.t,
          wundumgebung: j(v.tage > 20 ? ["GEROETET", "MAZERIERT"] : ["FEUCHT"]),
          wundrand: j(v.tage > 20 ? ["MAZERIERT", "GEROETET"] : ["UNTERMINIERT"]),
          wundgrund: j(v.grund),
          exsudatMenge: v.menge,
          exsudatFarben: j(v.tage > 20 ? ["TRUEB", "GELB"] : ["KLAR"]),
          exsudatKonsistenz: j(["SEROES"]),
          geruch: v.tage > 35,
          entzuendungszeichen: j(v.tage > 35 ? ["ROETUNG", "SCHWELLUNG", "WAERME"] : []),
          lokaleInfektzeichen: j(v.tage > 35 ? ["KRITISCHE_KOLONISATION"] : []),
          schmerzen: true,
          schmerzVas: v.vas,
          schmerzWundeModus: "GESAMT",
          schmerzVerbandwechsel: v.tage > 20,
          schmerzVerbandwechselVas: v.tage > 20 ? v.vas + 1 : null,
          wundspuelung: j(["NACL"]),
          reinigung: j(v.tage > 20 ? ["MECHANISCH", "AUTOLYTISCH"] : ["MECHANISCH"]),
          wundfuellung: j(v.tage > 20 ? ["ALGINAT"] : []),
          wundabdeckung: j(["SCHAUMVERBAND"]),
          wundabdeckungGroesseCm: 10,
          fixierung: j(["FIXIERMULL"]),
          kompression: j(["KURZZUGBINDE"]),
          kompressionBinde1BreiteCm: 10,
          kompressionBinde1Anzahl: 2,
          kompressionKlasse: "KKL2",
          wundheilungsfaktoren: "Chronisch venöse Insuffizienz, Adipositas, eingeschränkte Mobilität",
        },
      });
    }
  }

  // --- Patient 2: Diabetisches Fusssyndrom, frisch ------------------------
  const p2 = await db.patient.upsert({
    where: { patientennummer: "P-10002" },
    update: {},
    create: {
      patientennummer: "P-10002",
      nachname: "Kowalski",
      vorname: "Josef",
      geburtsdatum: new Date("1958-11-02"),
      arztTherapieverantwortlich: "Dr. med. T. Hofmann",
      angelegtVonId: admin.id,
    },
  });

  const bestehtWunde2 = await db.wound.findFirst({ where: { patientId: p2.id } });
  if (!bestehtWunde2) {
    const w2 = await db.wound.create({
      data: {
        patientId: p2.id,
        bezeichnung: "DFS Fußsohle rechts",
        diagnoseTyp: "DFS",
        lokalisationRegion: "FUSSSOHLE",
        lokalisationSeite: "RECHTS",
        bestehtSeitWert: 3,
        bestehtSeitEinheit: "WOCHEN",
      },
    });

    await db.assessment.create({
      data: {
        woundId: w2.id,
        typ: "ERSTAUFNAHME",
        datum: tageVorher(5),
        erstelltVonId: pflege.id,
        wagnerArmstrongGrad: "2",
        breiteMm: 15,
        laengeMm: 18,
        tiefeMm: 6,
        wundumgebung: j(["TROCKEN", "ERWAERMT"]),
        wundrand: j(["HYPERKERATOTISCH"]),
        wundgrund: j(["FIBRINBELAEGE", "MUSKELN_SEHNEN_FASZIEN"]),
        exsudatMenge: "SCHWACH_BIS_MAESSIG",
        exsudatFarben: j(["GELB"]),
        exsudatKonsistenz: j(["SEROES"]),
        entzuendungszeichen: j(["ROETUNG", "WAERME"]),
        lokaleInfektzeichen: j(["WUNDINFEKTION"]),
        abstrichGenommen: true,
        abstrichErgebnis: "Staphylococcus aureus, MSSA",
        // Diabetische Polyneuropathie: typischerweise schmerzlos.
        schmerzen: false,
        wundspuelung: j(["POLYHEXANID"]),
        reinigung: j(["CHIRURGISCH"]),
        wundfuellung: j(["HYDROFASER"]),
        wundabdeckung: j(["KOMPRESSE"]),
        fixierung: j(["MULLBINDE"]),
        wundheilungsfaktoren: "Diabetes mellitus Typ 2 (HbA1c 8,9 %), Polyneuropathie, Nikotinabusus",
      },
    });
  }

  const [nBenutzer, nPatienten, nWunden, nAufnahmen] = await Promise.all([
    db.user.count(), db.patient.count(), db.wound.count(), db.assessment.count(),
  ]);
  console.log(`Testdaten bereit: ${nBenutzer} Benutzer, ${nPatienten} Patienten, ${nWunden} Wunden, ${nAufnahmen} Aufnahmen`);
  console.log(`Anmeldung: ${adminEmail} / ${adminPasswort}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
