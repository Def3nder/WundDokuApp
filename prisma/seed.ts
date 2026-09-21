/**
 * Testdaten fuer die Entwicklung.
 *
 * Legt Benutzer, Stammdaten sowie zwei Patienten mit je einer Wunde und
 * mehreren Aufnahmen an, damit die Anwendung sofort Beispieldaten anzeigt.
 * Laeuft mehrfach ohne Schaden (deterministische IDs und Upserts).
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

  const aerzte = [
    { id: "seed-doctor-01", name: "Dr. med. Katharina Schneider", praxis: "Hausarztpraxis am Markt", telefon: "0211 5550101", email: "k.schneider@praxis-am-markt.example" },
    { id: "seed-doctor-02", name: "Dr. med. Thomas Berger", praxis: "Gefäßzentrum Rhein", telefon: "0211 5550102", email: "t.berger@gefaesszentrum-rhein.example" },
    { id: "seed-doctor-03", name: "Dr. med. Ayşe Yilmaz", praxis: "Diabetologische Schwerpunktpraxis", telefon: "0211 5550103", email: "a.yilmaz@diabetes-praxis.example" },
    { id: "seed-doctor-04", name: "Dr. med. Stefan Hoffmann", praxis: "Chirurgische Praxis Nord", telefon: "0211 5550104", email: "s.hoffmann@chirurgie-nord.example" },
    { id: "seed-doctor-05", name: "Dr. med. Miriam Neumann", praxis: "Dermatologie am Stadtpark", telefon: "0211 5550105", email: "m.neumann@dermatologie-stadtpark.example" },
    { id: "seed-doctor-06", name: "Dr. med. Jonas Weber", praxis: "Hausärzte im Zentrum", telefon: "0211 5550106", email: "j.weber@hausaerzte-zentrum.example" },
    { id: "seed-doctor-07", name: "Dr. med. Laura König", praxis: "Praxis für Angiologie", telefon: "0211 5550107", email: "l.koenig@angiologie-praxis.example" },
    { id: "seed-doctor-08", name: "Dr. med. Michael Braun", praxis: "Internistische Gemeinschaftspraxis", telefon: "0211 5550108", email: "m.braun@internisten-gemeinsam.example" },
    { id: "seed-doctor-09", name: "Dr. med. Sofia Petrovic", praxis: "Wundambulanz St. Marien", telefon: "0211 5550109", email: "s.petrovic@wundambulanz-marien.example" },
    { id: "seed-doctor-10", name: "Dr. med. Felix Hartmann", praxis: "Orthopädie und Unfallchirurgie West", telefon: "0211 5550110", email: "f.hartmann@orthopaedie-west.example" },
  ];

  const pflegedienste = [
    { id: "seed-care-service-01", name: "Ambulanter Pflegedienst Sonnenschein", ansprechpartner: "Sabine Krüger", telefon: "0211 5550201", email: "kontakt@pflege-sonnenschein.example" },
    { id: "seed-care-service-02", name: "PflegeMobil Rhein", ansprechpartner: "Daniel Fischer", telefon: "0211 5550202", email: "team@pflegemobil-rhein.example" },
    { id: "seed-care-service-03", name: "Caritas Sozialstation Mitte", ansprechpartner: "Eva Baumann", telefon: "0211 5550203", email: "mitte@caritas-pflege.example" },
    { id: "seed-care-service-04", name: "Diakonie Pflege Zuhause", ansprechpartner: "Martin Lange", telefon: "0211 5550204", email: "zuhause@diakonie-pflege.example" },
    { id: "seed-care-service-05", name: "Wundpflege Aktiv", ansprechpartner: "Nadine Scholz", telefon: "0211 5550205", email: "kontakt@wundpflege-aktiv.example" },
  ];

  await Promise.all([
    ...aerzte.map(({ id, ...daten }) =>
      db.doctor.upsert({
        where: { id },
        update: { ...daten, geloeschtAm: null },
        create: { id, ...daten },
      }),
    ),
    ...pflegedienste.map(({ id, ...daten }) =>
      db.careService.upsert({
        where: { id },
        update: { ...daten, geloeschtAm: null },
        create: { id, ...daten },
      }),
    ),
  ]);

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

  // Abgeheilte Wunde: sonst waere der abgeschlossene Zustand nirgends zu sehen
  // (gruen hinterlegte Wundkarte, Aufklapper auf der Patientenseite, Filter
  // "Mit offener Wunde"). Bewusst bei Kowalski und nicht bei Berger - deren
  // erste Wunde ist der Einstiegspunkt mehrerer Playwright-Tests.
  const geheilteBezeichnung = "Post-OP Wunde Unterschenkel rechts";
  const bestehtGeheilteWunde = await db.wound.findFirst({
    where: { patientId: p2.id, bezeichnung: geheilteBezeichnung },
  });
  if (!bestehtGeheilteWunde) {
    const abschlussdatum = tageVorher(7);
    const w3 = await db.wound.create({
      data: {
        patientId: p2.id,
        bezeichnung: geheilteBezeichnung,
        diagnoseTyp: "POST_OP",
        lokalisationRegion: "UNTERSCHENKEL",
        lokalisationSeite: "RECHTS",
        bestehtSeitWert: 6,
        bestehtSeitEinheit: "WOCHEN",
        abgeschlossenAm: abschlussdatum,
      },
    });

    await db.assessment.create({
      data: {
        woundId: w3.id,
        typ: "ERSTAUFNAHME",
        datum: tageVorher(35),
        erstelltVonId: pflege.id,
        breiteMm: 22,
        laengeMm: 30,
        tiefeMm: 3,
        wundumgebung: j(["GEROETET"]),
        wundgrund: j(["GRANULATION"]),
        exsudatMenge: "KEINE_BIS_SCHWACH",
        wundabdeckung: j(["KOMPRESSE"]),
        fixierung: j(["SELBSTKLEBEND"]),
      },
    });

    await db.assessment.create({
      data: {
        woundId: w3.id,
        typ: "FOLGEAUFNAHME",
        datum: abschlussdatum,
        erstelltVonId: pflege.id,
        // Abgeheilt: vollstaendig mit 0 vermessen, damit die Flaechenkurve
        // auf null auslaeuft statt abzubrechen.
        breiteMm: 0,
        laengeMm: 0,
        tiefeMm: 0,
        wundumgebung: j(["UNAUFFAELLIG"]),
        wundgrund: j(["EPITHELGEWEBE"]),
        exsudatMenge: "KEINE",
        anmerkungen: "Vollständig epithelisiert, Verband nicht mehr erforderlich.",
        wundeGeheilt: true,
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
