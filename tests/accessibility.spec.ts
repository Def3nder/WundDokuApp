import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@praxis.local";
const adminPasswort = process.env.SEED_ADMIN_PASSWORD ?? "WundDoku!2026";

async function anmelden(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(adminEmail);
  await page.getByLabel("Passwort").fill(adminPasswort);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Patienten" })).toBeVisible();
}

function verlangeHref(wert: string | null, bezeichnung: string): string {
  expect(wert, `${bezeichnung} muss einen Link besitzen`).toBeTruthy();
  if (!wert) throw new Error(`${bezeichnung} ohne href`);
  return wert;
}

async function anwendungsRouten(page: Page): Promise<string[]> {
  await page.goto("/");
  const patientHref = verlangeHref(
    await page
      .locator('main a[href^="/patienten/"]:not([href="/patienten/neu"])')
      .first()
      .getAttribute("href"),
    "Patientenkarte",
  );

  await page.goto(patientHref);
  const wundeHref = verlangeHref(
    await page.locator('main a[href^="/wunden/"]').first().getAttribute("href"),
    "Wundkarte",
  );

  await page.goto(wundeHref);
  const aufnahmeHref = verlangeHref(
    await page.locator('main a[href^="/aufnahmen/"]').first().getAttribute("href"),
    "Aufnahmekarte",
  );

  const routen = [
    "/",
    "/?q=kein-treffer-a11y",
    "/patienten/neu",
    "/einstellungen/benutzer",
    "/einstellungen/benutzer/neu",
    "/einstellungen/stammdaten",
    "/einstellungen/audit-log",
    patientHref,
    `${patientHref}/bearbeiten`,
    `${patientHref}/wunden/neu`,
    `${patientHref}/dokumente?typ=REZEPT`,
    `${patientHref}/dokumente?typ=ARZTBRIEF`,
    `${patientHref}/dokumente/neu?typ=REZEPT`,
    `${patientHref}/dokumente/neu?typ=ARZTBRIEF`,
    wundeHref,
    `${wundeHref}/bearbeiten`,
    `${wundeHref}/aufnahmen/neu`,
    `${wundeHref}/vergleich`,
    aufnahmeHref,
    `${aufnahmeHref}/bearbeiten`,
  ];

  await page.goto("/");
  const leererPatient = page.getByRole("link", { name: /Weber, Gerhard/ });
  if ((await leererPatient.count()) > 0) {
    const leererPatientHref = await leererPatient.first().getAttribute("href");
    if (leererPatientHref) {
      await page.goto(leererPatientHref);
      const leereWundeHref = await page.locator('main a[href^="/wunden/"]').first().getAttribute("href");
      if (leereWundeHref) {
        routen.push(leereWundeHref, `${leereWundeHref}/vergleich`);
      }
    }
  }

  return [...new Set(routen)];
}

async function axePruefen(page: Page, route: string, farbschema: string) {
  await page.goto(route);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect.soft(page, `${route} benötigt einen eindeutigen Seitentitel`).toHaveTitle(/.+ · WundDoku/);
  const ergebnis = await new AxeBuilder({ page })
    .exclude("nextjs-portal")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const kompakt = ergebnis.violations.map((verstoss) => ({
    id: verstoss.id,
    impact: verstoss.impact,
    hilfe: verstoss.help,
    ziele: verstoss.nodes.map((knoten) => knoten.target),
  }));
  expect.soft(kompakt, `${farbschema}: ${route}`).toEqual([]);
}

test("Anmeldeseite besteht axe in Hell und Dunkel", async ({ page }) => {
  await page.goto("/login");
  for (const modus of ["Hell", "Dunkel"]) {
    await page.getByRole("radio", { name: modus }).click();
    await expect(page.getByRole("radio", { name: modus })).toHaveAttribute("aria-checked", "true");
    await axePruefen(page, "/login", modus);
  }
});

test("zentrale Seiten bestehen axe in Hell und Dunkel", async ({ page }) => {
  await anmelden(page);
  const routen = await anwendungsRouten(page);

  for (const modus of ["Hell", "Dunkel"]) {
    await page.goto("/");
    await page.getByRole("radio", { name: modus }).click();
    await expect(page.getByRole("radio", { name: modus })).toHaveAttribute("aria-checked", "true");
    for (const route of routen) await axePruefen(page, route, modus);
  }
});

test("zentrale Navigation ist vollständig per Tastatur erreichbar", async ({ page }) => {
  await anmelden(page);
  await page.goto("/");

  await page.locator("body").press("Tab");
  const sprunglink = page.getByRole("link", { name: "Zum Hauptinhalt springen" });
  await expect(sprunglink).toBeFocused();
  await sprunglink.press("Enter");
  await expect(page.locator("#hauptinhalt")).toBeFocused();

  const hell = page.getByRole("radio", { name: "Hell" });
  const dunkel = page.getByRole("radio", { name: "Dunkel" });
  await hell.click();
  await hell.focus();
  await hell.press("ArrowRight");
  await expect(dunkel).toHaveAttribute("aria-checked", "true");
  await expect(dunkel).toBeFocused();

  const alle = page.getByRole("radio", { name: "Alle" });
  await alle.focus();
  await alle.press("ArrowRight");
  await expect(page).toHaveURL(/filter=offen/);
  await expect(page.getByRole("radio", { name: "Mit offener Wunde" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
});

test("mobile Hauptnavigation ist sichtbar und per Escape schließbar", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await anmelden(page);
  const menue = page.getByRole("button", { name: "Hauptnavigation öffnen" });
  await expect(menue).toBeVisible();
  await menue.click();
  await expect(page.getByRole("menuitem", { name: "Patienten" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Benutzer" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Stammdaten" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Protokoll" })).toBeVisible();
  const axeErgebnis = await new AxeBuilder({ page })
    .exclude("nextjs-portal")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(axeErgebnis.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menuitem", { name: "Patienten" })).toBeHidden();
  await expect(menue).toBeFocused();
});

test("Formulargruppen und Fotodialog halten die Tastaturkonventionen ein", async ({ page }) => {
  await anmelden(page);
  const routen = await anwendungsRouten(page);
  const formularRoute = routen.find((route) => route.endsWith("/aufnahmen/neu"));
  expect(formularRoute).toBeTruthy();
  await page.goto(formularRoute!);

  const gruppen = page.locator('main [role="radiogroup"]');
  expect(await gruppen.count()).toBeGreaterThan(0);
  const ungueltigeTabstopps = await gruppen.evaluateAll((elemente) =>
    elemente
      .map((gruppe) => ({
        bezeichnung:
          gruppe.getAttribute("aria-label") ??
          gruppe.querySelector("legend")?.textContent?.trim() ??
          "Unbenannte Radiogruppe",
        anzahl: Array.from(gruppe.querySelectorAll<HTMLElement>('[role="radio"]')).filter(
          (radio) => radio.tabIndex === 0,
        ).length,
      }))
      .filter(({ anzahl }) => anzahl !== 1),
  );
  expect(ungueltigeTabstopps).toEqual([]);

  const aufnahmeRoute = routen.find((route) => /^\/aufnahmen\/[^/]+$/.test(route));
  expect(aufnahmeRoute).toBeTruthy();
  await page.goto(aufnahmeRoute!);
  const fotoOeffnen = page.getByRole("button", { name: /vergrößern/ }).first();
  if ((await fotoOeffnen.count()) > 0) {
    await fotoOeffnen.click();
    const dialog = page.getByRole("dialog", { name: "Wundfoto vergrößert" });
    await expect(dialog).toBeVisible();
    for (let index = 0; index < 4; index += 1) {
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(fotoOeffnen).toBeFocused();
  }
});

test("interaktive Abmessungen starten bei der neuesten Aufnahme und sind per Tastatur bedienbar", async ({ page }) => {
  await anmelden(page);
  await page.goto("/");
  const patientHref = verlangeHref(
    await page.getByRole("link", { name: /Berger, Hannelore/ }).first().getAttribute("href"),
    "Patientin mit Mehrfachverlauf",
  );
  await page.goto(patientHref);
  const wundeHref = verlangeHref(
    await page.getByRole("link", { name: /Ulcus cruris venosum/ }).first().getAttribute("href"),
    "Wunde mit Mehrfachverlauf",
  );
  await page.goto(wundeHref);

  await page.getByRole("button", { name: /Wundverlauf/ }).click();
  const abmessungen = page.getByRole("region", {
    name: "Interaktive Darstellung der Wundabmessungen",
  });
  await expect(abmessungen).toBeVisible();

  const auswahl = abmessungen.getByRole("group", { name: "Aufnahme auswählen" });
  const slider = auswahl.getByRole("slider", { name: "Aufnahme auswählen" });
  const anzahlTermine = Number(await slider.getAttribute("max"));
  expect(anzahlTermine).toBeGreaterThan(1);
  await expect(auswahl.locator("time")).toHaveCount(3);
  const ausgewaehltesDatum = auswahl.locator("[data-ausgewaehlter-termin]");
  const erstesDatum = await auswahl.locator("time").nth(1).getAttribute("datetime");
  const letztesDatum = await auswahl.locator("time").nth(2).getAttribute("datetime");
  const bilder = abmessungen.getByRole("img");
  const letzteBildtexte = await bilder.evaluateAll(elemente => elemente.map(el => el.getAttribute("aria-label")));
  const letzteMesswerte = await abmessungen.locator("dl").innerText();

  await expect(slider).toHaveValue(String(anzahlTermine));
  await expect(ausgewaehltesDatum).toHaveAttribute("datetime", letztesDatum!);
  await slider.focus();
  await slider.press("Home");
  await expect(slider).toBeFocused();
  await expect(slider).toHaveValue("1");
  await expect(ausgewaehltesDatum).toHaveAttribute("datetime", erstesDatum!);
  for (let i = 0; i < letzteBildtexte.length; i++) {
    await expect(bilder.nth(i)).not.toHaveAttribute("aria-label", letzteBildtexte[i]!);
  }
  await expect(abmessungen.locator("dl")).not.toHaveText(letzteMesswerte);
  await slider.press("ArrowRight");
  await expect(slider).toHaveValue("2");
  await slider.press("End");
  await expect(slider).toHaveValue(String(anzahlTermine));
  await expect(ausgewaehltesDatum).toHaveAttribute("datetime", letztesDatum!);

  // Noch vor dem Loslassen muessen Datum, beide Abbildungen und Werte wechseln.
  await slider.scrollIntoViewIfNeeded();
  const sliderBox = (await slider.boundingBox())!;
  const ziel = Math.ceil(anzahlTermine / 2);
  await page.mouse.move(sliderBox.x + sliderBox.width - 14, sliderBox.y + sliderBox.height / 2);
  await page.mouse.down();
  try {
    await page.mouse.move(sliderBox.x + 14 + (sliderBox.width - 28) * (ziel - 1) / (anzahlTermine - 1), sliderBox.y + sliderBox.height / 2, { steps: 12 });
    await expect(slider).toHaveValue(String(ziel));
    await expect(ausgewaehltesDatum).not.toHaveAttribute("datetime", letztesDatum!);
    for (let i = 0; i < letzteBildtexte.length; i++) {
      await expect(bilder.nth(i)).not.toHaveAttribute("aria-label", letzteBildtexte[i]!);
    }
    await expect(abmessungen.locator("dl")).not.toHaveText(letzteMesswerte);
  } finally {
    await page.mouse.up();
  }
  await expect(slider).toHaveValue(String(ziel));

  const axeErgebnis = await new AxeBuilder({ page })
    .exclude("nextjs-portal")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(axeErgebnis.violations).toEqual([]);
});

test("interaktive Abmessungen bleiben auf iPad Pro und iPad Mini vollständig sichtbar", async ({ page }) => {
  await anmelden(page);
  await page.goto("/");
  const patientHref = verlangeHref(
    await page.getByRole("link", { name: /Berger, Hannelore/ }).first().getAttribute("href"),
    "Patientin mit Mehrfachverlauf",
  );
  await page.goto(patientHref);
  const wundeHref = verlangeHref(
    await page.getByRole("link", { name: /Ulcus cruris venosum/ }).first().getAttribute("href"),
    "Wunde mit Mehrfachverlauf",
  );

  for (const viewport of [
    {
      width: 1024,
      height: 1366,
      farbschema: "Hell",
      wundFarbe: "#be123c",
      tiefenFarbe: "#7c3aed",
      randFarbe: "#94a3b8",
    },
    {
      width: 744,
      height: 1133,
      farbschema: "Dunkel",
      wundFarbe: "#fda4af",
      tiefenFarbe: "#c4b5fd",
      randFarbe: "#4c5c7a",
    },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(wundeHref);
    const farbschema = page.getByRole("radio", { name: viewport.farbschema });
    await farbschema.click();
    await expect(farbschema).toHaveAttribute("aria-checked", "true");
    await page.getByRole("button", { name: /Wundverlauf/ }).click();

    const abmessungen = page.getByRole("region", {
      name: "Interaktive Darstellung der Wundabmessungen",
    });
    await expect(abmessungen).toBeVisible();

    const draufsicht = abmessungen
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Draufsicht" }) });
    const tiefe = abmessungen
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Tiefe" }) });
    const [draufsichtBox, tiefeBox] = await Promise.all([
      draufsicht.boundingBox(),
      tiefe.boundingBox(),
    ]);
    expect(draufsichtBox).not.toBeNull();
    expect(tiefeBox).not.toBeNull();
    expect(Math.abs(draufsichtBox!.y - tiefeBox!.y)).toBeLessThan(2);

    const schemaGruppen = abmessungen.locator("[data-schema-gruppe]");
    const gruppenHoehen = await schemaGruppen.evaluateAll((elemente) =>
      elemente.map((element) => element.getBoundingClientRect().height),
    );
    expect(gruppenHoehen).toHaveLength(2);
    expect(Math.abs(gruppenHoehen[0] - gruppenHoehen[1])).toBeLessThan(1);
    expect(gruppenHoehen[0]).toBeLessThanOrEqual(160);

    const draufsichtFlaeche = abmessungen
      .getByRole("img", { name: /Schematische Wunddraufsicht/ })
      .locator("svg");
    const flaechenBox = await draufsichtFlaeche.boundingBox();
    expect(flaechenBox).not.toBeNull();
    expect(flaechenBox!.height).toBeGreaterThan(120);
    expect(flaechenBox!.height).toBeLessThan(150);
    expect(flaechenBox!.width).toBeGreaterThan(flaechenBox!.height);
    await expect(draufsichtFlaeche.locator("..").getByText(/^Länge \d/)).toHaveCount(0);
    const konturBox = await draufsichtFlaeche.locator("path").evaluate((element) => {
      const box = (element as SVGGraphicsElement).getBBox();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    });
    expect(konturBox.width).toBeGreaterThan(50);
    expect(konturBox.height).toBeGreaterThan(50);
    expect(Math.abs(konturBox.x + konturBox.width / 2 - 140)).toBeLessThan(2);
    expect(Math.abs(konturBox.y + konturBox.height / 2 - 78)).toBeLessThan(2);
    const wundFarbe = await draufsichtFlaeche.locator("[data-wundkontur]").getAttribute("stroke");
    expect(wundFarbe).toBe(viewport.wundFarbe);
    const tiefenProfil = abmessungen.locator("[data-tiefenprofil]");
    const tiefenRand = abmessungen.locator("[data-tiefenrand]");
    expect(await tiefenProfil.getAttribute("stroke")).toBe(viewport.tiefenFarbe);
    expect(await tiefenRand.getAttribute("stroke")).toBe(viewport.randFarbe);

    const auswahl = abmessungen.getByRole("group", { name: "Aufnahme auswählen" });
    await expect(auswahl.getByRole("slider")).toBeVisible();
    await expect(auswahl.locator("time")).toHaveCount(3);
    expect(await auswahl.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    const terminPositionen = await auswahl.locator("[data-termin-markierung]").evaluateAll((elemente) =>
      elemente.map((element) => element.getBoundingClientRect().left),
    );
    const abstand = terminPositionen[1] - terminPositionen[0];
    for (let i = 2; i < terminPositionen.length; i++) {
      expect(Math.abs(terminPositionen[i] - terminPositionen[i - 1] - abstand)).toBeLessThan(1);
    }

    const seitenbreite = await page.evaluate(() => {
      const clientWidth = document.documentElement.clientWidth;
      return {
        clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        ausreisser: Array.from(document.querySelectorAll("*"))
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              tag: element.tagName,
              klasse: element.getAttribute("class"),
              links: Math.round(rect.left),
              rechts: Math.round(rect.right),
              breite: Math.round(rect.width),
            };
          })
          .filter((element) => element.rechts > clientWidth + 1)
          .sort((a, b) => b.rechts - a.rechts)
          .slice(0, 8),
      };
    });
    expect(seitenbreite.scrollWidth, JSON.stringify(seitenbreite, null, 2)).toBeLessThanOrEqual(
      seitenbreite.clientWidth,
    );
  }
});

test("Kennzahl-Kacheln blenden Abmessungen und letzte Termine ein", async ({ page }) => {
  await anmelden(page);
  await page.goto("/");
  const patientHref = verlangeHref(
    await page.getByRole("link", { name: /Berger, Hannelore/ }).first().getAttribute("href"),
    "Patientin mit Mehrfachverlauf",
  );
  await page.goto(patientHref);
  const wundeHref = verlangeHref(
    await page.getByRole("link", { name: /Ulcus cruris venosum/ }).first().getAttribute("href"),
    "Wunde mit Mehrfachverlauf",
  );
  await page.goto(wundeHref);

  // Der aufklappbare Wundverlauf bleibt zu: sonst gaebe es die Abmessungen
  // zweimal auf der Seite und die Rollenabfragen waeren nicht mehr eindeutig.
  const abmessungenKachel = page.getByRole("button", { name: /Seit erster Messung/ });
  const termineKachel = page.getByRole("button", { name: /Dokumentierte Termine/ });
  await expect(abmessungenKachel).toHaveAttribute("aria-expanded", "false");

  await abmessungenKachel.hover();
  await expect(abmessungenKachel).toHaveAttribute("aria-expanded", "true");
  const abmessungen = page.getByRole("region", {
    name: "Interaktive Darstellung der Wundabmessungen",
  });
  const slider = abmessungen.getByRole("slider");
  await expect(slider).toBeVisible();

  // Die Einblendung darf nie unter den Fensterrand rutschen - sonst waeren
  // Zeitstrahl und Messwerte nicht erreichbar.
  const vorschauKasten = (await page.locator(`[id="${await abmessungenKachel.getAttribute("aria-controls")}"]`).boundingBox())!;
  const fenster = page.viewportSize()!;
  expect(vorschauKasten.x).toBeGreaterThanOrEqual(0);
  expect(vorschauKasten.x + vorschauKasten.width).toBeLessThanOrEqual(fenster.width + 1);
  expect(vorschauKasten.y + vorschauKasten.height).toBeLessThanOrEqual(fenster.height + 1);

  const vorherigeMesswerte = await abmessungen.locator("dl").innerText();
  await slider.press("Home");
  await expect(slider).toHaveValue("1");
  await expect(abmessungen.locator("dl")).not.toHaveText(vorherigeMesswerte);
  // Tastaturfokus im Inhalt haelt die Einblendung offen.
  await expect(abmessungenKachel).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(abmessungenKachel).toHaveAttribute("aria-expanded", "false");
  await expect(abmessungenKachel).toBeFocused();

  await termineKachel.hover();
  await expect(termineKachel).toHaveAttribute("aria-expanded", "true");
  const termine = page.locator(`[id="${await termineKachel.getAttribute("aria-controls")}"]`);
  const eintraege = termine.locator('a[href^="/aufnahmen/"]');
  await expect(eintraege).toHaveCount(5);
  await expect(termine).toContainText("5 von 6 Terminen");
  const daten = await eintraege.evaluateAll((elemente) =>
    elemente.map((element) => ({
      datum: element.querySelector("time")!.getAttribute("datetime")!,
      hoehe: element.getBoundingClientRect().height,
    })),
  );
  // Neueste zuerst; jede Zeile bleibt ueber dem 24-px-Mindestziel.
  for (let i = 1; i < daten.length; i++) {
    expect(new Date(daten[i]!.datum).getTime()).toBeLessThanOrEqual(
      new Date(daten[i - 1]!.datum).getTime(),
    );
  }
  for (const eintrag of daten) expect(eintrag.hoehe).toBeGreaterThanOrEqual(24);

  const ziel = verlangeHref(await eintraege.first().getAttribute("href"), "Termineintrag");
  await eintraege.first().click();
  await expect(page).toHaveURL(new RegExp(`${ziel}$`));
});

test("Versorgungspartner lassen sich suchen, auswählen und neu anlegen", async ({ page }) => {
  await anmelden(page);
  await page.goto("/patienten/neu");

  const arztSuche = page.getByLabel("Therapieverantwortlicher Arzt");
  await arztSuche.fill("katharina schneider");
  const arzt = page.getByRole("radio", { name: /Dr\. med\. Katharina Schneider/ });
  await expect(arzt).toBeVisible();
  await expect(page.getByRole("radio", { name: /Dr\. med\. Thomas Berger/ })).toHaveCount(0);
  await arztSuche.press("Enter");
  await expect(page.locator('input[type="hidden"][name="arztId"]')).toHaveValue(
    "seed-doctor-01",
  );
  await expect(page).toHaveURL(/\/patienten\/neu$/);

  const pflegeSuche = page.getByRole("searchbox", { name: "Pflegedienst", exact: true });
  await arztSuche.press("Tab");
  await expect(pflegeSuche).toBeFocused();
  await pflegeSuche.fill("sabine kruger");
  await expect(
    page.getByRole("radio", { name: /Ambulanter Pflegedienst Sonnenschein/ }),
  ).toBeVisible();
  await expect(page.getByRole("radio", { name: "Kein Pflegedienst" })).toHaveCount(0);
  await pflegeSuche.press("Tab");
  await expect(page.locator('input[type="hidden"][name="pflegedienstId"]')).toHaveValue(
    "seed-care-service-01",
  );
  await expect(page.getByLabel("Notizen")).toBeFocused();

  const implizitesAbsenden = page
    .waitForRequest((anfrage) => anfrage.method() === "POST", { timeout: 750 })
    .then(() => true)
    .catch(() => false);
  await page.getByLabel("Nachname").press("Enter");
  expect(await implizitesAbsenden).toBe(false);

  await expect(page.getByRole("button", { name: "Neuen Arzt anlegen" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Neuen Pflegedienst anlegen" })).toBeVisible();

  const routen = await anwendungsRouten(page);
  const wundeNeu = routen.find((route) => route.endsWith("/wunden/neu"));
  expect(wundeNeu).toBeTruthy();
  await page.goto(wundeNeu!);
  await expect(page.getByRole("button", { name: "Neuen Arzt anlegen" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Neuen Pflegedienst anlegen" })).toBeVisible();
  const wundeArztSuche = page.getByRole("searchbox", {
    name: "Behandelnder Arzt (optional)",
  });
  await wundeArztSuche.fill("katharina schneider");
  await expect(page.getByRole("radio", { name: "Kein behandelnder Arzt" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Marker auf Körperkarte" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  const wundeBearbeiten = routen.find((route) => /^\/wunden\/[^/]+\/bearbeiten$/.test(route));
  expect(wundeBearbeiten).toBeTruthy();
  await page.goto(wundeBearbeiten!);
  const gespeicherterModus = await page
    .locator('input[type="hidden"][name="lokalisationModus"]')
    .inputValue();
  await expect(
    page.getByRole("button", {
      name: gespeicherterModus === "FREIHAND" ? "Frei einzeichnen" : "Marker auf Körperkarte",
    }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("Navigation warnt nur bei tatsächlich ungespeicherten Änderungen", async ({ page }) => {
  await anmelden(page);
  const routen = await anwendungsRouten(page);
  const patientBearbeiten = routen.find((route) => /^\/patienten\/[^/]+\/bearbeiten$/.test(route));
  expect(patientBearbeiten).toBeTruthy();
  await page.goto(patientBearbeiten!);

  const formular = page.locator('form[data-aenderungen-warnung="patient"]');
  await expect(formular).toBeVisible();
  const nachname = page.getByLabel("Nachname");
  const ausgangswert = await nachname.inputValue();
  await nachname.fill(`${ausgangswert} geändert`);
  await expect
    .poll(() => page.locator("html").getAttribute("data-ungespeicherte-aenderungen"))
    .toBe("true");

  const stammdaten = page.getByRole("link", { name: "Stammdaten", exact: true });
  const dialogErwartet = page.waitForEvent("dialog");
  const navigation = stammdaten.click();
  const dialog = await dialogErwartet;
  expect(dialog.message()).toContain("ungespeicherte Änderungen");
  await dialog.dismiss();
  await navigation;
  await expect(page).toHaveURL(new RegExp(`${patientBearbeiten!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
  await expect(nachname).toHaveValue(`${ausgangswert} geändert`);

  await nachname.fill(ausgangswert);
  await expect
    .poll(() => page.locator("html").getAttribute("data-ungespeicherte-aenderungen"))
    .toBe("false");
  let unerwarteterDialog = false;
  page.once("dialog", async (offenerDialog) => {
    unerwarteterDialog = true;
    await offenerDialog.dismiss();
  });
  await stammdaten.click();
  await expect(page).toHaveURL(/\/einstellungen\/stammdaten$/);
  expect(unerwarteterDialog).toBe(false);

  for (const route of routen.filter((route) => /\/(wunden|aufnahmen)\/[^/]+\/bearbeiten$/.test(route))) {
    await page.goto(route);
    await expect(page.locator("form[data-aenderungen-warnung]")).toBeVisible();
  }
});

test("abgeschlossene Wunden sind als abgeheilt erkennbar", async ({ page }) => {
  await anmelden(page);
  await page.goto("/");
  const patientHref = verlangeHref(
    await page.getByRole("link", { name: /Kowalski, Josef/ }).first().getAttribute("href"),
    "Patient mit abgeschlossener Wunde",
  );
  await page.goto(patientHref);

  // Abgeschlossene Wunden stehen in einem eigenen Aufklapper, nicht in der
  // Liste der offenen.
  const aufklapper = page.locator("main details").filter({ hasText: /abgeschlossene Wunde/ });
  await expect(aufklapper).toBeVisible();
  await aufklapper.locator("summary").click();

  const karte = aufklapper.locator('a[href^="/wunden/"]').first();
  await expect(karte).toContainText("Abgeschlossen");
  // Gruene Flaeche - Farbe steht hier nie allein, das Abzeichen oben gehoert dazu.
  const hintergrund = await karte
    .locator("div")
    .first()
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  const offeneKarte = page.locator('main ul > li a[href^="/wunden/"]').first();
  const hintergrundOffen = await offeneKarte
    .locator("div")
    .first()
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(hintergrund).not.toBe(hintergrundOffen);

  const wundeHref = verlangeHref(await karte.getAttribute("href"), "Abgeschlossene Wunde");
  await page.goto(wundeHref);
  await expect(page.getByText(/Abgeschlossen am/)).toBeVisible();
  const wiedereroeffnen = page.getByRole("button", { name: "Wunde wieder eröffnen" });
  await expect(wiedereroeffnen).toBeVisible();

  // Die abgeheilte Aufnahme: 0 als Messwert ergibt 0 mm^2, keinen Gedankenstrich.
  const abgeheilt = page.locator('main ol > li').filter({ hasText: "Abgeheilt" }).first();
  await expect(abgeheilt).toBeVisible();
  await expect(abgeheilt).toContainText("0 mm²");
  await abgeheilt.locator('a[href^="/aufnahmen/"]').click();
  await expect(page.getByText("In dieser Aufnahme als abgeheilt festgestellt")).toBeVisible();

  // Das Feld steht nur in Folgeaufnahmen und schaltet den versteckten Wert um.
  await page.goto(`${wundeHref}/aufnahmen/neu`);
  const abschluss = page.getByRole("navigation", { name: "Abschnitte" }).getByRole("link", {
    name: "Abschluss",
    exact: true,
  });
  await expect(abschluss).toBeVisible();
  const gruppe = page.getByRole("radiogroup", { name: "Wunde ist abgeheilt?", exact: true });
  await expect(page.locator('input[type="hidden"][name="wundeGeheilt"]')).toHaveValue("nein");
  await gruppe.getByRole("radio", { name: "Ja", exact: true }).click();
  await expect(page.locator('input[type="hidden"][name="wundeGeheilt"]')).toHaveValue("ja");
  await expect(page.getByText(/Beim Speichern wird die Wunde als abgeschlossen markiert/)).toBeVisible();

  const axeErgebnis = await new AxeBuilder({ page })
    .exclude("nextjs-portal")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(axeErgebnis.violations).toEqual([]);
});
