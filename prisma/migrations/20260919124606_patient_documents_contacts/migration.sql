-- CreateTable
CREATE TABLE "Doctor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "praxis" TEXT,
    "telefon" TEXT,
    "email" TEXT,
    "geloeschtAm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CareService" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "ansprechpartner" TEXT,
    "telefon" TEXT,
    "email" TEXT,
    "geloeschtAm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PatientDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "hochgeladenVonId" TEXT,
    "typ" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "dateiname" TEXT NOT NULL,
    "pfad" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "groesseBytes" INTEGER NOT NULL,
    "geloeschtAm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PatientDocument_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PatientDocument_hochgeladenVonId_fkey" FOREIGN KEY ("hochgeladenVonId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Wound" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "arztId" TEXT,
    "pflegedienstId" TEXT,
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
    CONSTRAINT "Wound_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Wound_arztId_fkey" FOREIGN KEY ("arztId") REFERENCES "Doctor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Wound_pflegedienstId_fkey" FOREIGN KEY ("pflegedienstId") REFERENCES "CareService" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Wound" ("abgeschlossenAm", "bestehtSeitEinheit", "bestehtSeitWert", "bezeichnung", "createdAt", "diagnoseFreitext", "diagnoseTyp", "geloeschtAm", "id", "lokalisationAusrichtung", "lokalisationFreitext", "lokalisationRegion", "lokalisationSeite", "patientId", "rezidiv", "rezidivAnzahl", "updatedAt") SELECT "abgeschlossenAm", "bestehtSeitEinheit", "bestehtSeitWert", "bezeichnung", "createdAt", "diagnoseFreitext", "diagnoseTyp", "geloeschtAm", "id", "lokalisationAusrichtung", "lokalisationFreitext", "lokalisationRegion", "lokalisationSeite", "patientId", "rezidiv", "rezidivAnzahl", "updatedAt" FROM "Wound";
DROP TABLE "Wound";
ALTER TABLE "new_Wound" RENAME TO "Wound";
CREATE INDEX "Wound_patientId_idx" ON "Wound"("patientId");
CREATE INDEX "Wound_arztId_idx" ON "Wound"("arztId");
CREATE INDEX "Wound_pflegedienstId_idx" ON "Wound"("pflegedienstId");
CREATE INDEX "Wound_geloeschtAm_idx" ON "Wound"("geloeschtAm");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Doctor_name_idx" ON "Doctor"("name");

-- CreateIndex
CREATE INDEX "Doctor_geloeschtAm_idx" ON "Doctor"("geloeschtAm");

-- CreateIndex
CREATE INDEX "CareService_name_idx" ON "CareService"("name");

-- CreateIndex
CREATE INDEX "CareService_geloeschtAm_idx" ON "CareService"("geloeschtAm");

-- CreateIndex
CREATE INDEX "PatientDocument_patientId_typ_createdAt_idx" ON "PatientDocument"("patientId", "typ", "createdAt");

-- CreateIndex
CREATE INDEX "PatientDocument_geloeschtAm_idx" ON "PatientDocument"("geloeschtAm");
