import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Eigene Datenbank: diese Pruefung darf niemals die Anwendungsdaten veraendern.
const ausgabe = path.resolve("test-results");
const datei = path.join(ausgabe, "arbeitszeit-e2e.db");
if (path.dirname(datei) !== ausgabe || path.basename(datei) !== "arbeitszeit-e2e.db") throw new Error("Unsicherer Testpfad");
mkdirSync(ausgabe, { recursive: true });
if (existsSync(datei)) unlinkSync(datei);
const url = `file:${datei.replaceAll("\\", "/")}`;
const vorbereiten = new PrismaClient({ datasources: { db: { url } } });
try { await vorbereiten.$executeRawUnsafe("PRAGMA user_version = 0"); } finally { await vorbereiten.$disconnect(); }
execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
  env: { ...process.env, DATABASE_URL: url }, stdio: "inherit",
});
const db = new PrismaClient({ datasources: { db: { url } } });
try {
  for (const name of ["anna", "ben", "admin"]) await db.user.create({ data: {
    email: `${name}@zeittest.example`, name: `${name === "anna" ? "Anna" : "Ben"} Zeittest`, handzeichen: name.slice(0, 2).toUpperCase(),
    passwordHash: await bcrypt.hash("Zeittest!2026", 4), rolle: name === "admin" ? "ADMIN" : "PFLEGE",
  } });
} finally { await db.$disconnect(); }
