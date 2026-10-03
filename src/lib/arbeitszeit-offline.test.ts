import { describe, expect, it } from "vitest";
import {
  ansichtAus, formDataAus, laufendeAnsicht, pruefeVorAblage, ueberschneidet, werteAusFormData,
  type BuchungAnsicht, type WarteEintrag,
} from "./arbeitszeit-offline";

const jetzt = new Date("2026-10-05T12:00:00Z"); // 14:00 Berliner Zeit
const werte = (beginn: string, ende = "", rest: Record<string, string> = {}) => ({
  beginn, beginnVorkommen: "erstes", ende, endeVorkommen: "erstes", pauseMinuten: "0", notiz: "", ...rest,
});
let zaehler = 0;
const wartend = (w: Record<string, string>, rest: Partial<WarteEintrag> = {}): WarteEintrag => ({
  clientId: `c${++zaehler}`, userId: "u", erstellt: `2026-10-05T10:00:0${zaehler % 10}Z`, werte: w, status: "wartet", ...rest,
});
const serverLaufend: BuchungAnsicht = { id: "s1", beginn: "2026-10-05T06:00:00.000Z", ende: null, pauseMinuten: 30, notiz: "", version: 3 };

describe("Offline-Zeiterfassung: Formularwerte", () => {
  it("uebersteht den Weg ueber FormData unveraendert", () => {
    const w = werte("2026-10-05T08:00", "", { notiz: "Früh" });
    expect(werteAusFormData(formDataAus(w))).toEqual(w);
  });
  it("macht aus Formularwerten eine Ansicht mit lokaler Kennung oder Server-ID", () => {
    const lokal = ansichtAus(wartend(werte("2026-10-05T08:00", "2026-10-05T09:30", { pauseMinuten: "15" })));
    expect(lokal).toMatchObject({ beginn: "2026-10-05T06:00:00.000Z", ende: "2026-10-05T07:30:00.000Z", pauseMinuten: 15, version: 0 });
    expect(lokal?.id.startsWith("lokal:")).toBe(true);
    expect(ansichtAus(wartend(werte("2026-10-05T08:00", "", { id: "s1", version: "3" })))).toMatchObject({ id: "s1", version: 3, ende: null });
    expect(ansichtAus(wartend(werte("kaputt")))).toBeNull();
  });
});

describe("Offline-Zeiterfassung: Stechuhr", () => {
  it("zeigt den Serverstand, solange nichts wartet", () => {
    expect(laufendeAnsicht(serverLaufend, [])).toEqual({ eintrag: serverLaufend });
    expect(laufendeAnsicht(undefined, [])).toEqual({});
  });
  it("zeigt eine nur lokal begonnene Stechuhr als laufend", () => {
    const e = wartend(werte("2026-10-05T08:00"));
    const a = laufendeAnsicht(undefined, [e]);
    expect(a.lokal).toBe(true);
    expect(a.clientId).toBe(e.clientId);
    expect(a.eintrag?.ende).toBeNull();
  });
  it("zeigt eine lokal begonnene und schon beendete Buchung nicht mehr als laufend", () => {
    expect(laufendeAnsicht(undefined, [wartend(werte("2026-10-05T08:00", "2026-10-05T12:00"))])).toEqual({});
  });
  it("erkennt das wartende Ausstempeln einer Serverbuchung", () => {
    const stopp = wartend(werte("2026-10-05T08:00", "2026-10-05T12:00", { id: "s1", version: "3" }));
    expect(laufendeAnsicht(serverLaufend, [stopp])).toEqual({ stoppWartet: true });
  });
  it("legt eine wartende Korrektur der laufenden Serverbuchung darueber, behaelt aber Server-Version", () => {
    const korrektur = wartend(werte("2026-10-05T07:45", "", { id: "s1", version: "3" }));
    const a = laufendeAnsicht(serverLaufend, [korrektur]);
    expect(a.clientId).toBe(korrektur.clientId);
    expect(a.eintrag).toMatchObject({ id: "s1", version: 3, beginn: "2026-10-05T05:45:00.000Z" });
  });
  it("ignoriert Eintraege, die der Server abgewiesen hat", () => {
    expect(laufendeAnsicht(undefined, [wartend(werte("2026-10-05T08:00"), { status: "pruefen", meldung: "x" })])).toEqual({});
  });
});

describe("Offline-Zeiterfassung: Pruefung vor der Ablage", () => {
  const bekannt = [{ id: "a", beginn: new Date("2026-10-05T06:00:00Z"), ende: new Date("2026-10-05T07:00:00Z") }];
  it("erkennt Ueberschneidungen mit bekannten und wartenden Buchungen, nicht aber direkte Anschluesse", () => {
    const ze = (b: string, e: string | null) => ({ beginn: new Date(b), ende: e ? new Date(e) : null });
    expect(ueberschneidet(ze("2026-10-05T06:30:00Z", "2026-10-05T08:00:00Z"), bekannt, [])).toBe(true);
    expect(ueberschneidet(ze("2026-10-05T07:00:00Z", "2026-10-05T08:00:00Z"), bekannt, [])).toBe(false);
    expect(ueberschneidet(ze("2026-10-05T05:00:00Z", null), bekannt, [])).toBe(true);
    const wartende = [wartend(werte("2026-10-05T11:00", "2026-10-05T12:00"))];
    expect(ueberschneidet(ze("2026-10-05T09:30:00Z", "2026-10-05T10:30:00Z"), bekannt, wartende)).toBe(true);
  });
  it("laesst eine wartende Aenderung den Serverstand ersetzen und ignoriert die eigene Buchung", () => {
    const verkuerzt = wartend(werte("2026-10-05T08:00", "2026-10-05T08:30", { id: "a", version: "0" }));
    // Der Server kennt "a" noch bis 09:00 Uhr, die wartende Fassung endet frueher.
    expect(ueberschneidet({ beginn: new Date("2026-10-05T06:45:00Z"), ende: new Date("2026-10-05T07:30:00Z") }, bekannt, [verkuerzt])).toBe(false);
    expect(ueberschneidet({ beginn: new Date("2026-10-05T06:10:00Z"), ende: null }, bekannt, [verkuerzt], { id: "a" })).toBe(false);
    expect(ueberschneidet({ beginn: new Date("2026-10-05T06:10:00Z"), ende: null }, [], [verkuerzt], { clientId: verkuerzt.clientId })).toBe(false);
  });
  it("meldet Eingabefehler, Zukunft und Ueberschneidung vor dem Speichern", () => {
    expect(pruefeVorAblage(werte("2026-10-05T10:00", "2026-10-05T09:00"), [], [], undefined, jetzt)).toMatchObject({ ok: false, ergebnis: { fehler: { ende: expect.any(String) } } });
    expect(pruefeVorAblage(werte("2026-10-05T16:00"), [], [], undefined, jetzt)).toMatchObject({ ok: false, ergebnis: { meldung: expect.stringContaining("Zukunft") } });
    expect(pruefeVorAblage(werte("2026-10-05T08:30", "2026-10-05T09:30"), bekannt, [], undefined, jetzt)).toMatchObject({ ok: false, ergebnis: { meldung: expect.stringContaining("überschneidet") } });
    expect(pruefeVorAblage(werte("2026-10-05T13:00"), bekannt, [], undefined, jetzt)).toMatchObject({ ok: true });
  });
  it("erlaubt das erneute Speichern derselben wartenden Buchung", () => {
    const e = wartend(werte("2026-10-05T13:00"));
    expect(pruefeVorAblage(werte("2026-10-05T13:05"), [], [e], undefined, jetzt)).toMatchObject({ ok: false });
    expect(pruefeVorAblage(werte("2026-10-05T13:05"), [], [e], e.clientId, jetzt)).toMatchObject({ ok: true });
  });
});
