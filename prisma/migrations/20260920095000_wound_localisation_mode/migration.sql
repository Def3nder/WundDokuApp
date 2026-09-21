-- Die Wahl der Lokalisationshilfe gehört zur Wunde, nicht zum Benutzer.
ALTER TABLE "Wound" ADD COLUMN "lokalisationModus" TEXT NOT NULL DEFAULT 'MARKER';

-- Bereits frei eingezeichnete Lokalisationen beim Umstieg korrekt übernehmen.
UPDATE "Wound"
SET "lokalisationModus" = 'FREIHAND'
WHERE "lokalisationMarkerX" IS NOT NULL
  AND "lokalisationMarkerY" IS NOT NULL
  AND "lokalisationMarkerRadius" IS NOT NULL;
