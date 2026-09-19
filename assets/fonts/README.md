# Schriften für den PDF-Export

`NotoSans-Regular.ttf` und `NotoSans-Bold.ttf` — statische Instanzen der
variablen Schrift [Noto Sans](https://fonts.google.com/noto/specimen/Noto+Sans)
(SIL Open Font License, siehe [OFL.txt](OFL.txt)), auf Latein/Latein-1/
allgemeine Interpunktion eingekürzt (rund 430 Glyphen statt aller Schriften).

Dieselbe Schriftfamilie verwendet die Anwendung bereits über
`next/font/google` in `src/app/layout.tsx` ([Entscheidung T4](../../docs/ENTSCHEIDUNGEN.md#t4--neutraler-hintergrund-statt-der-skill-palette)).
Für den PDF-Export (`src/lib/pdf/builder.ts`) braucht es zusätzlich echte
Schriftdateien: `pdf-lib`s eingebaute Standardschriften (Helvetica) betten
keine Unicode-Zuordnung ein, wodurch Umlaute im fertigen PDF zwar korrekt
aussehen, aber weder durchsuchbar noch kopierbar wären.

## Neu erzeugen

Die Originaldatei ist eine variable Schrift mit den Achsen `wght`/`wdth`.
Statische Gewichte wurden mit `fonttools` erzeugt:

```bash
python -m fontTools.varLib.instancer "NotoSans[wdth,wght].ttf" wght=400 wdth=100 \
  --update-name-table -o NotoSans-Regular-full.ttf
python -m fontTools.varLib.instancer "NotoSans[wdth,wght].ttf" wght=700 wdth=100 \
  --update-name-table -o NotoSans-Bold-full.ttf

python -m fontTools.subset NotoSans-Regular-full.ttf \
  --unicodes="U+0000-00FF,U+0100-017F,U+2000-206F,U+20AC" \
  --layout-features='*' --glyph-names --output-file=NotoSans-Regular.ttf
python -m fontTools.subset NotoSans-Bold-full.ttf \
  --unicodes="U+0000-00FF,U+0100-017F,U+2000-206F,U+20AC" \
  --layout-features='*' --glyph-names --output-file=NotoSans-Bold.ttf
```

`pdf-lib` bettet beim Export ohnehin nur die tatsächlich benutzten Glyphen ein
(`subset: true`) — die Vorab-Kürzung hier verkleinert nur diese Quelldatei im
Repository (von rund 2 MB auf je ca. 60 KB).
