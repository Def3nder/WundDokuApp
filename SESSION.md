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

## Nachtrag — Körperkarte (19.09.2026)

Auf Wunsch ergänzt: eine anklickbare Körperkarte neben den drei
Lokalisations-Dropdowns im Wund-Formular. Klick auf eine Markierung befüllt
Region/Seite/Ausrichtung, ohne die Dropdowns zu ersetzen (siehe
[T14](docs/ENTSCHEIDUNGEN.md#t14--körperkarte-befüllt-die-vorhandenen-lokalisationsfelder-statt-eigene-daten-zu-speichern)).

| Datei | Inhalt |
|---|---|
| `public/koerperkarte.webp` | Vorlagenbild (Vorder-/Rückseite, Fußrücken/-sohlen, Bein-Nahaufnahmen), als WebP komprimiert |
| `src/lib/koerperkarte.ts` | 66 Markierungen als Prozentkoordinaten + Region/Seite/Ausrichtung |
| `src/lib/koerperkarte.test.ts` | Prüft Koordinaten, Enum-Gültigkeit und Mindestabstand (siehe unten) |
| `src/components/formular/koerperkarte.tsx` | Bild mit positionierten, tastaturbedienbaren Buttons |

`KOERPERREGIONEN` in `src/lib/enums.ts` wuchs additiv um `LENDE`, `OBERARM`,
`UNTERARM`, `HANDGELENK`, `BRUSTKORB`, `BAUCH`, `FUSSBALLEN`. `AUSRICHTUNGEN`
wuchs um `VENTRAL`/`DORSAL` (schlichte Labels, ohne „vorne"/„hinten" im
Klammerzusatz) — alte Werte bleiben gültig, keine Migration nötig.

Auf Nutzerwunsch bekommen alle Regionen, die auf Vorder- *und* Rückansicht
denselben Regionswert hätten, zusätzlich Ventral/Dorsal: `KOPF`, `SCHULTER`,
`OBERARM`, `UNTERARM`, `HANDGELENK`, `OBERSCHENKEL`, `UNTERSCHENKEL`, `KNIE`,
`KNOECHEL`. Sonst wäre z. B. „Schulter links" oder „Knie links" nicht von
vorne oder hinten unterscheidbar gewesen. Bei `KNIE` und `KNOECHEL` zunächst
vergessen (beide blieben testweise auf `null` — reichte nicht, da dieselbe
Region mit identischer Seite/Ausrichtung auf Vorder- *und* Rückseite
existierte), auf zwei Nachfragen ergänzt. `BRUSTKORB`/`BAUCH` (nur vorne) und
`LENDE`/`RUECKEN` (nur hinten) kommen ohnehin nur auf einer Ansicht vor und
bleiben ohne Ausrichtung.

**Rückseite an Vorderseite angeglichen (mehrere Nachfragen):** Die eigene
Anatomie-Vermutung für die Rückansicht (Steiß/Sakral → Gesäß → Oberschenkel →
Unterschenkel, von oben nach unten) war durchgehend falsch. Laut Nutzer,
jeweils an die gleich hohe Vorderseiten-Markierung angeglichen:
- Punkt auf Oberschenkelhöhe: `OBERSCHENKEL` (nicht `STEISS_SAKRAL` — der
  eigentliche Steiß-/Sakralbereich liegt mittig im Gesäß, also auf keinem der
  bilateralen Punkte dieser Vorlage)
- Punkt auf Kniehöhe: `KNIE` (nicht `GESAESS`)
- nächster Punkt: `UNTERSCHENKEL` (nicht `OBERSCHENKEL`)
- unterster Punkt: `KNOECHEL` (nicht `UNTERSCHENKEL`)

`STEISS_SAKRAL` und `GESAESS` bleiben im Enum für die manuelle Auswahl.
`GESAESS` hat keine eigene Markierung mehr; für `STEISS_SAKRAL` siehe unten.

**Steiß-/Sakralbereich nachträglich mit eigenem Bildpunkt (19.09.2026):** Der
Nutzer hat die Vorlage um genau die fehlende Markierung ergänzt
(`Wundlokalisation_neu_2.png`) — ein einzelner Punkt mittig über der
Gesäßfalte, kein Links/Rechts-Paar. Per Koordinatenvergleich gegen die
vorherige Bildversion gefunden (ein Punkt neu, zwei alte Fußrücken-Punkte
fehlen jetzt — passend zum weiter oben beschriebenen Entfernen). `koerperkarte.ts`
hat seither wieder eine `STEISS_SAKRAL`-Markierung, mit `seite: null` (kein
Links/Rechts, da mittig) und `ausrichtung: null` (nur Rückseite, kein
Gegenstück vorne). 67 statt 66 Markierungen; `public/koerperkarte.webp` neu
exportiert.

### Marker in Safari daneben, in Chrome (auch mobil) nicht

Nutzer meldete per Screenshot: Auf einem echten iPhone sitzen alle
Klick-Marker sichtbar neben statt auf den roten Punkten im Bild - der
Versatz wächst mit dem Abstand von der oberen linken Ecke. Vom Nutzer
bestätigt: reines Safari/WebKit-Problem, unabhängig von der Bildschirmgröße
(Chrome rendert auch mobil korrekt, DevTools-Mobilemulation in Chrome zeigt
ebenfalls korrekt - keine Frage der Skalierung).

**Erster Fix (nicht ausreichend):** Vermutet als Lade-Wettlauf - Container
bekam `aspect-ratio` per Inline-Style, damit seine Höhe schon vor dem
Laden des Bildes feststeht. Half laut Nutzer **nicht**. Grund vermutlich: In
älteren/manchen WebKit-Versionen lösen absolut positionierte Kind-Elemente
ihre Prozent-`top`-Position nachweislich nicht zuverlässig gegen eine nur
über `aspect-ratio` hergestellte Containerhöhe auf (bekannte WebKit-Lücke,
nicht gegen ein reales Gerät nachprüfbar in dieser Umgebung - kein Safari
verfügbar).

**Zweiter Fix:** `aspect-ratio` ersetzt durch den klassischen
„Padding-Top-Trick" (ein leeres Kind-`div` mit
`padding-top: <Höhe/Breite>·100 %`, das die Containerhöhe über den ganz
normalen Textfluss erzwingt - keine neuere CSS-Eigenschaft, seit den
2010ern browserübergreifend für responsive Bild-Einbettungen verwendet).
Bild und Marker liegen `absolute inset-0` darüber. Noch nicht auf echtem
Safari zurückgemeldet.

**Fußpanels feiner unterteilt:** Fußrücken hatte drei Punkte je Fuß (Zehen,
Mitte, unten nahe der Ferse) — der unterste entfällt auf Nutzerwunsch
ersatzlos. Fußsohle hatte drei Punkte, die oberen zwei teilten sich
`FUSSSOHLE` — der oberste (Ballen) bekommt jetzt den eigenen Wert
`FUSSBALLEN`. Macht zusammen 66 statt 68 Markierungen.

### Immer höchstens eine Markierung aktiv

`KNIE` kommt jetzt bewusst auf Vorder- *und* Rückansicht mit identischer
Region/Seite/Ausrichtung (`null`) vor. Damit trotzdem nie zwei Markierungen
gleichzeitig aktiv erscheinen, merkt sich `KoerperKarte` seit diesem Nachtrag
den **Index** der zuletzt geklickten Markierung statt nur ihrer Werte
(`useState<number|null>` + `useEffect`, das bei externen Dropdown-Änderungen
die erste passende Markierung nachzieht). Damit ist „nur eine Markierung
aktiv" strukturell garantiert, nicht nur zufällig durch eindeutige Daten.

### axe verlangt 24px *Abstand* zwischen Markierungen, nicht nur 24px Eigengröße

Erster Durchlauf mit 20px-Markern: axe (`target-size`, SC 2.5.8) schlug bei
zehn Markierungen an. 24px-Buttons allein reichten nicht — zwei Buttons, die
selbst je 24px groß sind, aber deren *Mittelpunkte* weniger als 24px
auseinanderliegen, gelten weiterhin als Verstoß. Für die meisten Marker genügte
eine breitere Karte (420px → 480px). Die beiden Kopf-Punkte pro Ansicht
(vorne/hinten) liegen in der Vorlage aber nur 44px auseinander.

Erster Fix: Kopf-Links/-Rechts je Ansicht zu einer seitenlosen Markierung
zusammengefasst. **Auf Nutzerwunsch zurückgenommen** — Kopf soll weiter nach
Seite *und* vorne/hinten unterscheidbar sein. Stattdessen die Karte auf
max. 720px verbreitert (bei 1280px Testviewport wird das auch erreicht); bei
der Breite liegen selbst die Kopf-Punkte über dem 24px-Mindestabstand.
`koerperkarte.test.ts` prüft das rechnerisch gegen genau diese 720px-Vorgabe,
damit eine künftige Koordinaten- oder Breitenänderung nicht unbemerkt wieder
darunter fällt. **Wichtig:** Bei einer deutlich schmaleren Kartenbreite als
720px (z. B. ein sehr schmales Tablet) unterschreiten die Kopf-Punkte den
24px-Abstand wieder — die drei Dropdowns bleiben deshalb bewusst die
vollständig gleichwertige, von der Kartenbreite unabhängige Eingabe.

**Beim Testen entstandene Testwunde wieder entfernt:** Der Browser-Durchgang
legte testweise eine Wunde bei „Berger, Hannelore" an. Das hätte
`tests/accessibility.spec.ts` gebrochen, weil dessen `anwendungsRouten()`
ungeprüft die *erste* Wunde der *ersten* Patientin nimmt und deren erste
Aufnahme braucht — eine Testwunde ohne Aufnahme lässt den Test in einem
Timeout laufen, nicht in einer klaren Fehlermeldung. Wieder weich gelöscht
(`geloeschtAm` gesetzt, Audit-Eintrag geschrieben), Testlauf danach wieder
grün. **Merke:** Bei jedem Browser-Durchgang, der Patientendaten anlegt,
vor dem nächsten `npm run test:a11y` prüfen, ob Testdaten bei der zuerst
gelisteten Patientin/Wunde liegen geblieben sind.

### Die sechs Abschnitte

1. Wundbefund — Wundumgebung, Wundrand, Wundgrund
2. Wundgröße & Exsudation
3. Entzündung & Infektion (inkl. Abstrich)
4. Schmerz
5. Therapieplan
6. Fotos (in Phase 4 vollständig umgesetzt)

---

## Nachtrag — Breadcrumb zeigt nur Übergeordnetes (19.09.2026)

Regel vom Nutzer: Der Pfad (`Breadcrumb`) zeigt ausschließlich Übergeordnetes,
nie den aktuellen Eintrag selbst — der steht ja immer direkt darunter als
Überschrift. Betraf alle 12 Seiten, die `<Breadcrumb>` nutzen; die letzte
Zeile (der bisherige selbstreferenzierende, unverlinkte Eintrag) entfiel
überall. Zwei Regionen brauchten dabei eine Sonderregel statt der wörtlichen
„direkter URL-Elternteil":

- **Wunde ansehen/anlegen/bearbeiten:** Pfad endet immer beim Patienten
  (`Patienten / [Nachname, Vorname]`) — die Wunde selbst (auch beim
  Bearbeiten, technisch eine Unterseite `/wunden/[id]/bearbeiten`) gilt als
  „der Eintrag", nicht als eigene Pfad-Ebene. `wunden/[id]/bearbeiten/page.tsx`
  bekam dafür eine neue Unterzeile mit `wunde.bezeichnung` unter der
  Überschrift, sonst wäre nirgends mehr sichtbar gewesen, welche Wunde
  bearbeitet wird.
- **Aufnahme ansehen/anlegen/bearbeiten/vergleichen:** Pfad endet bei der
  Wunde (`… / [Wundname]`), analog dazu.

Einfache Formulare ohne Zwischenebene (Patient anlegen, Benutzer anlegen,
Stammdaten bearbeiten) verloren einfach ihre letzte Pfad-Zeile.
`patienten/[id]/dokumente/page.tsx` und `patienten/[id]/page.tsx` folgten der
Regel bereits vorher richtig und blieben unverändert.

## Nachtrag — An-/Abmelden nicht mehr im Protokoll (19.09.2026)

Auf Nutzerwunsch entfernt: `src/lib/auth.ts`s `authorize()` schrieb bei jeder
erfolgreichen Anmeldung einen `ANMELDEN`-Eintrag (`db.auditLog.create`,
direkt dort statt über `protokolliere()`, da `authorize` ausserhalb des
sitzungsgebundenen Server-Action-Kontexts läuft). Dieser Aufruf entfiel
ersatzlos. Eine „Abgemeldet"-Protokollierung gab es nie (nur `signOut()` in
`app-shell.tsx`, ohne Audit-Aufruf) - das betraf also nur das Anmelden.

Der Enum-Wert `ANMELDEN` (`src/lib/enums.ts`, Label „Angemeldet") und der Typ
in `src/lib/audit.ts` blieben bewusst bestehen, damit bereits gespeicherte
alte Einträge im Protokoll weiterhin ein Label statt des rohen Codes zeigen -
nur das *Schreiben* neuer Einträge wurde gestoppt.

**Nachfrage:** Die schon vorhandenen alten `ANMELDEN`-Einträge sollten auch
nicht mehr *angezeigt* werden. `einstellungen/audit-log/page.tsx`s Abfrage
filtert sie jetzt serverseitig heraus (`aktion: { not: "ANMELDEN" }`, auch im
"Alle"-Filter, kombiniert per Spread mit dem optionalen Bereichsfilter). Die
Zeilen bleiben in der Datenbank, tauchen aber nirgends mehr im Protokoll auf.
Zusätzlich flog der Bereichs-Filter „Benutzer" (`entitaet: "User"`) aus der
Filterleiste (`ENTITAETEN`) - echte Benutzer-Aktionen wie Anlegen/Passwort
zurücksetzen (`src/actions/benutzer.ts`) werden weiterhin protokolliert und
sind über „Alle" sichtbar, nur der eigene Filter-Chip dafür ist weg.

---

## Nachtrag — Wunden löschen nur für Administratoren (19.09.2026)

Wunden können im Wund-Cockpit nach einer Sicherheitsabfrage weich gelöscht
werden. Der Löschbutton wird nur für Benutzer mit der Rolle `ADMIN` gerendert;
`wundeLoeschen()` prüft dieselbe Berechtigung mit `verlangeAdmin()` nochmals
serverseitig, damit ein direkter Aufruf der Server Action die UI-Regel nicht
umgehen kann. Aufnahmen, Fotos und Audit-Daten bleiben erhalten.

---

## Nachtrag — Freihand-Marker als zweite Lokalisationsart (19.09.2026)

Auf Wunsch ergänzt: zweite, umschaltbare Eingabeart für die Wund-Lokalisation
neben der Körperkarte (siehe oben) - freies Einzeichnen eines roten Kreises
auf einem unmarkierten Körperbild. Klicken+Ziehen legt Mittelpunkt und Größe
fest; ein weiterer Zug auf dem bereits gezeichneten Marker verschiebt ihn
(Größe bleibt), ein Zug daneben zeichnet ihn neu. Ein „Marker löschen"-Button
setzt ihn zurück. Die Position hat **bewusst keine Verbindung** zu den drei
Lokalisations-Dropdowns.

| Datei | Inhalt |
|---|---|
| `public/koerperkarte-leer.webp` | Vorlage ohne Markierungen (`Wundlokalisation_ohne_Marker.png`), als WebP |
| `src/components/formular/freihand-karte.tsx` | Zeichnen/Verschieben/Löschen per Pointer-Events |

**Datenmodell (Migration `20260919163629_lokalisation_freihand`):**
- `Wound.lokalisationMarkerX/Y/Radius` (`Float?`, Prozent der Bildbreite) -
  alle drei zusammen gesetzt oder keins (`wundeSchema`s `superRefine` prüft
  das). Wird unverändert mitgespeichert, unabhängig davon, welcher Modus
  gerade angezeigt wird - ein Wechsel der Anzeige löscht nichts, nur der
  eigene Button tut das.
- `User.lokalisationsAnzeige` (`String`, `"KARTE"` | `"FREIHAND"`,
  Default `"KARTE"`) - die Vorliebe ist **pro Benutzer**, nicht pro Browser
  oder Gerät gespeichert (wichtig, weil hier oft vom Tablet *und* vom
  Stationsrechner gearbeitet wird). Eigene Server-Action
  `lokalisationsAnzeigeSetzen()` in `src/actions/wunden.ts`, ohne
  Audit-Eintrag (reine Anzeige-Vorliebe, kein Wunddatum).

**Kreis bleibt rund, obwohl Breite/Höhe der Vorlage unterschiedlich skalieren:**
Der Radius wird als Prozent der Bild*breite* gespeichert (gleiche Einheit wie
x). Für die *Höhe* des Kreises (CSS `height`, löst gegen die Containerhöhe
auf) muss der Wert mit `KOERPERKARTE_BREITE / KOERPERKARTE_HOEHE`
umgerechnet werden, sonst wird aus dem Kreis eine Ellipse.

**Keine Vorschau im Wund-Cockpit:** Die Freihand-Markierung bleibt gespeichert
und ist beim Bearbeiten der Wunde weiterhin sichtbar, wird beim bloßen Öffnen
der Wunde aber bewusst nicht als Körperbild angezeigt.

**Bekannte Einschränkung:** Das Zeichnen selbst ist reine Zeigegeräte-Bedienung
(Maus/Touch), ohne Tastatur-Äquivalent - wie bei den meisten
Freihand-Zeichenwerkzeugen praktisch nicht sinnvoll nachzubilden. Die drei
Dropdowns bleiben die vollständig tastatur- und screenreaderbediente
Standardeingabe; das Einzeichnen ist eine rein ergänzende, optische
Markierung.

**Migration bei laufendem Dev-Server:** `npm run db:migrate` legt zwar die
SQL-Migration an, aber `prisma generate` scheitert am selben
DLL-Lock-Problem wie `npx next build` (siehe unten) - Server beenden,
`npx prisma generate` erneut laufen lassen, danach neu starten.

---

## Nachtrag — Zwei Formular-Bugs beim Wunde-Anlegen (19.09.2026)

Nutzer meldete: Beim Anlegen einer neuen Wunde erscheint andauernd
„Ungültiger Arzt", und bei jedem Validierungsfehler werden die übrigen
Dropdown-Auswahlen (Diagnose, Arzt, Lokalisation, Einheit) gelöscht. Zwei
unabhängige, echte Bugs - keiner davon aus der heutigen Sitzung neu
entstanden, beide vermutlich schon länger vorhanden, aber bisher nie mit
einem echten Seed-Arzt *und* einem gleichzeitigen anderen Validierungsfehler
durchgetestet.

### Bug 1 — `.cuid()` verträgt sich nicht mit den Seed-IDs

`src/lib/schema/wunde.ts` validierte `arztId`/`pflegedienstId` mit
`z.string().cuid(...)`. Die Seed-Ärzte/-Pflegedienste haben aber feste,
lesbare IDs wie `"seed-doctor-01"` (`prisma/seed.ts`) statt echter
Prisma-`cuid()`-Werte - die bestehen `.cuid()` nicht. Mit einem echten Arzt
(nicht `cuid`-förmige ID) schlug die Validierung deshalb **immer** fehl,
noch bevor die eigentliche Existenzprüfung (`stammdatenFehler()` in
`src/actions/wunden.ts`, fragt die Datenbank) überhaupt lief - diese
Prüfung macht das Format-Constraint ohnehin überflüssig.
`src/lib/schema/patient.ts` hatte für dasselbe Feld nie ein `.cuid()`,
daher funktionierte die Arztauswahl dort schon immer.

**Fix:** `.cuid()` entfernt. Eine leere Auswahl wird als `null` gespeichert;
nur eine tatsächlich gewählte ID wird als String validiert und anschließend
gegen die Datenbank geprüft. Das Formular kennzeichnet den behandelnden Arzt
ausdrücklich als optional.

### Bug 2 — Formular verliert Dropdown-Werte nach jedem Absenden

Der eigentlich interessante Fund, nach längerer Fehlersuche mit
`console.log`-Instrumentierung direkt in `WundeFormular` (Render-Zähler,
`JSON.stringify(zustand)`, ein `reset`-Event-Listener auf dem `<form>`):

- **Nicht** die Ursache: ein Remount der Komponente (ein reiner,
  von `zustand`/`vorgabe` unabhängiger `useState`-Zähler blieb über
  mehrere Renders hinweg stabil).
- **Nicht** die Ursache: fehlende Daten. `zustand.werte` (das Ergebnis von
  `wundeAnlegen`/`wundeAendern`) enthielt nachweislich die richtigen Werte
  (`"diagnoseTyp":"DEKUBITUS","arztId":"seed-doctor-07"` etc., per
  `console.log` direkt geprüft).
- **Nicht** die Ursache: natives `form.reset()` - ein Listener auf das
  `reset`-Event des `<form>` feuerte nie.
- **Die tatsächliche Ursache:** Nach jedem Abschluss der Server Action
  (React 19 + `useActionState`, auch bei einer Rückgabe mit
  Validierungsfehlern statt eines Throws) setzt React/Next.js die
  `<select>`- und Checkbox-**DOM-Knoten** des Formulars direkt auf ihren
  ursprünglichen Zustand zurück - ohne ein `reset`-Event auszulösen. Der
  **React-State bleibt dabei korrekt** (mit `value={auswahl.diagnoseTyp}`
  kontrolliert nachgewiesen: State zeigte weiterhin `"DEKUBITUS"`, das
  tatsächliche `<select>`-DOM-Element aber `""`). React bemerkt die
  Abweichung nicht, weil sein Reconciler beim erneuten Rendern nur prüft,
  ob sich der `value`/`checked`-**Prop** gegenüber dem *vorherigen Render*
  geändert hat - und der hatte sich ja nicht geändert, also unterbleibt die
  erneute DOM-Zuweisung (React vertraut darauf, dass der DOM noch dem
  letzten von ihm gesetzten Wert entspricht - hier stimmt das nicht mehr).
  Reine Text-`<input>`/`<textarea>` sind sichtbar nicht betroffen (die
  Kurzbezeichnung blieb in jedem Test korrekt erhalten) - vermutlich
  behandelt Reacts interne Zurücksetzung nur "echte" Auswahl-Steuerelemente
  (`select`, `checkbox`, `radio`).

**Fix, der tatsächlich funktioniert:** Weder unkontrolliertes `defaultValue`
noch kontrolliertes `value`+`onChange` allein reichen. Nötig ist ein
`key`, der sich bei jedem neuen `zustand`-Ergebnis ändert und dadurch einen
**echten Neuaufbau** des `<form>`-Unterbaums erzwingt (nicht der ganzen
Komponente - nur des `<form>`-Elements und seiner Kinder; `useState` in
`WundeFormular` selbst bleibt erhalten):

```ts
const zustandGeneration = useRef(0);
const vorherigerZustand = useRef(zustand);
if (vorherigerZustand.current !== zustand) {
  zustandGeneration.current += 1;
  vorherigerZustand.current = zustand;
}
// ...
<form key={zustandGeneration.current} action={formAction} ...>
```

Bei einem echten Neuaufbau greift für jedes Feld wieder ganz normal
`defaultValue={w(...)}` bzw. `value={...}` - ein frisch erzeugter DOM-Knoten
hat noch keinen "letzten von React gesetzten Wert", mit dem der neue Prop
verglichen werden könnte, die Zuweisung passiert also garantiert.

**Angewendet auf:** `wunde-formular.tsx`, `patient-formular.tsx` (hatte
denselben Aufbau mit kontrollierten Selects, aber ohne den `key` - also
genauso betroffen), `neuer-benutzer.tsx` (Rollen-Select). **Nicht
angefasst:** `aufnahme-formular.tsx` - hat zwei native `<Select>`
(Wagner-Grad, Dekubitus-Kategorie) mit demselben Risiko, aber deutlich
komplexerer Zustand (Autosave, Fotos, Abschnitts-Navigation) - ein
pauschaler `key`-Neuaufbau des ganzen Formulars würde dort vermutlich mehr
kaputtmachen als reparieren. Braucht eine gezieltere Lösung (z. B. nur die
zwei betroffenen Felder selbst mit einem eigenen `key` versehen), separat zu
prüfen.

**Für künftige Formulare mit `useActionState` in dieser Codebase:** Jedes
`<select>`/`<input type="checkbox">`/`<input type="radio">`, dessen Wert
nach einem fehlgeschlagenen Absenden erhalten bleiben soll, braucht diesen
`key`-Trick (oder muss komplett client-seitig, ohne Formular-Action,
gehalten werden). Reine Text-Felder brauchen ihn nicht.

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

### Rückmeldung erhalten (19.09.2026)

1. „Mäßige bis starke" als vierte Exsudatstufe (A1) — **bestätigt korrekt.**
2. Automatische Archivierung nach Aufbewahrungsfrist (§ 630f BGB, 10 Jahre) —
   **bleibt offen, To-Do für später.**

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
