import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { mkdtempSync, readFileSync, rmSync, readdirSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { bucheArbeitszeit, entferneArbeitszeit, speichereZeitVorgabe } from "./arbeitszeit-server";
import { zeitBuchungSchema, zeitVorgabeSchema } from "./schema/arbeitszeit";

const ordner = mkdtempSync(path.join(tmpdir(), "wunddoku-zeit-"));
const db = new PrismaClient({ datasources: { db: { url: `file:${path.join(ordner, "test.db").replaceAll("\\", "/")}` } } });
const jetzt = new Date("2026-11-01T12:00:00Z");
const eingabe = (beginn: string, ende = "", rest = {}) => zeitBuchungSchema.parse({ beginn, ende, pauseMinuten: 0, notiz: "", ...rest });

beforeAll(async () => {
  await db.$executeRawUnsafe('CREATE TABLE "User" ("id" TEXT PRIMARY KEY)');
  await db.$executeRawUnsafe('CREATE TABLE "AuditLog" ("id" TEXT PRIMARY KEY, "userId" TEXT, "entitaet" TEXT NOT NULL, "entitaetId" TEXT NOT NULL, "aktion" TEXT NOT NULL, "details" TEXT, "zeitpunkt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)');
  await db.$executeRawUnsafe('INSERT INTO "User" ("id") VALUES (\'alice\'), (\'bob\')');
  const sql = readFileSync(path.join(process.cwd(), "prisma/migrations/20261001100000_zeiterfassung/migration.sql"), "utf8");
  for (const befehl of sql.split(";").map((s) => s.trim()).filter(Boolean)) await db.$executeRawUnsafe(befehl);
});

afterAll(async () => {
  await db.$disconnect();
  // Ausschliesslich die eigens erzeugten Dateien entfernen, ohne rekursives Loeschen.
  for (const datei of readdirSync(ordner)) rmSync(path.join(ordner, datei));
  rmdirSync(ordner);
});

describe("persistente Arbeitszeit mit Nutzertrennung", () => {
  it("speichert, beendet und protokolliert eine laufende Buchung", async () => {
    const e = await bucheArbeitszeit(db, "alice", eingabe("2026-10-01T08:00"), jetzt);
    expect(e.laufendFuer).toBe("alice");
    const fertig = await bucheArbeitszeit(db, "alice", eingabe("2026-10-01T08:00", "2026-10-01T16:30", { id: e.id, version: e.version, pauseMinuten: 30 }), jetzt);
    expect(fertig.laufendFuer).toBeNull();
    expect(fertig.version).toBe(1);
    expect(await db.auditLog.count({ where: { entitaetId: e.id } })).toBe(2);
  });
  it("laesst fremde Eintraege weder aendern noch loeschen", async () => {
    const e = await bucheArbeitszeit(db, "alice", eingabe("2026-10-02T08:00", "2026-10-02T09:00"), jetzt);
    await expect(bucheArbeitszeit(db, "bob", eingabe("2026-10-02T08:00", "2026-10-02T10:00", { id: e.id, version: 0 }), jetzt)).rejects.toThrow("nicht verfügbar");
    await expect(entferneArbeitszeit(db, "bob", e.id, 0)).rejects.toThrow();
    expect((await db.timeEntry.findUniqueOrThrow({ where: { id: e.id } })).geloeschtAm).toBeNull();
    await expect(bucheArbeitszeit(db, "bob", eingabe("2026-10-02T08:00", "2026-10-02T09:00"), jetzt)).resolves.toBeDefined();
  });
  it("verhindert Ueberschneidungen, erlaubt aber direkt anschliessende Buchungen", async () => {
    await bucheArbeitszeit(db, "alice", eingabe("2026-10-03T08:00", "2026-10-03T10:00"), jetzt);
    await expect(bucheArbeitszeit(db, "alice", eingabe("2026-10-03T09:00", "2026-10-03T11:00"), jetzt)).rejects.toThrow("überschneidet");
    await expect(bucheArbeitszeit(db, "alice", eingabe("2026-10-03T10:00", "2026-10-03T11:00"), jetzt)).resolves.toBeDefined();
  });
  it("blockiert doppelte laufende Zeiten auch durch den Datenbankindex", async () => {
    const e = await bucheArbeitszeit(db, "alice", eingabe("2026-10-04T08:00"), jetzt);
    await expect(bucheArbeitszeit(db, "alice", eingabe("2026-10-04T09:00"), jetzt)).rejects.toThrow("überschneidet");
    await expect(db.timeEntry.create({ data: { userId: "alice", laufendFuer: "alice", beginn: jetzt } })).rejects.toThrow();
    await entferneArbeitszeit(db, "alice", e.id, e.version);
    const geloescht = await db.timeEntry.findUniqueOrThrow({ where: { id: e.id } });
    expect(geloescht.geloeschtAm).not.toBeNull();
    expect(geloescht.laufendFuer).toBeNull();
    await expect(bucheArbeitszeit(db, "alice", eingabe("2026-10-04T08:00", "2026-10-04T09:00"), jetzt)).resolves.toBeDefined();
  });
  it("verhindert stilles Ueberschreiben aus einem veralteten Tab", async () => {
    const e = await bucheArbeitszeit(db, "alice", eingabe("2026-10-05T08:00", "2026-10-05T09:00"), jetzt);
    await bucheArbeitszeit(db, "alice", eingabe("2026-10-05T08:00", "2026-10-05T10:00", { id: e.id, version: 0 }), jetzt);
    await expect(bucheArbeitszeit(db, "alice", eingabe("2026-10-05T08:00", "2026-10-05T11:00", { id: e.id, version: 0 }), jetzt)).rejects.toThrow("inzwischen geändert");
    await expect(entferneArbeitszeit(db, "alice", e.id, 0)).rejects.toThrow();
  });
  it("lehnt zukuenftige Arbeitszeiten ab", async () => {
    await expect(bucheArbeitszeit(db, "alice", eingabe("2026-12-01T08:00"), jetzt)).rejects.toThrow("Zukunft");
  });
  it("schuetzt Vorgaben anderer Nutzer und bewahrt fruehere Perioden", async () => {
    const daten = zeitVorgabeSchema.parse({ abDatum: "2026-10-01", standardBeginn: "07:30", standardEnde: "16:00", wochenStunden: 40, pauseMinuten: 30, arbeitstage: [1, 2, 3, 4, 5] });
    const v = await speichereZeitVorgabe(db, "alice", daten);
    await expect(speichereZeitVorgabe(db, "bob", { ...daten, id: v.id })).rejects.toThrow();
    await speichereZeitVorgabe(db, "alice", { ...daten, abDatum: "2026-10-15", wochenMinuten: 1800 });
    expect(await db.timeSettings.count({ where: { userId: "alice" } })).toBe(2);
    expect((await db.timeSettings.findUniqueOrThrow({ where: { id: v.id } })).wochenMinuten).toBe(2400);
  });
});
