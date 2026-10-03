# WundDoku

Digitale Wunddokumentation für Praxis und Pflege. Bildet den
DRACO-Wunddokumentationsbogen ab: pro Patient beliebig viele Wunden, je eine
Erstaufnahme und unbegrenzt Folgeaufnahmen, mit Wundfotos, Verlaufsdiagrammen
und Ausdruck im gewohnten Layout.

## Dokumentation

| Datei | Inhalt |
|---|---|
| [docs/PLAN.md](docs/PLAN.md) | Vollständiger Umsetzungsplan |
| [docs/ENTSCHEIDUNGEN.md](docs/ENTSCHEIDUNGEN.md) | Alle Entscheidungen und Annahmen mit Begründung |
| [docs/FELDINVENTAR.md](docs/FELDINVENTAR.md) | Auswertung des Papierbogens, Feld für Feld |
| [SESSION.md](SESSION.md) | Arbeitsstand, offene Schritte und Stolpersteine beim Bauen |

## Einrichtung

Voraussetzung: Node.js 20 oder neuer (getestet mit 24).

```bash
npm install
cp .env.example .env
```

In `.env` ein `AUTH_SECRET` eintragen:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Datenbank anlegen und mit Testdaten füllen:

```bash
npm run db:migrate
npm run db:seed
```

Starten:

```bash
npm run dev
```

Die App läuft auf http://localhost:3000. Die Zugangsdaten des ersten Kontos
stehen in `.env` (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`) — **nach der ersten
Anmeldung ändern.**

Auf dem iPhone/iPad lässt sich die App über Safari → Teilen → „Zum Home-Bildschirm"
als Symbol ablegen und startet dann ohne Browserleiste. Das Symbol stammt aus
`src/app/apple-icon.png` und `public/icon-*.png` (Puls-Linie auf Türkis), das
Web-App-Manifest aus `src/app/manifest.ts`. Es gibt bewusst keinen Service Worker
und keinen Offline-Betrieb. Bereits gespeicherte Lesezeichen behalten ihr altes
Symbol, bis sie neu angelegt werden.

## Befehle

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver |
| `npm run build` / `npm start` | Produktionsbetrieb |
| `npm run typecheck` | TypeScript prüfen |
| `npm test` | Tests ausführen |
| `npm run test:a11y` | Playwright-/axe-Prüfung in Hell und Dunkel (lokales Chrome) |
| `npm run test:responsive` | Layoutprüfung in 14 Desktop-, Smartphone- und Tablet-Profilen (Chrome und WebKit) |
| `npm run test:zeiterfassung` | Zeiterfassung mit eigener Testdatenbank prüfen (Produktionsbuild vorher; Chrome und WebKit) |
| `npm run db:studio` | Datenbank im Browser ansehen |
| `npm run db:migrate` | Schemaänderung einspielen |

## Aufbau

```
assets/vorlage/    Original-Papierbogen, nur Orientierung (nicht im Repository)
assets/fonts/      Noto Sans fuer den PDF-Export
prisma/            Schema, Migrationen, Testdaten
storage/           Wundfotos (nicht im Repository)
src/app/           Seiten und Routen
src/components/    UI-Bausteine
src/lib/           Fachlogik: enums, wundmasse, pdf, fotos, auth
src/actions/       Server Actions
docs/              Plan, Entscheidungen, Feldinventar
```

Alle Auswahlwerte und ihre deutschen Beschriftungen stehen ausschließlich in
[`src/lib/enums.ts`](src/lib/enums.ts). Formular, Ausdruck und Diagramme lesen
daraus — Bezeichnungen an anderer Stelle zu ändern, würde sie auseinanderlaufen
lassen.

## Persönliche Zeiterfassung

Unter **Zeiterfassung** kann jeder angemeldete Nutzer seine eigenen Arbeitszeiten
erfassen. **Arbeitszeit-Einstellungen** konfiguriert den üblichen Arbeitsbeginn
und das Arbeitsende, die Standardpause in Minuten, die Wochenarbeitszeit in
Stunden und die regelmäßigen Arbeitstage. Die Grundeinstellung ist
08:00–16:30 Uhr, 30 Minuten Pause und 40 Stunden von Montag bis Freitag.

- **Ein-/Ausstempeln:** Datum und Uhrzeit werden vorgeschlagen und erst nach
  Prüfung und Bestätigung gespeichert. Eine laufende Buchung bleibt auch nach
  Abmelden oder Schließen des Browsers erhalten.
- **Nachtragen und korrigieren:** Die Tagesvorlage befüllt Nachträge. Alle
  Einträge einschließlich einer laufenden Buchung lassen sich bearbeiten;
  Löschen entfernt sie weich aus der Auswertung.
- **Pause:** Pro Buchung vorbelegt, beim Ausstempeln an die tatsächliche Pause
  anpassen. Bei mehreren Buchungen eines Tages die Pause nicht doppelt erfassen.
- **Woche/Monat:** Nettoarbeitszeit, Pausen, Soll und Saldo sowie Tagesübersicht
  und Buchungsliste. Wochenstunden werden gleichmäßig auf die gewählten
  Arbeitstage verteilt. Der Saldo berücksichtigt nur Solltage bis einschließlich
  heute; laufende Buchungen zählen erst nach dem Ausstempeln.
- **Datierte Vorgaben:** Neue Einstellungen gelten ab dem gewählten Datum.
  Vorherige Perioden bleiben erhalten; das Bearbeiten einer alten Vorgabe ist
  eine bewusste Korrektur ihrer Periode. Bereits gebuchte Pausen bleiben gleich.

Alle Zeiten verwenden **Europe/Berlin**, unabhängig vom Gerät. Nachtschichten
werden an Tages-/Monatsgrenzen aufgeteilt, die Pause anteilig verteilt.
Zeitumstellungen werden berücksichtigt; bei der doppelten Herbststunde kann
das erste oder zweite Vorkommen gewählt werden. Überschneidungen, zukünftige
Buchungen und mehrere laufende Stechuhren werden verhindert. Eine Buchung darf
höchstens 24 Stunden umfassen. Nach zwölf Stunden erscheint ein Prüfhinweis.

Urlaub, Krankheit, Feiertage, ein übertragbares Stundenkonto und Export sind
noch nicht enthalten. Administratoren haben keine Ansicht fremder Arbeitszeiten;
im bestehenden Änderungsprotokoll sind die Aktionen ohne Zeitwerte/Notizen sichtbar.

Die Browserprüfung nutzt ausschließlich `test-results/arbeitszeit-e2e.db` und
einen separaten Server auf Port 3101. Vorher `npm run build` ausführen (Dev-Server
für Prisma-Generierung stoppen). Bei bereits aktuellem Prisma-Client reicht
`node node_modules/next/dist/bin/next build` auch neben dem Dev-Server. Für eine
abweichende vorhandene WebKit-Engine kann wie beim Responsive-Test
`WEBKIT_EXECUTABLE_PATH` gesetzt werden.

## Datenschutz und Betrieb

Die App verarbeitet Gesundheitsdaten nach Art. 9 DSGVO. Was die Anwendung
mitbringt:

- Kein externer Dienst, keine Telemetrie — alles bleibt auf dem Rechner
- Wundfotos liegen außerhalb von `public/` und werden nur nach Prüfung der
  Sitzung ausgeliefert
- EXIF-Daten (inklusive GPS) werden beim Hochladen entfernt
- Löschen ist immer umkehrbar; jede Änderung landet im Änderungsprotokoll
- `storage/`, `*.db`, `.env` und die PDF-Vorlage sind von der
  Versionsverwaltung ausgeschlossen

Was Du zusätzlich sicherstellen musst:

- **Festplattenverschlüsselung** (BitLocker unter Windows). Die SQLite-Datei ist
  selbst nicht verschlüsselt — wer den Rechner hat, hat die Daten.
- **Sicherung** von `prisma/dev.db` *und* `storage/` im selben Rhythmus. Getrennt
  gesicherte Bestände passen nicht mehr zusammen.
- **Aufbewahrungsfrist:** Behandlungsdokumentation ist zehn Jahre aufzubewahren
  (§ 630f BGB).
- Kein Betrieb über das offene Internet ohne HTTPS und vorgeschalteten
  Zugriffsschutz.

## Stand der Umsetzung

Die Regeln für Bildschirmgrößen und die Browser-Testmatrix stehen in
[docs/RESPONSIVE.md](docs/RESPONSIVE.md). Die Tests benötigen lokales Chrome,
eine mit `npx playwright install webkit` installierte WebKit-Engine und die
vorhandenen Testdaten.

- [x] Phase 1 — Fundament: Projekt, Design-System, Datenmodell, Enums
- [x] Phase 2 — Patienten und Wunden: Stammdaten, Suche, Wund-Cockpit, Benutzerverwaltung
- [x] Phase 3 — Aufnahmeformular
- [x] Phase 4 — Wundfotos
- [x] Phase 5 — Diagramme und Vergleich
- [x] Phase 6 — PDF-Export, Audit-Log und Feinschliff (Leerzustände, Tastaturbedienung, axe, Dark Mode)
