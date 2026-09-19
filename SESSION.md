# Sitzungsnotizen

Arbeitsstand für die Fortsetzung in einer neuen Sitzung. Ergänzt die
inhaltlichen Dokumente in [docs/](docs/) um das, was beim Bauen gelernt wurde.

**Stand:** 19.09.2026 · Phase 1 und 2 fertig, Phase 3 etwa zur Hälfte
**Prüfstand:** `npx tsc --noEmit` sauber · `npm test` 28/28 grün · noch nichts committet

---

## Womit anfangen

Phase 3 (Aufnahmeformular) ist angefangen. **Nächster Schritt: der Werte-Mapper
`src/lib/schema/aufnahme-vorgabe.ts`.**

### Fertig in Phase 3

| Datei | Inhalt |
|---|---|
| `src/lib/schema/aufnahme.ts` | Zod-Schema aller Aufnahmefelder inkl. `superRefine` |
| `src/lib/schema/aufnahme-formdata.ts` | FormData → geprüfte Daten → Datensatz |
| `src/actions/aufnahmen.ts` | Anlegen, Ändern, Entwurf speichern, Löschen |
| `src/components/formular/chip-group.tsx` | Mehrfachauswahl als Chips, mit Exklusiv-Option |
| `src/components/formular/radio-chips.tsx` | Einfachauswahl + `JaNein` |
| `src/components/formular/vas-slider.tsx` | Schmerzskala 0–10 |
| `src/components/formular/zifferblatt.tsx` | Uhrzeit-Auswahl für die Schmerzlage |
| `src/components/formular/abschnitt.tsx` | Aufklappbarer Abschnitt + Sprungleiste |
| `src/components/formular/wundgroesse.tsx` | Maße mit Live-Fläche und Trendvergleich |

### Fehlt noch in Phase 3

1. **`src/lib/schema/aufnahme-vorgabe.ts`** — Datensatz → Formularwerte.
   Braucht zwei Funktionen: `aufnahmeZuWerten(a)` für das Bearbeiten und
   `vorbefuellungAus(letzte)` für „Von letzter Aufnahme übernehmen".
   *Wichtige Festlegung:* Breite, Länge und Tiefe werden **nicht** vorbefüllt.
   Genau die müssen bei jedem Verbandwechsel neu gemessen werden; ein
   stehengebliebener Wert wäre eine falsche Verlaufskurve.
2. **`src/components/formular/aufnahme-formular.tsx`** — das Formular, das die
   sechs Abschnitte zusammensetzt. Wegen der Größe besser in Teildateien
   (`abschnitt-befund.tsx`, `-groesse.tsx`, `-infektion.tsx`, `-schmerz.tsx`,
   `-therapie.tsx`) und eine Datei, die sie orchestriert.
3. **Autosave-Hook** — ruft `entwurfSpeichern` aus `src/actions/aufnahmen.ts`
   mit Verzögerung auf und merkt sich die zurückgegebene `entwurfId` in einem
   versteckten Feld `entwurfId`. Die Action ist fertig und wartet darauf.
4. **Drei Seiten:**
   - `src/app/(app)/wunden/[id]/aufnahmen/neu/page.tsx`
   - `src/app/(app)/aufnahmen/[id]/page.tsx` (Leseansicht)
   - `src/app/(app)/aufnahmen/[id]/bearbeiten/page.tsx`

   Die Zeitleiste verlinkt bereits auf `/aufnahmen/[id]`, das Cockpit auf
   `/wunden/[id]/aufnahmen/neu` — beide Ziele sind noch 404.

### Die sechs Abschnitte

1. Wundbefund — Wundumgebung, Wundrand, Wundgrund
2. Wundgröße & Exsudation
3. Entzündung & Infektion (inkl. Abstrich)
4. Schmerz
5. Therapieplan
6. Fotos (erst in Phase 4, Abschnitt vorerst als Platzhalter)

---

## Danach

- **Phase 4** — Wundfotos: Upload mit `sharp`, EXIF entfernen, Thumbnails,
  geschützte Auslieferung über `src/app/api/photos/[id]/route.ts`
- **Phase 5** — Verlaufsdiagramme (Recharts) und Foto-Vergleich
- **Phase 6** — PDF-Export, Änderungsprotokoll-Ansicht, Feinschliff

---

## Was beim Bauen zu beachten ist

### Der Dev-Server muss zum Bauen aus sein

Unter Windows sperrt der laufende Server die Prisma-DLL:

```
EPERM: operation not permitted, rename '…\query_engine-windows.dll.node.tmp…'
```

Erst `preview_stop` bzw. den Server beenden, dann `npm run build`, dann wieder
starten. Kein Projektfehler.

### npm 12 blockiert Installationsskripte

Prisma, esbuild und `sharp` brauchen ihre Postinstall-Skripte. Sie sind in
`package.json` unter `allowScripts` einzeln freigegeben. Nach einem
`npm install` in frischer Umgebung ggf. erneut:

```bash
npm install-scripts approve @prisma/client @prisma/engines esbuild prisma sharp
```

### `redirect()` wirft

`redirect()` aus `next/navigation` arbeitet über eine Ausnahme. In den Server
Actions steht es deshalb **außerhalb** von `try/catch` — sonst fängt der
`catch`-Block die Weiterleitung ab und sie passiert nie. Siehe
`src/actions/patienten.ts`.

### Mehrfachauswahlen

SQLite kennt keine Array-Spalten. Zwölf Felder liegen als JSON-String.

- Lesen und Schreiben **nur** über `leseAuswahl` / `schreibeAuswahl` aus
  `src/lib/utils.ts`
- Aus dem FormData mit `fd.getAll(name)` holen — `get()` liefert nur den ersten
  Eintrag. Die Liste der betroffenen Felder steht als `MEHRFACHFELDER` in
  `src/lib/schema/aufnahme-formdata.ts`

### Eingeklappte Abschnitte bleiben im DOM

`Abschnitt` blendet mit `hidden` aus, statt die Kinder auszubauen. Würde man sie
ausbauen, gingen ihre Werte beim Absenden verloren — bei einem Formular, in dem
man zwischen Abschnitten springt, wäre das Datenverlust.

### Trendberechnung in der Zeitleiste

Die Einträge kommen **absteigend** (neueste zuerst). Der Vergleich läuft deshalb
gegen `eintraege[i + 1]` — das ist die zeitlich vorherige Aufnahme. Leicht zu
verdrehen.

### Darstellungsartefakt der Vorschau

Nach dem Scrollen zeigt der Browser-Bereich manchmal einen schwarzen Balken über
der Seite. Das ist ein Aufnahmeartefakt, kein Layoutfehler — per DOM geprüft
(`headerTop: 0`, `position: sticky`). Nicht daran herumreparieren.

### Screenshots schlagen gelegentlich fehl

`Screenshot timed out after 5s`, wenn das Fenster im Hintergrund liegt. Einfach
wiederholen oder auf `get_page_text` / `find` ausweichen.

---

## Festlegungen, die nicht offensichtlich sind

Die vollständige Liste steht in [docs/ENTSCHEIDUNGEN.md](docs/ENTSCHEIDUNGEN.md).
Was beim Weiterbauen am ehesten stolpern lässt:

- **`bcryptjs` statt Argon2** (T1) — reines JavaScript, kein nativer Build unter
  Windows. Kostenstufe 12.
- **Alle Auswahlwerte stehen in `src/lib/enums.ts`** (T3) — Formular, PDF-Export,
  Diagramme und Vergleich lesen daraus. Beschriftungen nirgends sonst ändern.
- **Fläche = Breite × Länge** (T5), Trendschwelle **2 %** (T6) — in
  `src/lib/wundmasse.ts`, dort getestet.
- **Löschen ist immer weich** (T9) — `geloeschtAm` setzen, nie `DELETE`. Jede
  Abfrage filtert auf `geloeschtAm: null`.
- **Vierte Exsudatstufe** (A1) — im Original steht „Mäßige bis Schwache", das ist
  ein Tippfehler. Wir dokumentieren „Mäßige bis starke".
- **Wagner-Grad und Dekubitus-Kategorie hängen an der Aufnahme** (A3), nicht an
  der Wunde — sie ändern sich im Verlauf.

### Zwei Punkte warten auf Rückmeldung

1. Stimmt „Mäßige bis starke" als vierte Exsudatstufe? (A1)
2. Sollen Patienten nach einer Frist automatisch archiviert werden?
   (Aufbewahrungsfrist: 10 Jahre, § 630f BGB)

---

## Testdaten

`npm run db:seed` legt an:

| Konto | Passwort |
|---|---|
| `admin@praxis.local` | `WundDoku!2026` |
| `pflege@praxis.local` | `Pflege!2026` |

- **Berger, Hannelore** (P-10001) — Ulcus cruris venosum, 4 Aufnahmen mit
  abheilendem Verlauf (1.200 → 476 mm²). Gut, um Trend und Diagramme zu prüfen.
- **Kowalski, Josef** (P-10002) — DFS, 1 Erstaufnahme, mit Wundinfektion und
  Abstrichergebnis. Schmerzfrei dokumentiert (Polyneuropathie).
- **Weber, Gerhard** (P-10003) — beim Durchtesten der Oberfläche entstanden,
  eine Dekubitus-Wunde ohne Aufnahme. Kann weg, wenn er stört.

Der Seed läuft mehrfach ohne Schaden (`upsert` auf die Patientennummer).

---

## Kurzbefehle

```bash
npm run dev          # Entwicklungsserver
npm test             # 28 Tests
npx tsc --noEmit     # Typprüfung
npm run db:studio    # Datenbank ansehen
npm run db:seed      # Testdaten neu einspielen
```

Beim Bauen: Server vorher beenden.
