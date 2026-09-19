# Sitzungsnotizen

Arbeitsstand für die Fortsetzung in einer neuen Sitzung. Ergänzt die
inhaltlichen Dokumente in [docs/](docs/) um das, was beim Bauen gelernt wurde.

**Stand:** 19.09.2026 · Phase 1 bis 5 fertig
**Prüfstand:** `npx tsc --noEmit` sauber · `npm test` 39/39 grün · `npm run build` sauber · Browser-Durchgang erfolgreich · noch nichts committet

---

## Phase 3 — fertig

| Datei | Inhalt |
|---|---|
| `src/lib/schema/aufnahme.ts` | Zod-Schema aller Aufnahmefelder inkl. `superRefine` |
| `src/lib/schema/aufnahme-formdata.ts` | FormData → geprüfte Daten → Datensatz |
| `src/lib/schema/aufnahme-vorgabe.ts` | Datensatz → Formularwerte und sichere Vorbefüllung ohne alte Messwerte |
| `src/actions/aufnahmen.ts` | Anlegen, Ändern, Entwurf speichern, Löschen |
| `src/components/formular/chip-group.tsx` | Mehrfachauswahl als Chips, mit Exklusiv-Option |
| `src/components/formular/radio-chips.tsx` | Einfachauswahl + `JaNein` |
| `src/components/formular/vas-slider.tsx` | Schmerzskala 0–10 |
| `src/components/formular/zifferblatt.tsx` | Uhrzeit-Auswahl für die Schmerzlage |
| `src/components/formular/abschnitt.tsx` | Aufklappbarer Abschnitt + Sprungleiste |
| `src/components/formular/wundgroesse.tsx` | Maße mit Live-Fläche und Trendvergleich |
| `src/components/formular/aufnahme-formular.tsx` | Orchestrierung der sechs Abschnitte, Fehlernavigation und Speicherleiste |
| `src/components/formular/abschnitt-*.tsx` | Befund, Größe, Infektion, Schmerz und Therapie als Teildateien |
| `src/components/formular/use-autosave.ts` | Verzögertes Entwurf-Speichern mit versteckter `entwurfId` |
| `src/app/(app)/wunden/[id]/aufnahmen/neu/page.tsx` | Erst-/Folgeaufnahme mit Vorbefüllung und Entwurfwiederaufnahme |
| `src/app/(app)/aufnahmen/[id]/page.tsx` | Vollständige Leseansicht |
| `src/app/(app)/aufnahmen/[id]/bearbeiten/page.tsx` | Korrekturansicht |

Breite, Länge und Tiefe werden bei Folgeaufnahmen bewusst **nicht**
vorbefüllt. Genau diese Werte müssen bei jedem Verbandwechsel neu gemessen
werden, damit kein stehengebliebener Wert die Verlaufskurve verfälscht.

## Phase 4 — fertig

| Datei | Inhalt |
|---|---|
| `src/lib/fotos.ts` | Magic-Byte-Prüfung, Größenlimit, WebP-Konvertierung, EXIF-Entfernung, Thumbnail und sichere Speicherpfade |
| `src/types/heic-convert.d.ts` | Server-seitiger HEIC-Fallback für Plattformen, auf denen `sharp`/libvips HEIC nicht direkt dekodiert |
| `src/actions/fotos.ts` | Upload, Beschriftung, Sortierung und Soft Delete mit Audit-Protokoll |
| `src/app/api/photos/[id]/route.ts` | Nur angemeldet erreichbare Original- und Thumbnail-Auslieferung ohne Browser-Cache |
| `src/components/foto/foto-manager.tsx` | Drag-and-drop, Kamera, Mehrfachupload, Beschriftung und Sortierung |
| `src/components/foto/foto-galerie.tsx` | Responsive Galerie und tastaturbedienbare Lightbox |
| `src/lib/fotos.test.ts` | Format-, Größen-, EXIF- und Pfad-Traversal-Tests |

Originaldateien werden nie gespeichert. Ablage: zwei EXIF-freie WebP-Dateien
unter `storage/photos/<patientId>/<woundId>/` (max. 2000 px und Thumbnail mit
max. 400 px). Der Foto-Upload einer neuen Aufnahme erzwingt zuerst denselben
Autosave-Entwurf, der später finalisiert wird; dadurch entstehen keine
verwaisten Fotos oder doppelten Aufnahmen.

## Phase 5 — fertig

| Datei | Inhalt |
|---|---|
| `src/lib/auswertung.ts` | Gruppierung der Wundgrund-Befunde sowie gerichtete Änderungen und Zahlendifferenzen |
| `src/components/auswertung/verlaufsdiagramme.tsx` | Recharts-Diagramme für Fläche, Abmessungen, Schmerz/Exsudat und Wundgrund-Zusammensetzung |
| `src/components/auswertung/vergleich-auswahl.tsx` | Barrierearme Auswahl und Tausch der beiden Vergleichszeitpunkte |
| `src/app/(app)/wunden/[id]/vergleich/page.tsx` | Fotovergleich und Differenztabelle für Maße, Fläche, Exsudat, Schmerz-VAS und Wundgrund |
| `src/app/(app)/wunden/[id]/page.tsx` | Auswertungsbereich im Wund-Cockpit und Einstieg in den Vergleich |
| `src/lib/auswertung.test.ts` | Tests für Gruppierung, Befundänderungen und gerichtete Differenzen |

Auswertungen berücksichtigen ausschließlich abgeschlossene, nicht gelöschte
Aufnahmen. Die Diagramme bleiben über eine Screenreader-Tabelle zugänglich. Im
Vergleich wird standardmäßig die vorletzte gegen die neueste Aufnahme gezeigt;
beide Zeitpunkte können unabhängig gewählt und getauscht werden.

## Womit anfangen

**Phase 6 — PDF & Feinschliff.** Feldzuordnung für den DRACO-PDF-Export erzeugen
und prüfen, Einzel- und Verlaufsexport bauen, Audit-Log-Ansicht ergänzen sowie
Leerzustände, Tastaturbedienung, axe und Dark Mode abschließend kontrollieren.

### Die sechs Abschnitte

1. Wundbefund — Wundumgebung, Wundrand, Wundgrund
2. Wundgröße & Exsudation
3. Entzündung & Infektion (inkl. Abstrich)
4. Schmerz
5. Therapieplan
6. Fotos (in Phase 4 vollständig umgesetzt)

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
