-- Fotos sind Teil der Behandlungsdokumentation und werden daher wie die
-- übrigen Fachdaten nur weich gelöscht.
ALTER TABLE "Photo" ADD COLUMN "geloeschtAm" DATETIME;

CREATE INDEX "Photo_geloeschtAm_idx" ON "Photo"("geloeschtAm");
