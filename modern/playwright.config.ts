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
        ["json", { outputFile: "output/playwright/results.json" }],
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
    ],
});
