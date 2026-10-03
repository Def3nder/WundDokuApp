CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "beginn" DATETIME NOT NULL,
    "ende" DATETIME,
    "pauseMinuten" INTEGER NOT NULL DEFAULT 0,
    "notiz" TEXT NOT NULL DEFAULT '',
    "laufendFuer" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "geloeschtAm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TimeEntry_pause" CHECK ("pauseMinuten" >= 0),
    CONSTRAINT "TimeEntry_laufend" CHECK (
      ("ende" IS NULL AND "geloeschtAm" IS NULL AND "laufendFuer" IS NOT NULL AND "laufendFuer" = "userId") OR
      (("ende" IS NOT NULL OR "geloeschtAm" IS NOT NULL) AND "laufendFuer" IS NULL)
    )
);
CREATE UNIQUE INDEX "TimeEntry_laufendFuer_key" ON "TimeEntry"("laufendFuer");
CREATE INDEX "TimeEntry_userId_geloeschtAm_beginn_idx" ON "TimeEntry"("userId", "geloeschtAm", "beginn");

CREATE TABLE "TimeSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "abDatum" TEXT NOT NULL,
    "standardBeginn" TEXT NOT NULL DEFAULT '08:00',
    "standardEnde" TEXT NOT NULL DEFAULT '16:30',
    "wochenMinuten" INTEGER NOT NULL DEFAULT 2400,
    "pauseMinuten" INTEGER NOT NULL DEFAULT 30,
    "arbeitstage" TEXT NOT NULL DEFAULT '[1,2,3,4,5]',
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TimeSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TimeSettings_userId_abDatum_key" ON "TimeSettings"("userId", "abDatum");
