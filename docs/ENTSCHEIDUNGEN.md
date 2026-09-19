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

### A2 — PDF-Export nutzt das Original als Vorlage

Der Ausdruck soll layoutgleich zum Papierbogen sein, deshalb fülle ich das
Original-AcroForm mit `pdf-lib`, statt ein eigenes Layout zu bauen. Das Original
liegt unverändert unter `assets/vorlage/` und wird ausschließlich mit den eigenen
Patientendaten befüllt.

*Offener Punkt:* Falls das lizenzrechtlich nicht gewünscht ist, baue ich ein
eigenes Layout — das kostet etwa einen halben Tag und ändert nur
`src/lib/pdf/`.

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

### T10 — Vorlage liegt lokal, nicht im Repository

Das Original-PDF ist fremdes Material und soll nicht in die Versionsverwaltung.
Es liegt unter `assets/vorlage/draco-wunddokumentationsbogen.pdf` und ist über
`.gitignore` ausgeschlossen; daneben steht eine versionierte
[README](../assets/vorlage/README.md), die erklärt, was dort hingehört.

Die daraus abgeleitete Feldzuordnung `src/lib/pdf/field-map.json` **wird**
versioniert — sie enthält nur Feldnamen und Koordinaten, keinen Inhalt der
Vorlage. So bleibt der Code nachvollziehbar, ohne die Datei mitzuliefern.

*Folge:* Nach einem frischen Klon fehlt die Vorlage. Der PDF-Export meldet das
verständlich und verweist auf die README; alle übrigen Funktionen laufen
unabhängig davon.

*Noch offen:* Die Datei steckt weiterhin im Commit `2ae0f97` der Historie. Sie
aus HEAD zu löschen entfernt sie nicht aus der Vergangenheit. Solange das
Repository lokal bleibt, ist das folgenlos; vor einer Veröffentlichung müsste
die Historie neu geschrieben werden (`git filter-repo`).

### T11 — npm-Installationsskripte freigegeben

npm 12 blockiert Postinstall-Skripte. Für Prisma, esbuild und `sharp` sind sie
nötig (native Binaries) und in `package.json` unter `allowScripts` einzeln
freigegeben — keine pauschale Freigabe.

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

1. **A2** — Original-PDF als Exportvorlage in Ordnung, oder eigenes Layout?
2. **A1** — Stimmt „Mäßige bis starke" als vierte Exsudatstufe?
3. Sollen Patienten nach einer Frist automatisch archiviert werden, und nach
   welcher? (Aufbewahrungsfrist für Behandlungsdokumentation: 10 Jahre)
