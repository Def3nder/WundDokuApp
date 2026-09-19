# Sitzungsnotizen

Arbeitsstand für die Fortsetzung in einer neuen Sitzung. Ergänzt die
inhaltlichen Dokumente in [docs/](docs/) um das, was beim Bauen gelernt wurde.

**Stand:** 19.09.2026 · Phase 1 bis 6 fertig
**Prüfstand:** `npm run typecheck` sauber · `npm test` 59/59 grün · `npm run test:a11y` 5/5 grün · `npx next build` sauber · Browser-Durchgang erfolgreich (Login, Leerzustände, Tastaturbedienung, Lightbox, mobile Navigation, Hell-/Dark-Mode, PDF-Export einzeln und Verlauf, Audit-Log-Filter) · noch nichts committet

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

## Phase 6 — fertig

| Datei | Inhalt |
|---|---|
| `assets/fonts/` | Statische Noto-Sans-Instanzen (Regular/Bold) für den PDF-Export, siehe dortige README |
| `src/lib/pdf/builder.ts` | Eigenständiges PDF-Layout-Werkzeug auf `pdf-lib` (Titel, Abschnitte, Raster, Tabelle, Fotos, Fußzeile) |
| `src/lib/pdf/export.ts` | Baut Einzel- und Verlaufs-PDF aus denselben Feldern wie die Leseansicht |
| `src/app/api/aufnahmen/[id]/pdf/route.ts` | Download einer einzelnen Aufnahme |
| `src/app/api/wunden/[id]/pdf/route.ts` | Download des gesamten Wundverlaufs |
| `src/app/(app)/einstellungen/audit-log/page.tsx` | Änderungsprotokoll, admin-only, mit Bereichsfilter |
| `tests/accessibility.spec.ts` | Wiederholbarer Playwright-/axe-Durchlauf in Hell und Dunkel sowie Tastatur- und Mobiltests |
| `playwright.config.ts` | Nutzt lokales Chrome und einen vorhandenen oder automatisch gestarteten Dev-Server |

**Wichtigste Wendung:** Der DRACO-Papierbogen wird **nicht** mehr als
AcroForm-Exportvorlage befüllt (ursprünglicher Plan mit `build-pdf-map.ts` /
`field-map.json` verworfen) — er diente nur der fachlichen Orientierung. Siehe
[T12](docs/ENTSCHEIDUNGEN.md#t12--eigenstaendiges-pdf-layout-statt-vorlagen-fill).
`assets/vorlage/` bleibt als Referenz, ist aber keine Laufzeit-Abhängigkeit mehr.

Für durchsuchbaren/kopierbaren Text wird eine echte Schriftdatei eingebettet
(`@pdf-lib/fontkit` + Noto Sans, siehe
[T13](docs/ENTSCHEIDUNGEN.md#t13--echte-schriftdatei-statt-pdf-standardschrift)) —
**Vorsicht beim nochmal Nachdenken:** Der ursprüngliche Verdacht, `pdf-lib`s
Standardschrift mache Umlaute im Export unlesbar/unkopierbar, war ein
Fehlalarm — siehe [„Terminal zeigt `�` statt Umlaute"](#terminal-zeigt--statt-umlaute-kein-pdf-fehler)
weiter unten. Die Schrifteinbettung selbst ist trotzdem sinnvoll (Konsistenz
mit der App-eigenen Schrift) und bleibt.

## Feinschliff — abgeschlossen

- Leerzustände für Suche, Patienten, Wunden, Aufnahmen, Fotos, Diagramme,
  Vergleich und Audit-Filter geprüft.
- Selbstgebaute Radiogruppen unterstützen Pfeiltasten, Pos1 und Ende mit nur
  einem Tabstopp je Gruppe.
- Sprunglink und Foto-Lightbox stellen den Fokus zuverlässig wieder her;
  mobile Admin-Navigation ergänzt.
- axe prüft Anmeldung und zentrale Seiten in Hell und Dunkel sowie das geöffnete
  mobile Menü. Dabei gefundene Primär- und Statuskontraste wurden korrigiert.

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

### PDF-Layout: `pdf-lib`-Positionsrechnung real rendern, nicht nur typchecken

In `pdf/builder.ts` war `maxHoehe` für Fotos als
`SEITE_HOEHE - OBEN_START - UNTEN_GRENZE` berechnet — ergibt **-6** statt der
verfügbaren Höhe, weil `OBEN_START` schon eine y-Koordinate ist (kein Randmaß).
TypeScript und die Tests fanden das nicht, weil die Rechnung überall intern
konsistent blieb; erst ein tatsächlich gerenderter Seitenausschnitt
(`pypdfium2`, siehe unten) zeigte briefmarkengroße statt seitenfüllende Fotos.
Bei jeder neuen Geometrie-Formel in `builder.ts`: eine Seite mit echtem Inhalt
rendern und ansehen, nicht nur `tsc`/`vitest` grün sehen.

### Terminal zeigt `�` statt Umlaute — kein PDF-Fehler

`pdftotext`/`pdfplumber`-Ausgabe in diesem Git-Bash/Windows-Terminal zeigt `�`
für jedes `ä ö ü ß ² ·` — sieht wie eine falsche Unicode-Zuordnung im PDF aus,
ist aber nur die Terminal-Darstellung. Erst der Byte-Wert bestätigt es:
`ord(zeichen)` lieferte korrekt `0xe4` (ä) usw., `\ufffd` kam im String gar
nicht vor. Bei jedem Verdacht auf falsche PDF-Kodierung: Code-Punkt direkt
prüfen (`hex(ord(ch))`), nicht der gedruckten Zeichen trauen.

### Python-Skripte über Bash: Windows-Pfad, nicht Git-Bash-Pfad

Das lokale Python (`C:\Program Files\Python312\python`) versteht `/c/Users/...`
(Git-Bash-Schreibweise) nicht — `FileNotFoundError`. Immer die
Windows-Schreibweise mit Schrägstrichen übergeben (`C:/Users/...`), auch wenn
der Befehl selbst aus Bash kommt.

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
npm test             # 59 Tests
npm run test:a11y    # Playwright/axe in Hell und Dunkel (lokales Chrome)
npm run typecheck    # Typprüfung
npm run db:studio    # Datenbank ansehen
npm run db:seed      # Testdaten neu einspielen
```

Beim Bauen: Server vorher beenden.
