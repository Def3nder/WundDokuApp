# Exportvorlage

Für den PDF-Export im gewohnten Layout wird hier die Originaldatei erwartet:

```
assets/vorlage/draco-wunddokumentationsbogen.pdf
```

Das ist der interaktive Wunddokumentationsbogen von Dr. Ausbüttel (DRACO),
erhältlich unter <https://www.draco.de>.

**Die Datei liegt bewusst nicht im Repository** (`.gitignore`) — sie ist fremdes
Material und gehört nicht in die Versionsverwaltung. Nach dem Klonen muss sie
einmal von Hand hierher kopiert werden.

## Was die Anwendung damit macht

Beim Export wird das enthaltene Formular (AcroForm, 316 Felder) mit den Daten
einer Aufnahme befüllt und anschließend abgeflacht. Die Vorlage selbst wird nur
gelesen und nie verändert.

Die Zuordnung `Formularfeld → Datenfeld` liegt in
`src/lib/pdf/field-map.json` und **ist** versioniert — sie enthält nur
Feldnamen und Koordinaten, keinen Inhalt der Vorlage. Neu erzeugen mit:

```bash
npm run pdf:map
```

## Wenn die Datei fehlt

Die Anwendung läuft normal weiter; nur der PDF-Export meldet, dass die Vorlage
fehlt, und verweist auf diese Datei. Alle anderen Funktionen sind unabhängig
davon.

Eine inhaltliche Auswertung des Bogens — welche Felder es gibt und wie sie im
Datenmodell abgebildet sind — steht in [../../docs/FELDINVENTAR.md](../../docs/FELDINVENTAR.md).
