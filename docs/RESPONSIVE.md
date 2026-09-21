# Darstellung auf Desktop, Smartphone und Tablet

Die App verwendet dieselben Schriften, Farben und Bedienelemente auf allen
Geräten. Die Spaltenzahl richtet sich nach dem verfügbaren Platz; eine
Smartphoneansicht wird nicht auf die Breite einer Desktopseite skaliert.

## Gemeinsame Regeln

- Die Basisschrift und die Schrift in Eingabefeldern bleiben bei 16 CSS-Pixeln.
  Einzeilige Felder einschließlich Datum, Zahl und Auswahl sind 44 Pixel hoch.
  Die Touchflächen der gemeinsamen Schaltflächen sind mindestens 44 Pixel hoch.
- `Field`, `Input`, `Select`, `Button` und `Card` enthalten die gemeinsamen
  Größenregeln. Die Safari-Behandlung von Datumsfeldern gehört zu `Input`,
  nicht in einzelne Formulare.
- Kartenabstände stehen in `globals.css`. `CardContent` hat auch ohne
  `CardHeader` einen oberen Innenabstand. Nur direkt nach einem `CardHeader`
  entfällt dieser; explizite Utility-Klassen können ihn überschreiben.
- `form-grid`, `compact-grid`, `detail-grid`, `panel-grid` und `photo-grid`
  verwenden Mindestbreiten ihrer Inhalte. So passen sich auch verschachtelte
  Formulare und Split View an, ohne einen bestimmten Gerätetyp zu erkennen.
- Die Hauptnavigation wechselt bei 1280 CSS-Pixeln zur ausgeschriebenen Leiste.
  Die Kopfzeilenhöhe wird mit der Abschnittsnavigation abgestimmt. Sprungziele
  bleiben unter beiden Leisten sichtbar.
- Die Patientendetails nutzen die volle Kartenbreite. „Bearbeiten“ bleibt oben
  rechts; auf schmalen Bildschirmen als beschriftetes Symbol für Screenreader.
- Bildschirmränder und Dialoge berücksichtigen `safe-area-inset-*` und die
  dynamische Viewporthöhe. Bei geringer Fensterhöhe bleibt die Speicherleiste
  im normalen Dokumentfluss.
- Breite Tabellen und Terminleisten scrollen innerhalb ihres Bereichs.
  Die Seite selbst soll nicht horizontal scrollen. Tabellenbereiche sind per
  Tastatur erreichbar.
- Unsichtbare Diagrammtabellen liegen in einem `nur-screenreader`-Container.
  Diese Klasse direkt auf einer Tabelle reicht nicht: deren intrinsische
  Mindestbreite kann den mobilen Viewport vergrößern und die gesamte Seite
  optisch verkleinern.
- Die kleine Flächenvorschau hat eine gemessene Pixelbreite, damit sie auch
  in Safari beim Öffnen gerendert wird und vollständig in die Seite passt.
- Fotokacheln nutzen ein gemeinsames Seitenverhältnis und `object-contain`;
  das vollständige Wundfoto bleibt sichtbar. Die Lightbox zeigt das Original.

## Wiederholbare Prüfung

```sh
npm run typecheck
npm test
npm run test:a11y
npx playwright install webkit
npm run test:responsive
```

`test:responsive` prüft 20 Seiten pro Profil: Patientenübersicht und Leerzustand,
Patienten-, Wund- und Aufnahmeformulare einschließlich Neuanlage und Bearbeitung,
Detailansichten, Vergleich, Dokumentlisten und Uploadformulare sowie Verwaltung.
Ein zweiter Durchlauf je Profil öffnet Diagramme, prüft die Flächenvorschau,
dreht eine geöffnete Dokumentvorschau und prüft ausgeklappte Schmerzfelder und
Abschnittssprünge. Vorhandene Fotos und Dokumente werden zusätzlich geöffnet.
Die Tests speichern keine Änderungen an den Patienten.

| Profil | CSS-Viewport | Engine |
|---|---|---|
| Desktop | 1440 × 900 | Chrome |
| Notebook | 1280 × 800 | Chrome |
| Schmales Smartphone | 320 × 740 | Chrome, Touch |
| Android-Tablet | 800 × 1280 und 1280 × 800 | Chrome, Touch, DPR 2 |
| iPhone | 390 × 844 und 844 × 390 | WebKit, Touch |
| iPad mini | 744 × 1133 und 1133 × 744 | WebKit, Touch |
| iPad mit 768 Pixeln Breite | 768 × 1024 | WebKit, Touch |
| iPad Pro 11 | 834 × 1194 | WebKit, Touch |
| iPad Pro 13 | 1024 × 1366 und 1366 × 1024 | WebKit, Touch |
| iPad Split View | 507 × 1024 | WebKit, Touch |

Ergebnisse und Screenshots bleiben im ignorierten Ordner
`test-results/responsive/`. Die bestehende axe-Suite verwendet separat
`test-results/a11y/`. So löschen parallele Testläufe nicht ihre gegenseitigen
Ergebnisse.

Über `WEBKIT_EXECUTABLE_PATH` kann eine bereits installierte WebKit-Testengine
verwendet werden. Bei der Prüfung am 21.09.2026 wurde die vorhandene Engine
`webkit-2336` eingesetzt, da der Download von `webkit-2359` nicht erreichbar war.

```powershell
$env:WEBKIT_EXECUTABLE_PATH = "$env:LOCALAPPDATA/ms-playwright/webkit-2336/Playwright.exe"
npm run test:responsive
```

Browseremulation deckt Layout und Browserengine ab; Betriebssystemdialoge,
Bildschirmtastatur und reale Gerätehardware sind damit nicht vollständig geprüft.

Für einen Produktionsbuild bei laufendem Entwicklungsserver und unverändertem
Prisma-Schema kann `node node_modules/next/dist/bin/next build` verwendet werden.
`npm run build` führt zusätzlich `prisma generate` aus und benötigt unter
Windows weiterhin eine nicht gesperrte Prisma-DLL.
