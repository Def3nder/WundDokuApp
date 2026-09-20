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
