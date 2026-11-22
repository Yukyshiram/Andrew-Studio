import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
const port = process.env.DEMO_E2E_PORT || "4174";
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: "./tests",
  outputDir: "./output/test-results",
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "./output/results.json" }]],
  use: {
    baseURL,
    locale: "es-MX",
    trace: "retain-on-failure",
    reducedMotion: "no-preference",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
  webServer: {
    cwd: path.resolve(import.meta.dirname, ".."),
    command: `node node_modules/vite/bin/vite.js preview --config demo/vite.config.ts --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
