# WundDokuApp — Digitale Wunddokumentation

## Context

Das Repo `E:\Code\WundDokuApp` ist leer (nur `.git` und das Quell-PDF). Es soll eine Node.js-Webanwendung entstehen, die den Papier-Wunddokumentationsbogen von DRACO (Dr. Ausbüttel) digital abbildet.

**Warum:** Wunden werden heute auf einem zweiseitigen Papierbogen dokumentiert — pro Patient ein Bogen, mit Platz für genau drei Verbandwechsel-Spalten. Das ist unflexibel, nicht durchsuchbar, erlaubt keine Fotos und keine Verlaufsbeurteilung. Die App soll pro Patient beliebig viele Wunden, je eine Erstaufnahme und unbegrenzt Folgeaufnahmen, Wundfotos und einen Heilungsverlauf abbilden.

**Quelle der Wahrheit:** `draco-interaktiver-wunddokumentationsbogen_vrd.pdf`. Ich habe Text und alle 316 Formularfelder inklusive Koordinaten extrahiert; das vollständige Feldinventar unten stammt daraus.

**Entschieden (vom Nutzer):**
- Stack: Next.js 15 (App Router) + TypeScript + Prisma
- Speicherung: SQLite + lokales Dateisystem (DSGVO-freundlich, kein externer Dienst)
- Features v1: Login/Benutzerverwaltung, PDF-Export im DRACO-Layout, Verlaufs-Diagramme, Foto-Vergleich
- Datenmodell: Patient → Wunden → Aufnahmen

---

## Annahmen (bitte gegenprüfen)

1. **Exsudat-Menge:** Der Bogen hat genau 4 Ankreuzfelder. Die Labels lauten im PDF-Text „Keine" / „Keine bis Schwache" / „Schwache bis Mäßige" / „Mäßige bis Schwache". Die letzte Stufe ist mit hoher Wahrscheinlichkeit ein Tippfehler im Original und muss **„Mäßige bis Starke"** heißen. Ich setze die klinisch sinnvolle Variante ein.
2. **PDF-Export:** Ich fülle das Original-PDF als Vorlage (AcroForm via `pdf-lib`) — dadurch ist der Ausdruck layoutgleich zum Papierbogen. Das Original-PDF bleibt lokal im Projekt; es wird nur mit Deinen eigenen Patientendaten befüllt und ausgedruckt. Falls Du das aus Lizenzgründen nicht willst, baue ich stattdessen ein eigenes Layout — sag kurz Bescheid.
3. **Diagnose, Lokalisation, „besteht seit", Rezidiv** hängen an der *Wunde* (stabil, editierbar). **Wagner/Armstrong-Grad und Dekubitus-Kategorie** hängen an der *Aufnahme*, weil sie sich im Verlauf ändern.
4. Die App läuft on-premise (Praxis-Rechner/Server), kein öffentliches Hosting. Keine Anbindung an ein PVS/KIS in v1.

---

## Datenmodell (Prisma, SQLite)

`prisma/schema.prisma`

```
User        id, email, name, handzeichen, passwordHash, rolle(ADMIN|PFLEGE), aktiv
Patient     id, nachname, vorname, geburtsdatum, patientennummer(unique),
            arztTherapieverantwortlich, notizen, angelegtVon, timestamps
Wound       id, patientId, bezeichnung, diagnoseTyp, diagnoseFreitext,
            lokalisationRegion, lokalisationSeite(LINKS|RECHTS),
            lokalisationAusrichtung(LATERAL|MEDIAL), lokalisationFreitext,
            bestehtSeitWert, bestehtSeitEinheit(TAGE|WOCHEN|MONATE|JAHRE),
            rezidiv(bool), rezidivAnzahl, abgeschlossenAm, timestamps
Assessment  id, woundId, typ(ERSTAUFNAHME|FOLGEAUFNAHME), datum,
            erstelltVonId -> User, istEntwurf(bool), + alle Befundfelder (s.u.)
Photo       id, assessmentId, dateiname, pfad, thumbnailPfad, breite, hoehe,
            mimeType, groesseBytes, beschreibung, reihenfolge, aufgenommenAm
AuditLog    id, userId, entitaet, entitaetId, aktion, zeitpunkt, details
```

Mehrfachauswahlen speichere ich als JSON-Array-Spalte (SQLite kennt keine Enum-Arrays), validiert über Zod-Enums in `src/lib/schema/`.

### Aufnahme-Felder — vollständig aus dem PDF

| Block | Felder |
|---|---|
| **Grading** | `wagnerArmstrongGrad`, `dekubitusKategorie` |
| **Wundumgebung** (Mehrfach) | Unauffällig, Gerötet, Mazeriert, Juckreiz, Hämatome, Feucht, Trocken, Erwärmt, Blasenbildung, Bläulich |
| **Wundrand** (Mehrfach) | Unterminiert, Mazeriert, Gerötet, Nekrotisch, Hyperkeratotisch |
| **Wundgrund** (Mehrfach) | Epithelgewebe/Inseln, Fehlende Granulation, Granulation, Granulationsödem, Hypergranulation, Biofilm, Weiche/feuchte Nekrose, Muskeln/Sehnen/Faszien, Knochen, Hämatome, Kalkablagerung, Fremdkörper, Fibrinbeläge, Feste/trockene Nekrose, Sonstiges + Freitext |
| **Wundgröße** | `breiteMm`, `laengeMm`, `tiefeMm` → berechnete Fläche mm² |
| **Exsudation** | `menge` (4 Stufen), `farben` (Klar, Trüb, Gelb, Blutig, Grün, Sonstiges+Text), `konsistenz` (Serös, Schleimig) |
| **Geruch** | `geruch` (bool) |
| **Entzündungszeichen** (Mehrfach) | Rötung, Schwellung, Wärme, Schmerz, Funktionseinschränkung |
| **Infektion** | `lokaleZeichen` (Kritische Kolonisation, Wundinfektion), `systemischeZeichen` (bool), `infektionSonstiges` |
| **Abstrich** | `abstrichGenommen` (bool), `abstrichErgebnis` (Text) |
| **Schmerz** | `schmerzen` (bool) + `vasNrs` 0–10; je Ort (In der Wunde / Am Wundrand / Wundumgebung): `modus` (UHR\|GESAMT) + `uhrzeit` 1–12; `beiVerbandwechsel`+VAS, `beiDruck`+VAS, `ueberall`+VAS, `schmerztagebuch` (bool), `schmerzSonstiges` |
| **Heilungsfaktoren** | `wundheilungsfaktoren` (Freitext) |
| **Therapieplan** | `wundspuelung` (NaCl 0,9 %, Ringer, Polyhexanid, Octenisept) · `reinigung` (Chirurgisch, Mechanisch, Autolytisch) · `hautpflege` · `wundrandschutz` · `wundfuellung` (Hydrofaser, Hydrogel, Alginat, Cavity-Schaum) + `groesseCm` · `wundabdeckung` (Distanzgitter, Kompresse, Hydrokolloid, Schaumverband, Saugkompresse, Folie) + `groesseCm` · `fixierung` (Selbstklebend, Folie, Fixiermull, Mullbinde) · `kompression` (Kurzzugbinde, Strumpf) + 2× Breite/Anzahl, Klasse, Maß · `therapieSonstiges` |

Jeder Freitext-Block des Bogens bekommt ein eigenes Feld — nichts geht gegenüber Papier verloren.

---

## Design-System

Aus dem `ui-ux-pro-max`-Skill: Stil **„Accessible & Ethical"** (Healthcare/WCAG), Palette **Healthcare App**, Schriftpaar **Figtree + Noto Sans**. Eine Abweichung: die vorgeschlagene Hintergrundfarbe `#ECFEFF` ist für datendichte Formulare zu stark getönt — ich nehme neutrales Slate als Arbeitsfläche und behalte Cyan als Primärfarbe.

Festgehalten in `src/app/globals.css` als semantische Tokens (keine rohen Hex-Werte in Komponenten):

| Token | Light | Zweck |
|---|---|---|
| `--primary` | `#0891B2` | Aktionen, aktive Navigation |
| `--accent` | `#059669` | Erfolg, „Wunde verkleinert sich" |
| `--destructive` | `#DC2626` | Löschen, Infektionswarnung |
| `--background` | `#F8FAFC` | Arbeitsfläche |
| `--card` | `#FFFFFF` | Formularkarten |
| `--foreground` | `#0F172A` | Fließtext (Kontrast ≥ 7:1) |
| `--heading` | `#164E63` | Überschriften |
| `--border` | `#CBD5E1` | Trenner, in Dark Mode sichtbar gehalten |

Dark Mode vollständig (Stationsbeleuchtung, Nachtdienst) — eigene, entsättigte Tonwerte, nicht invertiert.

**Regeln, die ich durchgängig anwende:**
- Basis 16 px, Zeilenhöhe 1.5; `tabular-nums` für alle Messwerte, damit Zahlenspalten nicht springen
- Touch-Targets ≥ 44×44 px, ≥ 8 px Abstand — die App wird am Bett auf dem Tablet bedient
- Spacing-Skala 4/8 px, Breakpoints 375 / 768 / 1024 / 1440
- Sichtbare Labels an jedem Feld (nie nur Placeholder), Fehler direkt unter dem Feld, Validierung bei `blur` statt bei jedem Tastendruck
- Ausschließlich SVG-Icons (Lucide), keine Emoji
- Status nie nur über Farbe: Infektions- und Trend-Badges bekommen Icon + Text
- `prefers-reduced-motion` respektiert, Übergänge 150–300 ms

---

## Seitenstruktur

```
/login                                  Anmeldung
/                                       Patientenliste (Suche, Filter „aktive Wunden")
/patienten/neu                          Stammdaten anlegen
/patienten/[id]                         Stammdaten + Liste der Wunden
/patienten/[id]/wunden/neu              Wunde anlegen (Diagnose, Lokalisation)
/wunden/[id]                            Wund-Cockpit: Zeitleiste, Diagramme, Fotogalerie
/wunden/[id]/aufnahmen/neu              Aufnahmeformular (Erst- oder Folgeaufnahme)
/aufnahmen/[id]                         Aufnahme lesen + PDF-Export
/aufnahmen/[id]/bearbeiten              Aufnahme korrigieren
/wunden/[id]/vergleich?a=…&b=…          Zwei Aufnahmen gegenüberstellen
/einstellungen/benutzer                 Benutzerverwaltung (nur Admin)
```

**Wund-Cockpit** (`/wunden/[id]`) ist der Dreh- und Angelpunkt: oben eine Kopfzeile mit Diagnose, Lokalisation und Bestandsdauer; darunter die Verlaufsdiagramme; dann eine vertikale Zeitleiste aller Aufnahmen mit Foto-Thumbnail, Größe, Exsudatmenge und Infektionsstatus je Eintrag.

---

## Das Aufnahmeformular

Der Papierbogen hat ~180 Felder auf einer Seite. Eins-zu-eins übertragen wäre unbenutzbar, deshalb:

**Sechs Abschnitte** mit Schrittanzeige, einzeln aufklappbar, aber alle auf einer URL (kein Wizard, der das Springen verhindert):

1. Wundbefund — Wundumgebung, Wundrand, Wundgrund
2. Wundgröße & Exsudation
3. Entzündung & Infektion — inkl. Abstrich
4. Schmerz — VAS-Slider, Uhrzeit-Auswahl über ein klickbares Zifferblatt statt Zahleneingabe
5. Therapieplan
6. Fotos

**Was das Formular schnell macht:**
- **„Von letzter Aufnahme übernehmen"** — Folgeaufnahmen starten vorbefüllt mit dem letzten Befund; geänderte Felder werden farblich markiert. Das ist der wichtigste Zeitgewinn gegenüber Papier.
- **Autosave als Entwurf** alle paar Sekunden (`istEntwurf`), damit ein versehentlich geschlossenes Tablet keine Arbeit kostet
- Mehrfachauswahlen als Chip-Gruppen (Tap-Ziel 44 px), nicht als Checkbox-Listen
- Abhängige Felder erscheinen erst bei Bedarf: VAS-Slider nur wenn „Schmerzen: Ja", Abstrichergebnis nur wenn Abstrich genommen
- Fläche (mm²) wird live aus Breite × Länge berechnet und gegen die Vorаufnahme verglichen: „−18 % seit 04.09."
- Beim Absenden mit Fehlern: Sammelmeldung oben mit Sprungmarken, Fokus auf das erste fehlerhafte Feld

**Lokalisation:** Auswahl von Seite (links/rechts) und Ausrichtung (lateral/medial) wie im Bogen, dazu ein klickbares SVG-Körperschema mit Regionen und ein Freitextfeld.

---

## Wundfotos

- Upload per Drag-and-drop **und** über `<input capture="environment">`, damit am Tablet direkt die Kamera aufgeht
- Serverseitige Verarbeitung mit `sharp`: Umwandlung nach WebP, Langkante max. 2000 px, zusätzlich ein 400-px-Thumbnail
- **EXIF wird vollständig entfernt** — GPS-Koordinaten in Patientenfotos sind ein echtes Datenschutzproblem
- Ablage unter `storage/photos/<patientId>/<woundId>/<uuid>.webp`, außerhalb von `public/`. Ausgeliefert wird über eine Route `app/api/photos/[id]/route.ts`, die vorher die Session prüft — sonst wären die Bilder per URL für jeden erreichbar
- Validierung: nur JPEG/PNG/HEIC/WebP, max. 15 MB, Magic-Byte-Prüfung statt Vertrauen auf die Dateiendung
- Mehrere Fotos pro Aufnahme, sortierbar, mit Bildunterschrift; Lightbox mit Zoom
- Bilder immer mit `width`/`height` gerendert, damit beim Laden nichts springt

**Foto-Vergleich** (`/wunden/[id]/vergleich`): zwei Aufnahmen per Dropdown wählen, Fotos nebeneinander (auf schmalen Schirmen untereinander), darunter eine Differenztabelle mit Größe, Fläche, Exsudat, Schmerz-VAS und Wundgrund-Änderungen.

---

## PDF-Export in eigenem Layout

Der DRACO-Papierbogen diente nur der fachlichen Orientierung beim Aufbau von
Datenmodell und Formular — er ist fremdes Material und wird nicht als
Exportvorlage befüllt (siehe [T12](ENTSCHEIDUNGEN.md#t12--eigenstaendiges-pdf-layout-statt-vorlagen-fill)).

Vorgehen:
1. `src/lib/pdf/builder.ts` zeichnet ein eigenständiges Layout direkt mit
   `pdf-lib`: Titel, Abschnitte, Label/Wert-Raster, Tabelle, Fotos, Fußzeile
   mit Seitenzahl. Eingebettete Schrift statt PDF-Standardschrift (Noto Sans,
   siehe [T13](ENTSCHEIDUNGEN.md#t13--echte-schriftdatei-statt-pdf-standardschrift)).
2. `src/lib/pdf/export.ts` befüllt es mit denselben Feldern in derselben
   Reihenfolge wie die Leseansicht (`aufnahmen/[id]/page.tsx`), damit
   Bildschirm und Ausdruck nie auseinanderlaufen. Fotos werden dafür aus dem
   gespeicherten WebP nach JPEG umkodiert (`pdf-lib` kann kein WebP einbetten).
3. Route `app/api/aufnahmen/[id]/pdf/route.ts` liefert eine einzelne Aufnahme,
   `app/api/wunden/[id]/pdf/route.ts` den gesamten Verlauf einer Wunde
   (chronologisch, mit vorangestellter Übersichtstabelle) als Download.

---

## Verlaufs-Diagramme

Im Wund-Cockpit, mit Recharts:

- **Wundfläche über Zeit** (mm², Liniendiagramm) — die zentrale Heilungskennzahl
- **Breite / Länge / Tiefe** als zuschaltbare Serien
- **Exsudatmenge** (4-stufig, Stufendiagramm) und **Schmerz-VAS** (0–10) auf gemeinsamer Zeitachse
- **Wundgrund-Zusammensetzung** über Zeit als gestapeltes Balkendiagramm (Granulation / Fibrin / Nekrose / Epithel) — zeigt auf einen Blick, ob die Wunde sauber wird

Nach den Vorgaben des Skills: Legende immer sichtbar und anklickbar, Tooltips mit exakten Werten, Achsen mit Einheit, deutsche Zahlen- und Datumsformate, Farben auch ohne Farbsehen unterscheidbar (zusätzlich Strichmuster), Skeleton beim Laden, aussagekräftiger Leerzustand bei nur einer Aufnahme, und zu jedem Diagramm eine ausklappbare Datentabelle für Screenreader.

---

## Sicherheit & Datenschutz

Es sind Gesundheitsdaten nach Art. 9 DSGVO — das prägt mehrere Entscheidungen:

- Auth über Auth.js v5 (Credentials + `argon2`), Session als HTTP-only-Cookie, Route-Schutz per Middleware
- Jede Server Action prüft die Session selbst; kein Verlass auf die Middleware allein
- Fotos nur über die authentifizierte Route, nie aus `public/`
- Audit-Log für Anlegen/Ändern/Löschen und für PDF-Exporte
- Löschen ist immer „soft delete" mit Wiederherstellung; Hard Delete nur durch Admin nach Rückfrage
- Security-Header (CSP, `X-Content-Type-Options`, `Referrer-Policy`) in `next.config.ts`
- `.gitignore` schließt `storage/`, `*.db` und `.env` aus — Patientendaten dürfen nie im Git landen
- Ein `README.md`-Abschnitt zu Backup, Verschlüsselung der Festplatte und Aufbewahrungsfristen

---

## Umsetzung in Phasen

Jede Phase endet lauffähig, damit Du zwischendurch draufschauen kannst.

**Phase 1 — Fundament**
Next.js 15 + TypeScript + Tailwind v4 + shadcn/ui aufsetzen, Design-Tokens und Fonts, Prisma-Schema mit allen Feldern, Migration, Seed mit Testbenutzer und zwei Beispielpatienten, App-Shell mit Navigation und Dark-Mode-Umschalter.

**Phase 2 — Patienten & Wunden**
Login und Benutzerverwaltung, Patientenliste mit Suche, Stammdatenformular, Wunden anlegen inkl. Diagnose und Lokalisation, Wund-Cockpit mit leerer Zeitleiste.

**Phase 3 — Das Aufnahmeformular**
Zod-Schemata für alle Blöcke, die sechs Abschnitte, Chip-Gruppen, VAS-Slider, Uhrzeit-Zifferblatt, SVG-Körperschema, Autosave, „Von letzter Aufnahme übernehmen", Lese- und Bearbeiten-Ansicht.

**Phase 4 — Fotos**
Upload-Route mit `sharp`, EXIF-Entfernung, Thumbnails, geschützte Auslieferung, Galerie mit Lightbox, Sortierung.

**Phase 5 — Auswertung**
Verlaufsdiagramme, Foto-Vergleich mit Differenztabelle, Trend-Badges in der Zeitleiste.

**Phase 6 — PDF & Feinschliff**
Export einzeln und als Verlauf in eigenem PDF-Layout, Audit-Log-Ansicht, Leerzustände, Tastaturbedienung, axe-Durchlauf, Dark-Mode-Kontrollgang.

---

## Dateistruktur

```
prisma/schema.prisma · seed.ts
assets/vorlage/draco-wunddokumentationsbogen.pdf   (nur Orientierung, keine Laufzeit-Abhaengigkeit)
assets/fonts/NotoSans-{Regular,Bold}.ttf            fuer den PDF-Export
storage/photos/…                      (gitignored)
src/app/
  (auth)/login/page.tsx
  (app)/page.tsx                      Patientenliste
  (app)/patienten/[id]/…
  (app)/wunden/[id]/…
  (app)/aufnahmen/[id]/…
  (app)/einstellungen/audit-log/page.tsx
  api/photos/[id]/route.ts            geschützte Bildauslieferung
  api/aufnahmen/[id]/pdf/route.ts
  api/wunden/[id]/pdf/route.ts
  globals.css                         Design-Tokens
src/components/
  formular/                           ChipGroup, VasSlider, Zifferblatt, Koerperschema,
                                      AbschnittsKarte, AutosaveHinweis
  wunde/                              Zeitleiste, TrendBadge, Fotogalerie, Vergleich
  diagramme/                          FlaecheVerlauf, ExsudatSchmerz, WundgrundStapel
src/lib/
  schema/                             Zod: aufnahme.ts, wunde.ts, patient.ts
  enums.ts                            alle Auswahlwerte + deutsche Labels
  pdf/                                builder.ts, export.ts
  fotos.ts · auth.ts · db.ts · audit.ts
src/actions/                          Server Actions je Entität
```

`src/lib/enums.ts` ist die eine Stelle, an der alle Auswahlwerte und ihre deutschen Beschriftungen definiert sind — Formular, PDF-Export, Diagramme und Vergleichstabelle lesen alle daraus, damit die Bezeichnungen nirgends auseinanderlaufen.

---

## Verifikation

**Aufsetzen**
```bash
npm install && npx prisma migrate dev && npx prisma db seed && npm run dev
```

**Durchgang von Hand** — ich führe ihn im Browser-Pane selbst aus und zeige Dir Screenshots:
1. Anmelden, Patient anlegen, Wunde mit Diagnose „Ulcus cruris venosum, links lateral" anlegen
2. Erstaufnahme ausfüllen (jeder der sechs Abschnitte), zwei Fotos hochladen, speichern
3. Folgeaufnahme starten → prüfen, dass sie vorbefüllt ist; Größe verkleinern; prüfen, dass das Flächen-Delta „−x %" erscheint
4. Cockpit: Zeitleiste zeigt beide Aufnahmen, Diagramme zeigen den Verlauf
5. Vergleich beider Aufnahmen aufrufen, Differenztabelle prüfen
6. PDF exportieren (einzelne Aufnahme und gesamter Verlauf) und gegen die Bildschirmansicht prüfen — dieselben Felder, dieselbe Reihenfolge

**Technische Prüfungen**
- `npm run build` und `npx tsc --noEmit` ohne Fehler
- Hochgeladenes Foto: `exiftool` bzw. `sharp.metadata()` zeigt keine GPS-Daten mehr
- Foto-URL im abgemeldeten Zustand aufrufen → 401, kein Bild
- axe-Durchlauf auf Formular und Cockpit, Tastaturbedienung ohne Maus durch das komplette Formular
- Darstellung bei 375 px, 768 px (Tablet quer, Hauptzielgerät) und 1440 px
- Dark Mode auf allen Seiten gegenprüfen, nicht aus dem Light Mode ableiten

**Tests** — Vitest für das, wo Fehler still bleiben würden: Flächen- und Delta-Berechnung, Zod-Validierung der Aufnahme, PDF-Feldzuordnung (jeder Datenschlüssel trifft ein existierendes Feld), Bildverarbeitung inkl. EXIF-Entfernung.
