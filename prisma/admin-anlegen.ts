/**
 * Legt den ersten Administrator einer leeren Datenbank an (Produktivbetrieb).
 *
 * Anders als der Seed erzeugt dieses Skript weder Testpatienten noch ein
 * Konto mit bekanntem Passwort. Es weigert sich, wenn schon ein Benutzer
 * existiert, und ist damit gefahrlos mehrfach aufrufbar.
 *
 *   --pruefen   Exit-Code 0 = Datenbank hat keine Benutzer, 3 = es gibt schon welche
 *   sonst       legt den Administrator aus ADMIN_EMAIL, ADMIN_NAME,
 *               ADMIN_HANDZEICHEN und ADMIN_PASSWORT an (Umgebungsvariablen,
 *               damit das Passwort nicht in der Prozessliste auftaucht)
 *
 * Aufgerufen von setup.sh.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const VORHANDEN = 3;

async function main() {
  const anzahl = await db.user.count();
  if (process.argv.includes("--pruefen")) process.exit(anzahl === 0 ? 0 : VORHANDEN);
  if (anzahl > 0) {
    console.error("Es existieren bereits Benutzer; es wird kein weiterer Administrator angelegt.");
    process.exit(VORHANDEN);
  }

  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const name = (process.env.ADMIN_NAME ?? "").trim();
  const handzeichen = (process.env.ADMIN_HANDZEICHEN ?? "").trim().toUpperCase();
  const passwort = process.env.ADMIN_PASSWORT ?? "";

  // Dieselben Regeln wie beim Anlegen im Programm (src/actions/benutzer.ts).
  const fehler: string[] = [];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fehler.push("Bitte eine gültige E-Mail-Adresse angeben.");
  if (name.length < 1 || name.length > 100) fehler.push("Der Name ist erforderlich (höchstens 100 Zeichen).");
  if (handzeichen.length < 1 || handzeichen.length > 6) fehler.push("Das Handzeichen ist erforderlich (höchstens 6 Zeichen).");
  if (passwort.length < 10 || passwort.length > 200) fehler.push("Das Passwort braucht 10 bis 200 Zeichen.");
  if (fehler.length > 0) {
    console.error(fehler.join("\n"));
    process.exit(2);
  }

  await db.user.create({
    data: { email, name, handzeichen, passwordHash: await bcrypt.hash(passwort, 12), rolle: "ADMIN" },
  });
  console.log(`Administrator ${email} angelegt.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
