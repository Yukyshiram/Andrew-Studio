import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./tests/e2e",
    outputDir: "./output/playwright/results",
    timeout: 45_000,
    expect: { timeout: 12_000 },
    fullyParallel: false,
    workers: 1,
    retries: 0,
    reporter: [
        ["list"],
        ["html", { outputFolder: "output/playwright/report", open: "never" }],
        [
            "json",
            {
                outputFile:
                    process.env.E2E_RESULTS_FILE ||
                    "output/playwright/results.json",
            },
        ],
    ],
    use: {
        baseURL: process.env.E2E_BASE_URL || "http://localhost:8082",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        reducedMotion: "reduce",
        locale: "es-MX",
    },
    projects: [
        {
            name: "chromium",
            use: {
                ...devices["Desktop Chrome"],
                viewport: { width: 1440, height: 1000 },
            },
        },
        ...(process.env.E2E_ALL_BROWSERS === "1"
            ? [
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
              ]
            : []),
    ],
});
