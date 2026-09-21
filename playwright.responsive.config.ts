import { defineConfig, devices } from "@playwright/test";
import basis from "./playwright.config";

// Gleiche CSS-Breite mit Touch/DPR und der passenden Browserengine pruefen.
// WEBKIT_EXECUTABLE_PATH erlaubt auch eine bereits installierte Testengine.
const webkit = {
  ...devices["iPad Pro 11"],
  channel: undefined,
  browserName: "webkit" as const,
  launchOptions: process.env.WEBKIT_EXECUTABLE_PATH
    ? { executablePath: process.env.WEBKIT_EXECUTABLE_PATH }
    : undefined,
};

export default defineConfig({
  ...basis,
  use: { ...basis.use, channel: undefined, actionTimeout: 15_000, navigationTimeout: 30_000 },
  testMatch: "responsive.spec.ts",
  timeout: 180_000,
  outputDir: "test-results/responsive",
  projects: [
    { name: "Desktop", use: { channel: "chrome", viewport: { width: 1440, height: 900 } } },
    { name: "Notebook", use: { channel: "chrome", viewport: { width: 1280, height: 800 } } },
    { name: "Schmal-320", use: { channel: "chrome", viewport: { width: 320, height: 740 }, hasTouch: true, isMobile: true } },
    { name: "Android-Tablet", use: { channel: "chrome", viewport: { width: 800, height: 1280 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } },
    { name: "Android-Tablet-quer", use: { channel: "chrome", viewport: { width: 1280, height: 800 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } },
    { name: "iPhone", use: { ...webkit, ...devices["iPhone 13"], viewport: { width: 390, height: 844 } } },
    { name: "iPhone-quer", use: { ...webkit, ...devices["iPhone 13"], viewport: { width: 844, height: 390 } } },
    { name: "iPad-mini", use: { ...webkit, viewport: { width: 744, height: 1133 } } },
    { name: "iPad-mini-quer", use: { ...webkit, viewport: { width: 1133, height: 744 } } },
    { name: "iPad-768", use: { ...webkit, viewport: { width: 768, height: 1024 } } },
    { name: "iPad-Pro-11", use: { ...webkit, viewport: { width: 834, height: 1194 } } },
    { name: "iPad-Pro-13", use: { ...webkit, viewport: { width: 1024, height: 1366 } } },
    { name: "iPad-Pro-13-quer", use: { ...webkit, viewport: { width: 1366, height: 1024 } } },
    { name: "iPad-Split-View", use: { ...webkit, viewport: { width: 507, height: 1024 } } },
  ],
});
