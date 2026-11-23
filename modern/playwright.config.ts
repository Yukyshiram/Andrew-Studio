import { defineConfig, devices } from "@playwright/test";

const qaBaseURL = process.env.E2E_BASE_URL || "http://localhost:8082";
const qaURL = new URL(qaBaseURL);
if (
    qaURL.protocol !== "http:" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(qaURL.hostname) ||
    qaURL.port !== "8082" ||
    qaURL.username ||
    qaURL.password ||
    qaURL.pathname !== "/" ||
    qaURL.search ||
    qaURL.hash
) {
    throw new Error(
        "Las pruebas que escriben datos solo admiten el servidor local de QA en el puerto 8082. No se abrió ningún navegador.",
    );
}

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
        baseURL: qaBaseURL,
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
