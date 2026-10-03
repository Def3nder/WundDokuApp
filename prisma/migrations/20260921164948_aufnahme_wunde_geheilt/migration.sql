-- AlterTable
--
-- Von Hand geschrieben: Prisma baut fuer SQLite bei einer NOT-NULL-Spalte mit
-- Default die gesamte Tabelle neu (CREATE/INSERT SELECT/DROP/RENAME). SQLite
-- beherrscht hier aber ein schlichtes ADD COLUMN - das ergibt dieselbe
-- Spaltendefinition, ohne die Aufnahmen umzukopieren.
ALTER TABLE "Assessment" ADD COLUMN "wundeGeheilt" BOOLEAN NOT NULL DEFAULT false;
