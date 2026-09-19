# Papierbogen (nur Orientierung)

Hierhin gehört, wer beim Weiterentwickeln den Originalbogen zum Vergleich
danebenlegen möchte:

```
assets/vorlage/draco-wunddokumentationsbogen.pdf
```

Das ist der interaktive Wunddokumentationsbogen von Dr. Ausbüttel (DRACO),
erhältlich unter <https://www.draco.de>.

**Die Datei liegt bewusst nicht im Repository** (`.gitignore`) — sie ist fremdes
Material und gehört nicht in die Versionsverwaltung.

## Wird von der Anwendung nicht gelesen

Der PDF-Export (`src/lib/pdf/`) zeichnet ein eigenständiges Layout und befüllt
nicht dieses Original-AcroForm — siehe
[Entscheidung T12](../../docs/ENTSCHEIDUNGEN.md#t12--eigenstaendiges-pdf-layout-statt-vorlagen-fill).
Die Datei dient ausschließlich der fachlichen Orientierung beim Entwickeln;
fehlt sie, läuft die Anwendung unverändert weiter.

Eine inhaltliche Auswertung des Bogens — welche Felder es gibt und wie sie im
Datenmodell abgebildet sind — steht in [../../docs/FELDINVENTAR.md](../../docs/FELDINVENTAR.md).
