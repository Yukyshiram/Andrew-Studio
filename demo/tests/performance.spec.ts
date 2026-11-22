import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

type Metrics = {
  lcpMs: number | null;
  cls: number;
  longTasks: number;
  longTaskMs: number;
  unsupported: string[];
};
type Sample = {
  profile: string;
  viewport: { width: number; height: number };
  repetition: number;
  freeMemoryBytes: number;
  initial: Metrics & {
    ttfbMs: number;
    transferBytes: number;
    javascriptTransferBytes: number;
    resources: { path: string; transferBytes: number; encodedBytes: number }[];
  };
  interaction: {
    durationMs: number;
    clsDelta: number;
    longTasks: number;
    longTaskMs: number;
    scriptDurationSeconds: number | null;
    layoutDurationSeconds: number | null;
    taskDurationSeconds: number | null;
  };
};
const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

test("medición estática reproducible: carga fría, catálogo y apertura CSS", async ({
  browser,
  browserName,
  baseURL,
}) => {
  test.skip(
    browserName !== "chromium",
    "PerformanceObserver y CDP se comparan en Chromium; los recorridos funcionales cubren los tres motores.",
  );
  test.setTimeout(180_000);
  const profiles = [
    {
      name: "desktop",
      viewport: { width: 1440, height: 1000 },
      isMobile: false,
      hasTouch: false,
    },
    {
      name: "mobile-emulation",
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    },
  ];
  const samples: Sample[] = [];
  for (const profile of profiles) {
    for (let repetition = 1; repetition <= 3; repetition++) {
      const context = await browser.newContext({
        baseURL,
        viewport: profile.viewport,
        isMobile: profile.isMobile,
        hasTouch: profile.hasTouch,
        deviceScaleFactor: 1,
        locale: "es-MX",
        reducedMotion: "no-preference",
      });
      const page = await context.newPage();
      const errors: string[] = [];
      const forbidden: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      page.on("request", (request) => {
        const url = new URL(request.url());
        if (
          url.origin !== new URL(baseURL!).origin ||
          /\.php|\/api\/|localhost:808|collection-scene|\/three[\/.]/i.test(
            url.href,
          )
        )
          forbidden.push(url.href);
      });
      try {
        const cdp = await context.newCDPSession(page);
        await cdp.send("Network.enable");
        await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
        await cdp.send("Performance.enable");
        await page.addInitScript(() => {
          const metrics: Metrics = {
            lcpMs: null,
            cls: 0,
            longTasks: 0,
            longTaskMs: 0,
            unsupported: [],
          };
          Object.assign(window, { __bibliotecaryLab: metrics });
          for (const type of [
            "largest-contentful-paint",
            "layout-shift",
            "longtask",
          ]) {
            if (!PerformanceObserver.supportedEntryTypes.includes(type)) {
              metrics.unsupported.push(type);
              continue;
            }
            new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                if (type === "largest-contentful-paint")
                  metrics.lcpMs = entry.startTime;
                if (type === "layout-shift") {
                  const shift = entry as PerformanceEntry & {
                    hadRecentInput: boolean;
                    value: number;
                  };
                  if (!shift.hadRecentInput) metrics.cls += shift.value;
                }
                if (type === "longtask") {
                  metrics.longTasks++;
                  metrics.longTaskMs += entry.duration;
                }
              }
            }).observe({ type, buffered: true });
          }
        });
        await page.goto("/");
        await expect(page.locator(".welcome-hero")).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        await page.waitForLoadState("networkidle");
        const initial = await page.evaluate(() => {
          const navigation = performance.getEntriesByType(
            "navigation",
          )[0] as PerformanceNavigationTiming;
          const resources = performance.getEntriesByType(
            "resource",
          ) as PerformanceResourceTiming[];
          return {
            ...(window as typeof window & { __bibliotecaryLab: Metrics })
              .__bibliotecaryLab,
            ttfbMs: navigation.responseStart - navigation.requestStart,
            transferBytes:
              navigation.transferSize +
              resources.reduce((sum, entry) => sum + entry.transferSize, 0),
            javascriptTransferBytes: resources
              .filter((entry) => new URL(entry.name).pathname.endsWith(".js"))
              .reduce((sum, entry) => sum + entry.transferSize, 0),
            resources: resources.map((entry) => ({
              path: new URL(entry.name).pathname,
              transferBytes: entry.transferSize,
              encodedBytes: entry.encodedBodySize,
            })),
          };
        });
        const before = await cdp.send("Performance.getMetrics");
        const start = await page.evaluate(() => performance.now());
        await page
          .getByRole("link", { name: "Explorar catálogo", exact: true })
          .click();
        await expect(page).toHaveURL(/\/catalog$/);
        await page
          .getByRole("searchbox", {
            name: "Buscar por título, autor o editorial",
            exact: true,
          })
          .fill("arquitectura");
        await expect(page.locator(".book-card")).toHaveCount(1);
        await page
          .getByRole("link", {
            name: "Ver La arquitectura del silencio",
            exact: true,
          })
          .click();
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(
          "La arquitectura del silencio",
        );
        await page
          .getByRole("button", { name: "Abrir portada", exact: true })
          .click();
        await expect(
          page.getByRole("button", { name: "Cerrar portada", exact: true }),
        ).toHaveAttribute("aria-pressed", "true");
        await page.locator(".physical-book").evaluate(async (book) => {
          await Promise.all(
            book
              .getAnimations({ subtree: true })
              .map((animation) => animation.finished.catch(() => undefined)),
          );
        });
        const interaction = await page.evaluate(
          (start) => ({
            ...(window as typeof window & { __bibliotecaryLab: Metrics })
              .__bibliotecaryLab,
            durationMs: performance.now() - start,
            canvasCount: document.querySelectorAll("canvas").length,
          }),
          start,
        );
        const after = await cdp.send("Performance.getMetrics");
        const delta = (name: string) => {
          const startValue = before.metrics.find(
            (value) => value.name === name,
          )?.value;
          const endValue = after.metrics.find(
            (value) => value.name === name,
          )?.value;
          return startValue === undefined || endValue === undefined
            ? null
            : endValue - startValue;
        };
        samples.push({
          profile: profile.name,
          viewport: profile.viewport,
          repetition,
          freeMemoryBytes: os.freemem(),
          initial,
          interaction: {
            durationMs: interaction.durationMs,
            clsDelta: interaction.cls - initial.cls,
            longTasks: interaction.longTasks - initial.longTasks,
            longTaskMs: interaction.longTaskMs - initial.longTaskMs,
            scriptDurationSeconds: delta("ScriptDuration"),
            layoutDurationSeconds: delta("LayoutDuration"),
            taskDurationSeconds: delta("TaskDuration"),
          },
        });
        expect(interaction.canvasCount).toBe(0);
        expect(forbidden).toEqual([]);
        expect(errors).toEqual([]);
      } finally {
        await context.close();
      }
    }
  }
  const output = path.resolve(
    process.env.DEMO_PERFORMANCE_FILE || "demo/output/performance.json",
  );
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(
    output,
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        label: process.env.DEMO_PERFORMANCE_LABEL || "current",
        browser: browser.version(),
        node: process.version,
        os: `${os.platform()} ${os.release()}`,
        cpu: os.cpus()[0]?.model,
        totalMemoryBytes: os.totalmem(),
        headless: true,
        throttling: false,
        deviceScaleFactor: 1,
        cacheDisabled: true,
        server:
          "Vite preview local en loopback; no representa Vercel/CDN ni un teléfono físico.",
        renderFpsVerified: false,
        notes: [
          "Tres contextos fríos independientes por perfil. Se espera quietud de red antes de la lectura inicial.",
          "Se registran LCP/CLS de laboratorio, transferencias y tareas largas; las duraciones CDP incluyen el trabajo de automatización.",
          "La duración del recorrido incluye acciones y animaciones, no es latencia aislada de la aplicación.",
          "No se usa cadencia requestAnimationFrame como FPS ni se mide presentación física en GPU/pantalla.",
          "La memoria y carga de otros procesos pueden variar; no son percentiles de campo ni una garantía universal.",
        ],
        summary: profiles.map((profile) => {
          const rows = samples.filter(
            (sample) => sample.profile === profile.name,
          );
          const lcps = rows.flatMap((row) =>
            row.initial.lcpMs === null ? [] : [row.initial.lcpMs],
          );
          return {
            profile: profile.name,
            runs: rows.length,
            lcpObservedRuns: lcps.length,
            medianLcpMs: lcps.length ? median(lcps) : null,
            maximumCls: Math.max(...rows.map((row) => row.initial.cls)),
            medianTransferBytes: median(
              rows.map((row) => row.initial.transferBytes),
            ),
            medianJavascriptTransferBytes: median(
              rows.map((row) => row.initial.javascriptTransferBytes),
            ),
          };
        }),
        samples,
      },
      null,
      2,
    ) + "\n",
  );
});
