import { expect, test, webkit, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function anmelden(page: Page, name = "anna") {
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(`${name}@zeittest.example`);
  await page.getByLabel("Passwort").fill("Zeittest!2026");
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/zeiterfassung?ansicht=monat&datum=2026-09-01");
  await expect(page.getByRole("heading", { name: "Meine Zeiterfassung", exact: true })).toBeVisible();
}

test("konfiguriert Tageszeiten und Wochenstunden, bucht, korrigiert, verhindert Konflikte und loescht", async ({ page }) => {
  await anmelden(page);
  await page.getByRole("link", { name: "Arbeitszeit-Einstellungen" }).click();
  await page.getByRole("button", { name: "Neue Vorgabe" }).click();
  await page.getByLabel("Gültig ab", { exact: true }).fill("2026-09-01");
  await page.getByLabel("Standard-Arbeitsbeginn", { exact: true }).fill("07:30");
  await page.getByLabel("Standard-Arbeitsende", { exact: true }).fill("16:00");
  await page.getByLabel("Standardpause (Minuten)", { exact: true }).fill("30");
  await page.getByLabel("Wochenarbeitszeit (Stunden)", { exact: true }).fill("37.5");
  await page.getByRole("button", { name: "Vorgaben speichern" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByText("37:30 h", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Vorgabe ab 01.09.2026 bearbeiten" }).click();
  await expect(page.getByLabel("Standard-Arbeitsbeginn", { exact: true })).toHaveValue("07:30");
  await page.getByLabel("Wochenarbeitszeit (Stunden)", { exact: true }).fill("40");
  await page.getByRole("button", { name: "Vorgaben speichern" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.goto("/zeiterfassung?ansicht=monat&datum=2026-09-01");
  await page.getByRole("button", { name: "Zeit nachtragen", exact: true }).click();
  await expect(page.locator("#beginn-zeit")).toHaveValue("07:30");
  await expect(page.locator("#ende-zeit")).toHaveValue("16:00");
  await page.locator("#beginn-datum").fill("2026-09-01");
  await page.locator("#ende-datum").fill("2026-09-01");
  await page.getByLabel("Notiz (optional)").fill("Browsertest Tagesbuchung");
  await page.getByRole("button", { name: "Zeiteintrag speichern" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  const buchungen = page.locator("section").filter({ has: page.getByRole("heading", { name: /^Buchungen im Zeitraum/ }) });
  await expect(buchungen.getByText("8:00 h netto · 30 Min. Pause")).toBeVisible();
  await buchungen.getByRole("button", { name: /^Zeiteintrag bearbeiten/ }).click();
  await page.locator("#ende-zeit").fill("07:00");
  await page.getByRole("button", { name: "Zeiteintrag speichern" }).click();
  await expect(page.getByText("Das Ende muss nach dem Beginn liegen")).toBeVisible();
  await expect(page.getByLabel("Notiz (optional)")).toHaveValue("Browsertest Tagesbuchung");
  await page.locator("#ende-zeit").fill("16:30");
  await page.getByRole("button", { name: "Zeiteintrag speichern" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(buchungen.getByText("8:30 h netto · 30 Min. Pause")).toBeVisible();
  await page.getByRole("button", { name: "Zeit nachtragen", exact: true }).click();
  await page.locator("#beginn-datum").fill("2026-09-01");
  await page.locator("#ende-datum").fill("2026-09-01");
  await page.getByRole("button", { name: "Zeiteintrag speichern" }).click();
  await expect(page.getByRole("alert")).toContainText("überschneidet");
  await page.getByRole("button", { name: "Dialog schließen" }).click();
  await page.getByRole("button", { name: "Einstempeln", exact: true }).click();
  await page.locator("#beginn-datum").fill("2026-09-02");
  await page.locator("#beginn-zeit").fill("08:00");
  await page.getByRole("button", { name: "Einstempeln speichern" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByText("Stechuhr läuft", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Stechuhr läuft", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Ausstempeln", exact: true }).click();
  await page.locator("#ende-datum").fill("2026-09-02");
  await page.locator("#ende-zeit").fill("16:30");
  await page.getByRole("button", { name: "Ausstempeln speichern" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("heading", { name: "Buchungen im Zeitraum (2)" })).toBeVisible();
  await page.getByRole("link", { name: "Woche", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Buchungen im Zeitraum (2)" })).toBeVisible();
  await buchungen.getByRole("button", { name: /^Zeiteintrag löschen/ }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Zeiteintrag löschen", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("heading", { name: "Buchungen im Zeitraum (1)" })).toBeVisible();
});

test("zeigt anderen Nutzern weder Zeiten noch persoenliche Vorgaben", async ({ page }) => {
  await anmelden(page, "ben");
  await expect(page.getByRole("heading", { name: "Buchungen im Zeitraum (0)" })).toBeVisible();
  await page.getByRole("link", { name: "Arbeitszeit-Einstellungen" }).click();
  await expect(page.getByText("Noch keine eigenen Vorgaben gespeichert.")).toBeVisible();
  await expect(page.getByText("08:00–16:30 Uhr", { exact: true })).toBeVisible();
});

for (const dunkel of [false, true]) test(`barrierefrei und ohne Ueberlauf, ${dunkel ? "dunkel" : "hell"}`, async ({ page }) => {
  await page.addInitScript((theme) => localStorage.setItem("theme", theme), dunkel ? "dark" : "light");
  await anmelden(page);
  for (const breite of [320, 375, 768, 1280, 1440]) {
    await page.setViewportSize({ width: breite, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: `test-results/zeiterfassung-${dunkel ? "dunkel" : "hell"}.png`, fullPage: true });
  await page.setViewportSize({ width: 320, height: 760 });
  await page.getByRole("button", { name: "Zeit nachtragen", exact: true }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  const dialog = page.getByRole("dialog");
  expect(await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: `test-results/zeiterfassung-dialog-${dunkel ? "dunkel" : "hell"}.png` });
  await page.getByRole("button", { name: "Dialog schließen" }).click();
  await page.getByRole("link", { name: "Arbeitszeit-Einstellungen" }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Neue Vorgabe" }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.getByRole("dialog").evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
});

test("Administrator-Navigation passt bei allen Bildschirmbreiten", async ({ page }) => {
  await anmelden(page, "admin");
  for (const width of [320, 768, 1279, 1280, 1366, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Seitenbreite ${width}`).toBe(true);
    const header = page.locator("header");
    expect(await header.evaluate((e) => e.scrollWidth <= e.clientWidth + 1), `Kopfzeile ${width}`).toBe(true);
  }
});

test("iPad und iPhone: Datumsfelder, Dialoge und Touch-Navigation in WebKit", async () => {
  const browser = await webkit.launch({ executablePath: process.env.WEBKIT_EXECUTABLE_PATH });
  try {
    const context = await browser.newContext({ baseURL: "http://127.0.0.1:3101", viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await anmelden(page, "ben");
    for (const breite of [390, 768, 1024]) {
      await page.setViewportSize({ width: breite, height: 1024 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.getByRole("button", { name: "Einstempeln", exact: true }).click();
      await expect(page.locator("#beginn-zeit")).not.toHaveValue("");
      const [datumsfeld, zeitfeld] = await Promise.all([
        page.locator("#beginn-datum").boundingBox(),
        page.locator("#beginn-zeit").boundingBox(),
      ]);
      expect(datumsfeld).not.toBeNull();
      expect(zeitfeld).not.toBeNull();
      expect(Math.abs(datumsfeld!.y - zeitfeld!.y), `Oberkante bei ${breite}px`).toBeLessThanOrEqual(1);
      expect(Math.abs(datumsfeld!.height - zeitfeld!.height), `Höhe bei ${breite}px`).toBeLessThanOrEqual(1);
      expect(await page.getByRole("dialog").evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
      await page.getByRole("button", { name: "Dialog schließen" }).click();
    }
    await page.getByRole("link", { name: "Arbeitszeit-Einstellungen" }).click();
    await page.getByRole("button", { name: "Neue Vorgabe" }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.getByRole("dialog").evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: "test-results/zeiterfassung-webkit-einstellungen.png" });
    await context.close();
  } finally { await browser.close(); }
});

test("stempelt und traegt ohne Verbindung nach, uebertraegt spaeter und legt Konflikte zur Pruefung vor", async ({ page, context, browser }) => {
  // Der Administrator ist hier nur ein Konto ohne Buchungen; andere Tests bleiben unberuehrt.
  await anmelden(page, "admin");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  // Erst wenn Seite und Programmdateien auf dem Geraet liegen, ist Offline-Betrieb moeglich.
  await expect.poll(() => page.evaluate(async () => {
    const seiten = await (await caches.open("wunddoku-seiten-v1")).keys();
    const statisch = await (await caches.open("wunddoku-statisch-v1")).keys();
    return seiten.length > 0 && statisch.length > 5;
  }), { timeout: 30_000 }).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Meine Zeiterfassung", exact: true })).toBeVisible();
  await expect(page.getByText("Keine Verbindung zum Server.")).toBeVisible();

  // Nachtrag ohne Verbindung
  await page.getByRole("button", { name: "Zeit nachtragen", exact: true }).click();
  await page.locator("#beginn-datum").fill("2026-09-10");
  await page.locator("#ende-datum").fill("2026-09-10");
  await page.getByLabel("Notiz (optional)").fill("Offline nachgetragen");
  await page.getByRole("button", { name: "Zeiteintrag speichern" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("heading", { name: "Noch nicht übertragen (1)" })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  // Ueberschneidung wird schon auf dem Geraet erkannt
  await page.getByRole("button", { name: "Zeit nachtragen", exact: true }).click();
  await page.locator("#beginn-datum").fill("2026-09-10");
  await page.locator("#ende-datum").fill("2026-09-10");
  await page.getByRole("button", { name: "Zeiteintrag speichern" }).click();
  await expect(page.getByRole("alert")).toContainText("überschneidet");
  await page.getByRole("button", { name: "Dialog schließen" }).click();

  // Einstempeln und Ausstempeln ohne Verbindung ergibt eine einzige wartende Buchung
  await page.getByRole("button", { name: "Einstempeln", exact: true }).click();
  await page.locator("#beginn-datum").fill("2026-09-11");
  await page.locator("#beginn-zeit").fill("08:00");
  await page.getByRole("button", { name: "Einstempeln speichern" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByText("Stechuhr läuft", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Stechuhr läuft", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Noch nicht übertragen (2)" })).toBeVisible();
  await page.getByRole("button", { name: "Ausstempeln", exact: true }).click();
  await page.locator("#ende-datum").fill("2026-09-11");
  await page.locator("#ende-zeit").fill("12:00");
  await page.getByRole("button", { name: "Ausstempeln speichern" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByText("Stechuhr läuft", { exact: true })).toBeHidden();
  await expect(page.getByRole("heading", { name: "Noch nicht übertragen (2)" })).toBeVisible();

  // Ein anderes Geraet bucht inzwischen online einen Zeitraum, den dieses Geraet nicht kennt
  const anderes = await browser.newContext({ baseURL: "http://127.0.0.1:3101" });
  const zweiteSeite = await anderes.newPage();
  await anmelden(zweiteSeite, "admin");
  await zweiteSeite.getByRole("button", { name: "Zeit nachtragen", exact: true }).click();
  await zweiteSeite.locator("#beginn-datum").fill("2026-09-12");
  await zweiteSeite.locator("#ende-datum").fill("2026-09-12");
  await zweiteSeite.getByRole("button", { name: "Zeiteintrag speichern" }).click();
  await expect(zweiteSeite.getByRole("dialog")).toBeHidden();
  await anderes.close();
  await page.getByRole("button", { name: "Zeit nachtragen", exact: true }).click();
  await page.locator("#beginn-datum").fill("2026-09-12");
  await page.locator("#beginn-zeit").fill("09:00");
  await page.locator("#ende-datum").fill("2026-09-12");
  await page.locator("#ende-zeit").fill("11:00");
  await page.getByRole("button", { name: "Zeiteintrag speichern" }).click();
  await expect(page.getByRole("heading", { name: "Noch nicht übertragen (3)" })).toBeVisible();

  // Verbindung kehrt zurueck: zwei Buchungen werden uebernommen, die kollidierende bleibt zur Pruefung
  await context.setOffline(false);
  await expect(page.getByRole("heading", { name: "Noch nicht übertragen (1)" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Zu prüfen: .*überschneidet/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Buchungen im Zeitraum (3)" })).toBeVisible();
  await expect(page.getByText("Keine Verbindung zum Server.")).toBeHidden();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Noch nicht übertragen (1)" })).toBeVisible();
  await page.getByRole("button", { name: /^Buchung verwerfen/ }).click();
  await expect(page.getByRole("heading", { name: /^Noch nicht übertragen/ })).toBeHidden();
});
