# Entscheidungen und Annahmen

Protokoll aller bewussten Festlegungen. Jeder Eintrag nennt die Alternative und
den Grund, damit später nachvollziehbar ist, warum etwas so ist — und was sich
ändern müsste, um es umzudrehen.

Status: **gesetzt** = vom Nutzer entschieden · **getroffen** = von mir
entschieden, umkehrbar · **offen** = braucht Rückmeldung

---

## Vom Nutzer entschieden

| # | Thema | Entscheidung | Alternative | Status |
|---|---|---|---|---|
| E1 | Tech-Stack | Next.js 15 (App Router) + TypeScript + Prisma | Express + EJS; Nuxt 4 | gesetzt |
| E2 | Speicherung | SQLite-Datei + lokales Dateisystem | PostgreSQL; Cloud (S3) | gesetzt |
| E3 | Umfang v1 | Login, PDF-Export im DRACO-Layout, Verlaufsdiagramme, Foto-Vergleich | schlankere erste Version | gesetzt |
| E4 | Datenmodell | Patient → Wunden → Aufnahmen | Patient → Aufnahmen (wie Papier) | gesetzt |

Zu **E2**: Damit verlassen keine Gesundheitsdaten das Haus. Der Preis ist, dass
SQLite nur einen Schreibvorgang gleichzeitig zulässt — für eine Praxis mit
einigen parallelen Nutzern reicht das; bei mehr als etwa zehn gleichzeitig
Schreibenden wäre PostgreSQL fällig. Der Umstieg betrifft nur
`prisma/schema.prisma` und `DATABASE_URL`.

Zu **E4**: Der Papierbogen kennt eine Wunde pro Blatt. Reale Patienten haben oft
mehrere (links und rechts). Die Zwischenebene *Wunde* trägt deshalb alles
Stabile — Diagnose, Lokalisation, Bestandsdauer, Rezidiv — und die *Aufnahme*
alles, was sich bei jedem Verbandwechsel ändert.

---

## Annahmen zur Vorlage

### A1 — Exsudatmenge: Tippfehler im Original

Der Bogen hat genau vier Ankreuzfelder (Koordinaten y = 474, 462, 438, 414). Die
Textebene liest sich als:

```
Keine · Keine bis Schwache · Schwache bis Mäßige · Mäßige bis Schwache
```

Die vierte Stufe ergibt als Steigerung keinen Sinn. Ich dokumentiere
**„Mäßige bis starke"** (`MAESSIG_BIS_STARK`).

*Wenn das falsch ist:* eine Zeile in `src/lib/enums.ts` ändern. Bereits erfasste
Daten bleiben gültig, da der gespeicherte Schlüssel derselbe bleibt.

### A2 — PDF-Export nutzt das Original als Vorlage — **verworfen, siehe T12**

Ursprünglich geplant: das Original-AcroForm mit `pdf-lib` befüllen, damit der
Ausdruck layoutgleich zum Papierbogen ist. Auf Rückfrage entschieden: Der
Papierbogen diente nur der fachlichen Orientierung beim Aufbau von
Datenmodell und Formular — er ist fremdes Material und wird nicht als
Exportvorlage verwendet. Details siehe [T12](#t12--eigenstaendiges-pdf-layout-statt-vorlagen-fill).

### A3 — Graduierung gehört an die Aufnahme

Wagner/Armstrong-Grad und Dekubitus-Kategorie stehen auf dem Bogen im
Diagnoseblock, ändern sich aber im Verlauf. Sie liegen deshalb an der *Aufnahme*,
nicht an der *Wunde* — sonst ginge die Historie verloren.

### A4 — Körperschema vereinfacht

Der Bogen hat ein anatomisches Beinschema mit rund 40 kleinen Ankreuzfeldern
(links/rechts × lateral/medial × Höhe). Ich bilde das ab als: Region aus einer
Liste + Seite + Ausrichtung + Freitext, dazu ein klickbares SVG-Schema. Das ist
strukturiert auswertbar, während die Papierversion es nicht ist.

### A5 — Betrieb on-premise

Praxisrechner oder lokaler Server, kein öffentliches Hosting, keine Anbindung an
ein PVS/KIS in v1. Davon hängen die CSP, das Fehlen von Rate-Limiting und die
Cookie-Einstellungen ab.

---

## Während der Umsetzung getroffen

### T1 — `bcryptjs` statt `argon2`

Der Plan nannte Argon2. `@node-rs/argon2` braucht auf Windows je nach Umgebung
einen nativen Build; `bcryptjs` ist reines JavaScript und läuft überall. Bei
einer Handvoll Anmeldungen am Tag ist der Unterschied in der Praxis
bedeutungslos, solange die Kostenstufe hoch genug ist (wir nutzen 12).

*Umkehrbar:* nur `src/lib/auth.ts` betroffen. Bei einem Wechsel müssen
bestehende Passwörter bei der nächsten Anmeldung neu gehasht werden.

### T2 — Mehrfachauswahlen als JSON-String

SQLite kennt keine Array-Spalten. Statt für jede der zwölf Mehrfachauswahlen eine
eigene Verknüpfungstabelle anzulegen, speichere ich ein JSON-Array. Gelesen und
geschrieben wird ausschließlich über `leseAuswahl` / `schreibeAuswahl` in
`src/lib/utils.ts`, validiert über Zod gegen `src/lib/enums.ts`.

*Preis:* Man kann nicht per SQL nach „alle Wunden mit Fibrinbelägen" filtern.
Für die geplanten Auswertungen wird ohnehin in der Anwendung gerechnet. Bei
Bedarf wäre PostgreSQL mit echten Array-Spalten der saubere Weg.

### T3 — `src/lib/enums.ts` als einzige Quelle

Alle Auswahlwerte und ihre deutschen Beschriftungen stehen an einer Stelle.
Formular, PDF-Export, Diagramme und Vergleichstabelle lesen daraus. Ohne das
laufen Bezeichnungen zwischen Formular und Ausdruck garantiert auseinander.

### T4 — Neutraler Hintergrund statt der Skill-Palette

Der `ui-ux-pro-max`-Skill empfiehlt für Healthcare `#ECFEFF` als Hintergrund.
Für ein Formular mit rund 180 Feldern ist das zu stark getönt — ich nehme
Slate `#F8FAFC` als Arbeitsfläche und behalte das Cyan `#0891B2` als
Primärfarbe. Alles andere aus der Skill-Empfehlung (Stil „Accessible &
Ethical", Figtree + Noto Sans) bleibt.

### T5 — Fläche als Breite × Länge

Wunddokumentation rechnet die Fläche konventionell als Rechteck, nicht als
Ellipse. Das überschätzt die echte Fläche, bleibt aber mit den Werten auf dem
Papierbogen und in der Literatur vergleichbar. Umgesetzt in
`src/lib/wundmasse.ts`, dort getestet.

### T6 — Trendschwelle 2 %

Änderungen der Wundfläche unter 2 % gelten als „unverändert". Wundmessung am
Bett ist nicht genauer; ein Pfeil bei 0,7 % wäre irreführend.

### T7 — Fotos nicht unter `public/`

Bilder liegen in `storage/` und werden nur über eine Route ausgeliefert, die
vorher die Sitzung prüft. Unter `public/` wäre jedes Wundfoto per URL für jeden
erreichbar, der sie errät oder mitliest.

### T8 — EXIF-Daten werden entfernt

`sharp` schreibt die Bilder ohne Metadaten neu. Handykameras speichern
GPS-Koordinaten — bei Hausbesuchen wäre das die Wohnadresse des Patienten im
Bild.

### T9 — Löschen ist immer weich

`geloeschtAm` statt `DELETE`. Versehentliches Löschen einer Aufnahme wäre sonst
unwiederbringlicher Verlust von Behandlungsdokumentation.

### T10 — Vorlage liegt lokal, nicht im Repository, und wird nicht mehr gelesen

Das Original-PDF ist fremdes Material und soll nicht in die Versionsverwaltung.
Es liegt unter `assets/vorlage/draco-wunddokumentationsbogen.pdf` und ist über
`.gitignore` ausgeschlossen; daneben steht eine versionierte
[README](../assets/vorlage/README.md).

Seit [T12](#t12--eigenstaendiges-pdf-layout-statt-vorlagen-fill) ist die Datei
reine Orientierungshilfe beim Entwickeln, keine Laufzeit-Abhängigkeit mehr —
der PDF-Export braucht sie nicht, liest sie nicht und meldet auch nichts, wenn
sie fehlt.

*Noch offen:* Die Datei steckt weiterhin im Commit `2ae0f97` der Historie. Sie
aus HEAD zu löschen entfernt sie nicht aus der Vergangenheit. Solange das
Repository lokal bleibt, ist das folgenlos; vor einer Veröffentlichung müsste
die Historie neu geschrieben werden (`git filter-repo`).

### T11 — npm-Installationsskripte freigegeben

npm 12 blockiert Postinstall-Skripte. Für Prisma, esbuild und `sharp` sind sie
nötig (native Binaries) und in `package.json` unter `allowScripts` einzeln
freigegeben — keine pauschale Freigabe.

### T12 — Eigenständiges PDF-Layout statt Vorlagen-Fill

Auf Rückfrage während Phase 6 entschieden: Der DRACO-Papierbogen diente beim
Aufbau von Datenmodell, Formular und Feldinventar nur der fachlichen
Orientierung. Er ist fremdes Material und wird **nicht** als Exportvorlage
befüllt — der ursprüngliche Plan mit `scripts/build-pdf-map.ts`,
`src/lib/pdf/field-map.json` und einem 316-Felder-AcroForm-Mapping entfällt
komplett.

Stattdessen zeichnet `src/lib/pdf/builder.ts` ein eigenes Layout direkt mit
`pdf-lib` (Titel, Abschnitte, Label/Wert-Raster, Tabelle, Fotos) und
`src/lib/pdf/export.ts` befüllt es mit denselben Feldern in derselben
Reihenfolge wie die Leseansicht (`aufnahmen/[id]/page.tsx`) — Bildschirm und
Ausdruck können so nie auseinanderlaufen. Zwei Export-Routen:
`api/aufnahmen/[id]/pdf` (eine Aufnahme) und `api/wunden/[id]/pdf`
(gesamter Verlauf, chronologisch mit Übersichtstabelle vorangestellt).

*Umkehrbar:* Betrifft ausschließlich `src/lib/pdf/`. Ein Vorlagen-Fill wäre bei
Bedarf später nachrüstbar, ohne Formular oder Datenmodell anzufassen.

### T13 — Echte Schriftdatei statt PDF-Standardschrift

`pdf-lib`s eingebaute Standardschriften (`StandardFonts.Helvetica`) kommen
ohne Unicode-Zuordnung (ToUnicode-CMap). Der erste Verdacht war, dass dadurch
Umlaute im Export nicht durchsuchbar/kopierbar wären — das erwies sich beim
genauen Nachprüfen (Byte-Ebene, nicht nur Terminal-Ausgabe) als falscher
Alarm, die Standardschrift extrahierte bereits korrekt.

Trotzdem entschieden, echte Schriftdateien einzubetten
(`assets/fonts/NotoSans-{Regular,Bold}.ttf` über `@pdf-lib/fontkit`): Noto Sans
ist ohnehin schon die Schrift der Anwendung ([T4](#t4--neutraler-hintergrund-statt-der-skill-palette)),
das macht Bildschirm und Ausdruck auch typografisch konsistent, unabhängig
vom Standardschriften-Ersatz des jeweiligen PDF-Betrachters. Die Schriftdatei
ist eine variable Schrift (Google Fonts, OFL-Lizenz); für den Export wurden
mit `fonttools` statische Regular-/Bold-Instanzen erzeugt und auf
Latein/Interpunktion eingekürzt (siehe [assets/fonts/README.md](../assets/fonts/README.md)).

---

## Bewusst nicht umgesetzt

| Thema | Grund |
|---|---|
| Anbindung an PVS/KIS (GDT/HL7/FHIR) | Nicht angefragt; braucht Kenntnis des Zielsystems |
| Mandantenfähigkeit | Eine Einrichtung pro Installation |
| Verschlüsselung der Datenbank | Festplattenverschlüsselung des Rechners ist der wirksamere Hebel; im README beschrieben |
| Wundvermessung aus dem Foto | Braucht Referenzmarker und Kalibrierung; eigenes Projekt |
| Offline-Betrieb / PWA | Praxis-WLAN vorausgesetzt |
| Zwei-Faktor-Anmeldung | Sinnvoll, aber nicht im vereinbarten Umfang |

---

## Noch zu klären

1. **A1** — Stimmt „Mäßige bis starke" als vierte Exsudatstufe?
2. Sollen Patienten nach einer Frist automatisch archiviert werden, und nach
   welcher? (Aufbewahrungsfrist für Behandlungsdokumentation: 10 Jahre)
