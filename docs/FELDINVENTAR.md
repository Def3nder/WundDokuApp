# Feldinventar des Wunddokumentationsbogens

Vollständige Auswertung von
`assets/vorlage/draco-wunddokumentationsbogen.pdf`. Grundlage für
`prisma/schema.prisma`, `src/lib/enums.ts` und den PDF-Export.

**Erhebung:** Textebene mit `pdftotext -layout`, zusätzlich alle
Formularfelder mit ihren Widget-Koordinaten über `pypdf`. Die Koordinaten waren
nötig, weil die Feldnamen im PDF generisch sind (`Kontrollkästchen 113`,
`Textfeld 1024`) und nichts über ihre Bedeutung verraten.

**Umfang:** 316 Formularfelder — 179 auf Seite 1 (Befund), 137 auf Seite 2
(Therapieplan).

---

## Seite 1 — Befund

### Kopfzeile
Name/Vorname · Patientennummer · Datum · Geburtsdatum · Therapieverantwortlicher Arzt

→ `Patient` (Stammdaten), `Assessment.datum`

### Diagnose (linke Spalte)

| Feld | Typ | Ziel |
|---|---|---|
| Ulcus cruris → Arteriosum, Venosum (Widmer), Mixtum, Sonstige Ursache | 1 + 4 Ankreuzfelder, je mit Freitext | `Wound.diagnoseTyp` |
| DFS (Wagner/Armstrong) + „Grad" | Ankreuzfeld + Text | `diagnoseTyp` + `Assessment.wagnerArmstrongGrad` |
| Dekubitus + „Kategorie" | Ankreuzfeld + Text | `diagnoseTyp` + `Assessment.dekubitusKategorie` |
| Post-OP Wunde | Ankreuzfeld | `diagnoseTyp` |
| Sonstige Wunde | Ankreuzfeld + Text | `diagnoseTyp` + `diagnoseFreitext` |

Die Graduierung liegt an der Aufnahme, nicht an der Wunde — siehe
[Annahme A3](ENTSCHEIDUNGEN.md#a3--graduierung-gehört-an-die-aufnahme).

### Wundgröße, Bestandsdauer, Rezidiv, Lokalisation (linke Spalte)

- **Wundgröße in mm:** Breite, Länge, Tiefe → `breiteMm`, `laengeMm`, `tiefeMm`
- **Wunde besteht seit:** Zahl + Tagen/Wochen/Monaten/Jahren → `bestehtSeitWert`, `bestehtSeitEinheit`
- **Rezidiv:** Nein / Ja + Anzahl → `rezidiv`, `rezidivAnzahl`
- **Lokalisation:** Freitext + Beinschema mit ~40 Ankreuzfeldern (Links/Rechts, lateral/medial) → vereinfacht, siehe [A4](ENTSCHEIDUNGEN.md#a4--körperschema-vereinfacht)
- **Wundheilungsbeeinflussende Faktoren:** Freitext → `wundheilungsfaktoren`

### Wundumgebung (10 Ankreuzfelder, Mehrfachauswahl)
Unauffällig · Gerötet · Mazeriert · Juckreiz · Hämatome · Feucht · Trocken ·
Erwärmt · Blasenbildung · Bläulich

→ `Assessment.wundumgebung`. „Unauffällig" schließt die übrigen aus
(`WUNDUMGEBUNG_EXKLUSIV`).

### Wundrand (5)
Unterminiert · Mazeriert · Gerötet · Nekrotisch · Hyperkeratotisch

### Wundgrund (15)
Epithelgewebe/Inseln · Fehlende Granulation · Granulation · Granulationsödem ·
Hypergranulation · Biofilm · Weiche/feuchte Nekrose · Muskeln/Sehnen/Faszien ·
Knochen · Hämatome · Kalkablagerung · Fremdkörper · Fibrinbeläge ·
Feste/trockene Nekrose · Sonstiges (+ Freitext)

Für das Verlaufsdiagramm in fünf Gruppen zusammengefasst
(`WUNDGRUND_GRUPPEN`): Epithel · Granulation · Fibrin/Biofilm · Nekrose ·
Tiefe Strukturen.

### Exsudation

| Block | Werte |
|---|---|
| Menge (4 Felder, Einfachauswahl) | Keine · Keine bis schwache · Schwache bis mäßige · **Mäßige bis starke** (siehe [A1](ENTSCHEIDUNGEN.md#a1--exsudatmenge-tippfehler-im-original)) |
| Farbe (6, Mehrfach) | Klar · Trüb · Gelb · Blutig · Grün · Sonstiges (+ Freitext) |
| Konsistenz (2, Mehrfach) | Serös · Schleimig |

**Geruch:** Nein / Ja → `geruch`

### Entzündung und Infektion

- **Entzündungszeichen** (5): Rötung · Schwellung · Wärme · Schmerz · Funktionseinschränkung
- **Lokale Zeichen einer … präsent** (2): Kritische Kolonisation · Wundinfektion
- **Systemische Zeichen einer Wundinfektion:** Ja/Nein + Freitext
- **Abstrich:** Nein / Ja + Ergebnis

### Schmerz (rechte Spalte)

- **Schmerzen:** Nein / Ja + VAS/NRS
- Drei Orte mit je „Auf … Uhr" **oder** „Gesamter Wundgrund":
  In der Wunde · Am Wundrand · Wundumgebung
- Drei Situationen mit eigener VAS: beim Verbandwechsel · bei Druck ·
  überall im Bereich der Wunde
- **Schmerztagebuch vorhanden:** Nein / Ja
- **Sonstiges:** Freitext

Die Uhrzeit-Angabe (1–12) beschreibt die Lage am Zifferblatt der Wunde. Im
Formular wird sie über ein klickbares Zifferblatt erfasst statt über ein
Zahlenfeld.

---

## Seite 2 — Therapieplan

Der Papierbogen ist hier eine **Matrix**: Zeilen sind Therapiepositionen,
Spalten sind drei Verbandwechsel (je Datum, „Foto Ja/Nein", Anmerkungen).

Genau diese drei Spalten sind der Grund für die App: In der Anwendung wird jede
Spalte zu einer eigenen **Folgeaufnahme**, unbegrenzt viele statt drei — und
„Foto Ja/Nein" wird zum echten Bild.

| Position | Werte | Zusatzfelder |
|---|---|---|
| Wundspülung | NaCl 0,9 % · Ringer · Polyhexanid · Octenisept | Freitext |
| Reinigung | Chirurgisch · Mechanisch · Autolytisch | Freitext |
| Hautpflege | — | Freitext |
| Wundrandschutz | — | Freitext |
| Wundfüllung | Hydrofaser · Hydrogel · Alginat · Cavity-Schaum | Größe in cm, Freitext |
| Wundabdeckung | Distanzgitter · Kompresse · Hydrokolloid · Schaumverband · Saugkompresse · Folie | Größe in cm, Freitext |
| Fixierung | Selbstklebend · Folie · Fixiermull · Mullbinde | Freitext |
| Kompression | Kurzzugbinde · Strumpf | 2× (Breite cm, Anzahl), Klasse, Maß |
| Sonstiges | — | Freitext |
| Handzeichen | — | → `Assessment.erstelltVon` |

---

## Was die App gegenüber Papier ergänzt

| Ergänzung | Warum |
|---|---|
| Beliebig viele Folgeaufnahmen | Papier bietet genau drei Spalten |
| Mehrere Wunden pro Patient | Papier: ein Bogen pro Wunde |
| Echte Wundfotos | Papier kennt nur „Foto Ja/Nein" |
| Berechnete Fläche mm² und Trend | Auf Papier müsste man rechnen |
| Verlaufsdiagramme | Auf Papier nicht möglich |
| Vorbefüllung aus der letzten Aufnahme | Der größte Zeitgewinn im Alltag |
| Wagner-Grad und Dekubitus-Kategorie je Aufnahme | Papier erfasst sie einmalig |

Kein Feld des Bogens entfällt.
