import { defineConfig } from "@playwright/test";
import path from "node:path";

export default defineConfig({
  testDir: "./tests",
  testMatch: "zeiterfassung.spec.ts",
  outputDir: "test-results/zeiterfassung",
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:3101", browserName: "chromium", channel: "chrome", headless: true, trace: "retain-on-failure" },
  webServer: {
    command: "node node_modules/next/dist/bin/next start --port 3101 --hostname 127.0.0.1",
    url: "http://127.0.0.1:3101",
    reuseExistingServer: false,
    timeout: 120_000,
    env: { DATABASE_URL: `file:${path.resolve("test-results/arbeitszeit-e2e.db").replaceAll("\\", "/")}`, AUTH_SECRET: "lokaler-isolierter-zeiterfassungs-browsertest-2026", AUTH_URL: "http://127.0.0.1:3101" },
  },
});
