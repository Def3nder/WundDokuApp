import { defineConfig } from "@playwright/test";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  reporter: "list",
  use: {
    baseURL,
    browserName: "chromium",
    channel: "chrome",
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
