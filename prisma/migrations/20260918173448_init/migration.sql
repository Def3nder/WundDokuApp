-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "handzeichen" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rolle" TEXT NOT NULL DEFAULT 'PFLEGE',
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nachname" TEXT NOT NULL,
    "vorname" TEXT NOT NULL,
    "geburtsdatum" DATETIME NOT NULL,
    "patientennummer" TEXT NOT NULL,
    "arztTherapieverantwortlich" TEXT,
    "notizen" TEXT,
    "geloeschtAm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "angelegtVonId" TEXT,
    CONSTRAINT "Patient_angelegtVonId_fkey" FOREIGN KEY ("angelegtVonId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Wound" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "diagnoseTyp" TEXT NOT NULL,
    "diagnoseFreitext" TEXT,
    "lokalisationRegion" TEXT,
    "lokalisationSeite" TEXT,
    "lokalisationAusrichtung" TEXT,
    "lokalisationFreitext" TEXT,
    "bestehtSeitWert" INTEGER,
    "bestehtSeitEinheit" TEXT,
    "rezidiv" BOOLEAN NOT NULL DEFAULT false,
    "rezidivAnzahl" INTEGER,
    "abgeschlossenAm" DATETIME,
    "geloeschtAm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Wound_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "woundId" TEXT NOT NULL,
    "typ" TEXT NOT NULL,
    "datum" DATETIME NOT NULL,
    "istEntwurf" BOOLEAN NOT NULL DEFAULT false,
    "erstelltVonId" TEXT,
    "wagnerArmstrongGrad" TEXT,
    "dekubitusKategorie" TEXT,
    "wundumgebung" TEXT NOT NULL DEFAULT '[]',
    "wundrand" TEXT NOT NULL DEFAULT '[]',
    "wundgrund" TEXT NOT NULL DEFAULT '[]',
    "wundgrundSonstigesText" TEXT,
    "breiteMm" REAL,
    "laengeMm" REAL,
    "tiefeMm" REAL,
    "exsudatMenge" TEXT,
    "exsudatFarben" TEXT NOT NULL DEFAULT '[]',
    "exsudatFarbeSonstiges" TEXT,
    "exsudatKonsistenz" TEXT NOT NULL DEFAULT '[]',
    "geruch" BOOLEAN NOT NULL DEFAULT false,
    "entzuendungszeichen" TEXT NOT NULL DEFAULT '[]',
    "lokaleInfektzeichen" TEXT NOT NULL DEFAULT '[]',
    "systemischeZeichen" BOOLEAN NOT NULL DEFAULT false,
    "infektionSonstiges" TEXT,
    "abstrichGenommen" BOOLEAN NOT NULL DEFAULT false,
    "abstrichErgebnis" TEXT,
    "schmerzen" BOOLEAN NOT NULL DEFAULT false,
    "schmerzVas" INTEGER,
    "schmerzWundeModus" TEXT,
    "schmerzWundeUhr" INTEGER,
    "schmerzWundrandModus" TEXT,
    "schmerzWundrandUhr" INTEGER,
    "schmerzWundumgebungModus" TEXT,
    "schmerzWundumgebungUhr" INTEGER,
    "schmerzVerbandwechsel" BOOLEAN NOT NULL DEFAULT false,
    "schmerzVerbandwechselVas" INTEGER,
    "schmerzDruck" BOOLEAN NOT NULL DEFAULT false,
    "schmerzDruckVas" INTEGER,
    "schmerzUeberall" BOOLEAN NOT NULL DEFAULT false,
    "schmerzUeberallVas" INTEGER,
    "schmerztagebuch" BOOLEAN NOT NULL DEFAULT false,
    "schmerzSonstiges" TEXT,
    "wundheilungsfaktoren" TEXT,
    "wundspuelung" TEXT NOT NULL DEFAULT '[]',
    "wundspuelungSonstiges" TEXT,
    "reinigung" TEXT NOT NULL DEFAULT '[]',
    "reinigungSonstiges" TEXT,
    "hautpflege" TEXT,
    "wundrandschutz" TEXT,
    "wundfuellung" TEXT NOT NULL DEFAULT '[]',
    "wundfuellungGroesseCm" REAL,
    "wundfuellungSonstiges" TEXT,
    "wundabdeckung" TEXT NOT NULL DEFAULT '[]',
    "wundabdeckungGroesseCm" REAL,
    "wundabdeckungSonstiges" TEXT,
    "fixierung" TEXT NOT NULL DEFAULT '[]',
    "fixierungSonstiges" TEXT,
    "kompression" TEXT NOT NULL DEFAULT '[]',
    "kompressionBinde1BreiteCm" REAL,
    "kompressionBinde1Anzahl" INTEGER,
    "kompressionBinde2BreiteCm" REAL,
    "kompressionBinde2Anzahl" INTEGER,
    "kompressionKlasse" TEXT,
    "kompressionMass" TEXT,
    "therapieSonstiges" TEXT,
    "anmerkungen" TEXT,
    "geloeschtAm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Assessment_woundId_fkey" FOREIGN KEY ("woundId") REFERENCES "Wound" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Assessment_erstelltVonId_fkey" FOREIGN KEY ("erstelltVonId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assessmentId" TEXT NOT NULL,
    "dateiname" TEXT NOT NULL,
    "pfad" TEXT NOT NULL,
    "thumbnailPfad" TEXT NOT NULL,
    "breite" INTEGER NOT NULL,
    "hoehe" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "groesseBytes" INTEGER NOT NULL,
    "beschreibung" TEXT,
    "reihenfolge" INTEGER NOT NULL DEFAULT 0,
    "aufgenommenAm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Photo_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "entitaet" TEXT NOT NULL,
    "entitaetId" TEXT NOT NULL,
    "aktion" TEXT NOT NULL,
    "details" TEXT,
    "zeitpunkt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_patientennummer_key" ON "Patient"("patientennummer");

-- CreateIndex
CREATE INDEX "Patient_nachname_vorname_idx" ON "Patient"("nachname", "vorname");

-- CreateIndex
CREATE INDEX "Patient_geloeschtAm_idx" ON "Patient"("geloeschtAm");

-- CreateIndex
CREATE INDEX "Wound_patientId_idx" ON "Wound"("patientId");

-- CreateIndex
CREATE INDEX "Wound_geloeschtAm_idx" ON "Wound"("geloeschtAm");

-- CreateIndex
CREATE INDEX "Assessment_woundId_datum_idx" ON "Assessment"("woundId", "datum");

-- CreateIndex
CREATE INDEX "Assessment_geloeschtAm_idx" ON "Assessment"("geloeschtAm");

-- CreateIndex
CREATE INDEX "Photo_assessmentId_reihenfolge_idx" ON "Photo"("assessmentId", "reihenfolge");

-- CreateIndex
CREATE INDEX "AuditLog_entitaet_entitaetId_idx" ON "AuditLog"("entitaet", "entitaetId");

-- CreateIndex
CREATE INDEX "AuditLog_zeitpunkt_idx" ON "AuditLog"("zeitpunkt");
