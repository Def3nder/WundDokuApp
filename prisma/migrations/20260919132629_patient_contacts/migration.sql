-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nachname" TEXT NOT NULL,
    "vorname" TEXT NOT NULL,
    "geburtsdatum" DATETIME NOT NULL,
    "patientennummer" TEXT NOT NULL,
    "arztTherapieverantwortlich" TEXT,
    "arztId" TEXT,
    "pflegedienstId" TEXT,
    "notizen" TEXT,
    "geloeschtAm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "angelegtVonId" TEXT,
    CONSTRAINT "Patient_arztId_fkey" FOREIGN KEY ("arztId") REFERENCES "Doctor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Patient_pflegedienstId_fkey" FOREIGN KEY ("pflegedienstId") REFERENCES "CareService" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Patient_angelegtVonId_fkey" FOREIGN KEY ("angelegtVonId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Patient" ("angelegtVonId", "arztTherapieverantwortlich", "createdAt", "geburtsdatum", "geloeschtAm", "id", "nachname", "notizen", "patientennummer", "updatedAt", "vorname") SELECT "angelegtVonId", "arztTherapieverantwortlich", "createdAt", "geburtsdatum", "geloeschtAm", "id", "nachname", "notizen", "patientennummer", "updatedAt", "vorname" FROM "Patient";
DROP TABLE "Patient";
ALTER TABLE "new_Patient" RENAME TO "Patient";
CREATE UNIQUE INDEX "Patient_patientennummer_key" ON "Patient"("patientennummer");
CREATE INDEX "Patient_nachname_vorname_idx" ON "Patient"("nachname", "vorname");
CREATE INDEX "Patient_arztId_idx" ON "Patient"("arztId");
CREATE INDEX "Patient_pflegedienstId_idx" ON "Patient"("pflegedienstId");
CREATE INDEX "Patient_geloeschtAm_idx" ON "Patient"("geloeschtAm");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
