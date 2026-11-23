import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

test.use({ baseURL: process.env.PRESENTATION_BASE_URL || "http://localhost:8081", reducedMotion: "no-preference" });

test("capturas y medición reproducible de la presentación local", async ({
    page,
    browser,
}) => {
    test.setTimeout(120_000);
    const screenshots = path.resolve(process.env.PRESENTATION_SCREENSHOT_DIR || "output/playwright/presentation");
    await fs.mkdir(screenshots, { recursive: true });
    await page.addInitScript(() => {
        const metrics = { lcp: 0, cls: 0, longTasks: 0 };
        Object.assign(window, { __bibliotecaryMetrics: metrics });
        for (const type of [
            "largest-contentful-paint",
            "layout-shift",
            "longtask",
        ]) {
            try {
                new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (type === "largest-contentful-paint")
                            metrics.lcp = entry.startTime;
                        if (
                            type === "layout-shift" &&
                            !(
                                entry as PerformanceEntry & {
                                    hadRecentInput: boolean;
                                }
                            ).hadRecentInput
                        )
                            metrics.cls += (
                                entry as PerformanceEntry & { value: number }
                            ).value;
                        if (type === "longtask") metrics.longTasks++;
                    }
                }).observe({ type, buffered: true });
            } catch {
                /* Métrica no disponible en todos los navegadores. */
            }
        }
    });
    await page.goto("/");
    await expect(page.locator(".welcome-hero")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState("networkidle");
    await page.screenshot({
        path: path.join(screenshots, "01-portada.png"),
        fullPage: true,
    });
    const initial = await page.evaluate(() => {
        const navigation = performance.getEntriesByType(
            "navigation",
        )[0] as PerformanceNavigationTiming;
        const resources = performance.getEntriesByType(
            "resource",
        ) as PerformanceResourceTiming[];
        return {
            ...(window as typeof window & { __bibliotecaryMetrics: object })
                .__bibliotecaryMetrics,
            ttfbMs: navigation.responseStart - navigation.requestStart,
            domContentLoadedMs: navigation.domContentLoadedEventEnd,
            fcpMs:
                performance.getEntriesByName("first-contentful-paint")[0]
                    ?.startTime ?? null,
            initialTransferBytes: resources.reduce(
                (sum, resource) => sum + resource.transferSize,
                0,
            ),
            initialJsTransferBytes: resources
                .filter((resource) => resource.name.endsWith(".js"))
                .reduce((sum, resource) => sum + resource.transferSize, 0),
            webglResourceLoaded: resources.some((resource) =>
                resource.name.includes("collection-scene"),
            ),
            viewport: {
                width: innerWidth,
                height: innerHeight,
                dpr: devicePixelRatio,
            },
            hardwareConcurrency: navigator.hardwareConcurrency,
        };
    });
    expect(initial.webglResourceLoaded).toBe(false);
    await expect(page.locator(".editorial-books")).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(0);
    const frameIntervals = await page.evaluate(
        async () =>
            await new Promise<number[]>((resolve) => {
                const intervals: number[] = [];
                let previous = 0;
                function sample(now: number) {
                    if (previous) intervals.push(now - previous);
                    previous = now;
                    if (intervals.length >= 120) resolve(intervals);
                    else requestAnimationFrame(sample);
                }
                requestAnimationFrame(sample);
            }),
    );
    const sorted = [...frameIntervals].sort((a, b) => a - b);
    const mean =
        frameIntervals.reduce((a, b) => a + b, 0) / frameIntervals.length;
    const report = {
        dateUtc: new Date().toISOString(),
        browser: browser.version(),
        platform: `${os.platform()} ${os.release()}`,
        cpu: os.cpus()[0]?.model,
        measurement:
            "Una ejecución local Chromium headless; sin throttling; backend caliente; red loopback; no representa dispositivos móviles físicos.",
        initial,
        editorialPresentation: {
            webglRendered: false,
            samples: frameIntervals.length,
            meanRafIntervalMs: mean,
            p95RafIntervalMs: sorted[Math.floor(sorted.length * 0.95)],
            callbacksPerSecond: 1000 / mean,
        },
        interpretation:
            "La cadencia rAF durante interacción no certifica FPS de GPU ni rendimiento universal. LCP/CLS son observaciones de laboratorio, no percentiles de campo.",
    };
    await fs.writeFile(
        process.env.PRESENTATION_EVIDENCE_FILE || "output/playwright/browser-performance.json",
        JSON.stringify(report, null, 2),
    );
    await page.goto("/catalog");
    await expect(page.locator(".book-card").first()).toBeVisible();
    expect(
        await page.evaluate(() =>
            performance
                .getEntriesByType("resource")
                .some((entry) => entry.name.includes("collection-scene")),
        ),
    ).toBe(false);
    await page.screenshot({
        path: path.join(screenshots, "02-catalogo.png"),
        fullPage: true,
    });
    await page.getByRole("link", { name: /^Ver / }).first().click();
    await expect(page.locator(".book-detail")).toBeVisible();
    await page.screenshot({
        path: path.join(screenshots, "03-ficha.png"),
        fullPage: true,
    });
    await page.goto("/login");
    await page.screenshot({
        path: path.join(screenshots, "04-acceso.png"),
        fullPage: true,
    });
    await page
        .getByLabel("Correo electrónico", { exact: true })
        .fill("demo.admin@example.test");
    await page
        .getByLabel("Contraseña", { exact: true })
        .fill("Demo-Admin2026!");
    await page
        .getByRole("button", { name: "Entrar a mi biblioteca", exact: true })
        .click();
    await expect(page).toHaveURL(/\/dashboard$/);
    for (const [url, filename] of [
        ["/dashboard", "05-panel.png"],
        ["/manage/books", "06-gestion.png"],
        ["/manage/books/create", "07-formulario.png"],
        ["/manage/users", "08-personas.png"],
        ["/manage/audit", "09-historial.png"],
        ["/profile", "10-perfil.png"],
    ]) {
        await page.goto(url);
        await expect(page.getByRole("main")).toBeVisible();
        await page.screenshot({
            path: path.join(screenshots, filename),
            fullPage: true,
        });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.locator(".welcome-hero")).toBeVisible();
    await page.screenshot({
        path: path.join(screenshots, "11-portada-movil.png"),
        fullPage: true,
    });
    await page.goto("/catalog");
    await expect(page.locator(".book-card").first()).toBeVisible();
    await page.screenshot({
        path: path.join(screenshots, "12-catalogo-movil.png"),
        fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    const legacy = await page.request
        .get("http://127.0.0.1:8080/", { timeout: 5000 })
        .catch(() => null);
    if (legacy?.ok()) {
        await page.goto("http://127.0.0.1:8080/");
        await expect(
            page.getByRole("heading", {
                name: "Andrew's Library",
                exact: true,
            }),
        ).toBeVisible();
        await page.screenshot({
            path: path.join(screenshots, "00-legado.png"),
            fullPage: true,
        });
    } else {
        test.info().annotations.push({
            type: "comparación",
            description:
                "Captura opcional del legado omitida: el servidor antiguo no está iniciado en 127.0.0.1:8080.",
        });
    }
});
