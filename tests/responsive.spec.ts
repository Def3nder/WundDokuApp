import { expect, test, type Page } from "@playwright/test";

const browserFehler = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const fehler: string[] = [];
  browserFehler.set(page, fehler);
  page.on("pageerror", (error) => fehler.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /hydrat/i.test(message.text())) fehler.push(message.text());
  });
});
test.afterEach(({ page }) => {
  expect(browserFehler.get(page), "Keine Laufzeit- oder Hydrationsfehler").toEqual([]);
});

async function anmelden(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(process.env.SEED_ADMIN_EMAIL ?? "admin@praxis.local");
  await page.getByLabel("Passwort").fill(process.env.SEED_ADMIN_PASSWORD ?? "WundDoku!2026");
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Patienten", exact: true })).toBeVisible();
  await page.waitForLoadState("networkidle");
}

async function routen(page: Page) {
  // Derselbe dokumentierte Seed-Verlauf wie in accessibility.spec.ts; keine
  // Annahme, dass die erste Wunde auch Aufnahmen/Fotos hat. Keine DB-Schreibzugriffe.
  const patient = await page.getByRole("link", { name: /Berger, Hannelore/ }).first().getAttribute("href");
  expect(patient, "Testpatient fehlt (npm run db:seed)").toBeTruthy();
  await page.goto(patient!);
  const wunde = await page.getByRole("link", { name: /Ulcus cruris venosum/ }).first().getAttribute("href");
  expect(wunde).toBeTruthy();
  await page.goto(wunde!);
  const aufnahme = await page.locator('main a[href^="/aufnahmen/"]').first().getAttribute("href");
  expect(aufnahme).toBeTruthy();
  return { patient: patient!, wunde: wunde!, aufnahme: aufnahme! };
}

async function layoutPruefen(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  const fehler = await page.evaluate(() => {
    const breite = document.documentElement.clientWidth;
    const probleme: string[] = [];
    if (document.documentElement.scrollWidth > breite + 1) probleme.push(`Seite scrollt horizontal: ${document.documentElement.scrollWidth} > ${breite}`);
    for (const el of document.querySelectorAll<HTMLElement>("main *, header *")) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || el.closest('.sr-only, .nur-screenreader, [hidden]')) continue;
      if (r.left >= -1 && r.right <= breite + 1) continue;
      let parent = el.parentElement;
      let lokalerScrollbereich = false;
      while (parent && parent !== document.body) {
        if (["auto", "scroll", "hidden", "clip"].includes(getComputedStyle(parent).overflowX)) {
          lokalerScrollbereich = true;
          break;
        }
        parent = parent.parentElement;
      }
      if (!lokalerScrollbereich) probleme.push(`Rand überschritten: ${el.tagName}#${el.id}`);
    }
    for (const el of document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('main input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), main select, main textarea')) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (parseFloat(getComputedStyle(el).fontSize) < 16) probleme.push(`Zu kleine Feldschrift: ${el.id}`);
      if (r.height < 43) probleme.push(`Zu niedriges Feld: ${el.id} (${r.height})`);
      if (!["textarea", "range"].includes(el.type) && r.height > 45) probleme.push(`Abweichende Feldhöhe: ${el.id} (${r.height})`);
    }
    return probleme;
  });
  expect(fehler, page.url()).toEqual([]);
}

test("alle Ansichten bleiben lesbar und innerhalb des Bildschirms", async ({ page }, testInfo) => {
  await anmelden(page);
  const { patient, wunde, aufnahme } = await routen(page);
  const seiten = {
    patienten: "/", leerzustand: "/?q=kein-treffer-responsive", "patient-neu": "/patienten/neu",
    patient, "patient-bearbeiten": `${patient}/bearbeiten`, "wunde-neu": `${patient}/wunden/neu`,
    rezepte: `${patient}/dokumente?typ=REZEPT`, arztbriefe: `${patient}/dokumente?typ=ARZTBRIEF`,
    "rezept-neu": `${patient}/dokumente/neu?typ=REZEPT`, "arztbrief-neu": `${patient}/dokumente/neu?typ=ARZTBRIEF`,
    wunde, "wunde-bearbeiten": `${wunde}/bearbeiten`, "aufnahme-neu": `${wunde}/aufnahmen/neu`,
    vergleich: `${wunde}/vergleich`, aufnahme, "aufnahme-bearbeiten": `${aufnahme}/bearbeiten`,
    benutzer: "/einstellungen/benutzer", "benutzer-neu": "/einstellungen/benutzer/neu",
    stammdaten: "/einstellungen/stammdaten", protokoll: "/einstellungen/audit-log",
  };
  for (const [name, url] of Object.entries(seiten)) {
    await test.step(name, async () => {
      await page.goto(url);
      await expect(page.locator("h1")).toHaveCount(1);
      await layoutPruefen(page);
      if (["patient", "patient-bearbeiten", "wunde", "vergleich"].includes(name)) {
        await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true, caret: "initial" });
      }
    });
  }
});

test("Diagramme, Dialoge und lange Formulare passen auch bei Touch und Drehung", async ({ page }, testInfo) => {
  await anmelden(page);
  const { patient, wunde, aufnahme } = await routen(page);
  await page.goto(wunde);
  await page.getByRole("button", { name: /Wundverlauf/ }).click();
  await expect(page.getByRole("region", { name: "Interaktive Darstellung der Wundabmessungen" })).toBeVisible();
  await layoutPruefen(page);
  const flaeche = page.getByText("Aktuelle Fläche", { exact: true });
  if (await page.evaluate(() => matchMedia("(hover: hover) and (pointer: fine)").matches)) await flaeche.hover();
  else await flaeche.click();
  const vorschau = page.locator('.pointer-events-none .recharts-wrapper');
  await expect(vorschau).toBeVisible();
  const box = await vorschau.boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({ path: testInfo.outputPath("diagramme.png"), fullPage: true, caret: "initial" });

  await page.goto(`${patient}/dokumente?typ=REZEPT`);
  const dokument = page.locator("main li button").filter({ hasNot: page.locator('svg.lucide-trash-2') }).first();
  if (await dokument.count()) {
    await dokument.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "An Fenster anpassen" })).toBeVisible();
    const vorher = page.viewportSize()!;
    await page.setViewportSize({ width: vorher.height, height: vorher.width });
    await expect.poll(async () => {
      const r = await dialog.boundingBox();
      return !!r && r.x >= 0 && r.y >= 0 && r.x + r.width <= vorher.height + 1 && r.y + r.height <= vorher.width + 1;
    }).toBe(true);
    await dialog.getByRole("button", { name: "An Fenster anpassen" }).click();
    const inhalt = dialog.locator('.react-transform-component canvas, .react-transform-component img').first();
    await expect(inhalt).toBeVisible();
    await expect.poll(async () => {
      const bild = await inhalt.boundingBox();
      const rahmen = await dialog.locator('.react-transform-wrapper').boundingBox();
      return bild && rahmen ? Math.abs(bild.x + bild.width / 2 - rahmen.x - rahmen.width / 2) : Infinity;
    }).toBeLessThan(2);
    await page.screenshot({ path: testInfo.outputPath("dokument-gedreht.png"), caret: "initial" });
    await page.keyboard.press("Escape");
    await expect(dokument).toBeFocused();
    await page.setViewportSize(vorher);
  }

  await page.goto(aufnahme);
  const foto = page.getByRole("button", { name: /vergrößern/ }).first();
  if (await foto.count()) {
    await foto.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("foto.png"), caret: "initial" });
    await page.keyboard.press("Escape");
    await expect(foto).toBeFocused();
  }

  // Nur die Korrekturansicht veraendern: Sie legt keinen Autosave-Entwurf an.
  await page.goto(`${aufnahme}/bearbeiten`);
  const geschlossene = page.locator('main section > h2 > button[aria-expanded="false"]');
  while (await geschlossene.count()) await geschlossene.first().click();
  const schmerzen = page.getByRole("radiogroup", { name: "Schmerzen vorhanden?", exact: true });
  const schmerzenJa = schmerzen.getByRole("radio", { name: "Ja", exact: true });
  if (await schmerzenJa.getAttribute("aria-checked") !== "true") await schmerzenJa.click();
  for (const name of ["Beim Verbandwechsel?", "Bei Druck?", "Überall im Wundbereich?"]) {
    const ja = page.getByRole("radiogroup", { name, exact: true }).getByRole("radio", { name: "Ja", exact: true });
    if (await ja.getAttribute("aria-checked") !== "true") await ja.click();
  }
  await layoutPruefen(page);
  const zuKleineVasWerte = await page.locator('.vas-values button').evaluateAll(elements => elements.filter(el => {
    const r = el.getBoundingClientRect();
    return r.width < 43 || r.height < 43;
  }).length);
  expect(zuKleineVasWerte).toBe(0);
  await page.getByRole("navigation", { name: "Abschnitte" }).getByRole("link", { name: "Schmerz", exact: true }).click();
  const position = await page.evaluate(() => ({
    navigation: document.querySelector('nav[aria-label="Abschnitte"]')!.getBoundingClientRect().bottom,
    abschnitt: document.querySelectorAll('main form section')[3].getBoundingClientRect().top,
  }));
  expect(position.abschnitt).toBeGreaterThanOrEqual(position.navigation - 1);
  await page.screenshot({ path: testInfo.outputPath("schmerz.png"), caret: "initial" });
});
