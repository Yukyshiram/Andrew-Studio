import { test, expect, type Page } from "@playwright/test";
import {
  selectProfile,
  navigation,
  confirmSimulation,
  captureLibrary,
} from "./library-helpers";

const runtime = new WeakMap<Page, string[]>();
test("reflujo a 320 px conserva acciones y desplazamiento dentro de la tabla", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  for (const [href, profile] of [
    ["/catalog/1", "Lucía · Lectora"],
    ["/my-library", "Lucía · Lectora"],
    ["/demo/admin/circulation", "Mateo · Biblioteca"],
    ["/demo/admin/finance", "Andrea · Administración"],
    ["/news", "Visitante"],
  ]) {
    await page.goto(href);
    await expect(page.locator("main h1")).toBeVisible();
    if (profile !== "Visitante") await selectProfile(page, profile);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      href,
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: /^Cambiar perfil ficticio:/ }),
    ).toBeVisible();
    if (href.endsWith("circulation")) {
      const table = page.getByRole("region", {
        name: "Tabla de ejemplares ficticios",
        exact: true,
      });
      await table.focus();
      await expect(table).toBeFocused();
      await page.keyboard.press("ArrowRight");
      await expect
        .poll(() => table.evaluate((element) => element.scrollLeft))
        .toBeGreaterThan(0);
      expect(await page.evaluate(() => scrollX)).toBe(0);
    }
  }
});
test.beforeEach(async ({ page, baseURL }) => {
  const errors: string[] = [];
  runtime.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.origin !== new URL(baseURL!).origin ||
      /\.php|\/api\/|localhost:808|collection-scene|\/three[/.]/i.test(url.href)
    )
      errors.push(`Petición no permitida: ${url.pathname}`);
  });
});
test.afterEach(async ({ page }) => {
  expect(runtime.get(page)).toEqual([]);
});

test("perfiles, archivo protegido, rechazo escapado y restablecimiento de toda la muestra", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/demo/admin/books");
  await expect(
    page.getByRole("button", { name: "Nueva ficha", exact: true }),
  ).toHaveCount(0);
  await selectProfile(page, "Lucía · Lectora");
  await expect(
    page.getByRole("button", { name: "Nueva ficha", exact: true }),
  ).toHaveCount(0);
  await selectProfile(page);
  await page
    .getByRole("searchbox", { name: "Buscar fichas", exact: true })
    .fill("Las ciudades que recordamos");
  await page
    .getByRole("button", {
      name: "Archivar Las ciudades que recordamos",
      exact: true,
    })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Archivar ficha", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "No puedes archivar una ficha con préstamos o solicitudes abiertos",
  );
  await expect(page.locator(".admin-books-table tbody tr")).toHaveCount(1);
  await selectProfile(page, "Mateo · Biblioteca");
  await navigation(page, "Circulación");
  const request = page.getByRole("article", {
    name: "Solicitud de Las ciudades que recordamos para Lucía Mar",
    exact: true,
  });
  await request.getByRole("button", { name: "Rechazar", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar simulación", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("Motivo del rechazo")).toBeFocused();
  const reason =
    '<img src=x onerror="alert(1)"> Motivo ficticio para comprobar texto escapado.';
  await page.getByLabel("Motivo del rechazo").fill(reason);
  await confirmSimulation(page);
  await expect(request).toHaveCount(0);
  await navigation(page, "Volver a la biblioteca");
  await selectProfile(page, "Lucía · Lectora");
  await navigation(page, "Mi biblioteca");
  const ownRequest = page.getByRole("article", {
    name: "Solicitud de Las ciudades que recordamos",
    exact: true,
  });
  await expect(ownRequest).toContainText("Rechazada");
  await expect(ownRequest).toContainText(reason);
  await expect(ownRequest.locator("img")).toHaveCount(0);
  await selectProfile(page);
  await navigation(page, "Probar panel administrador");
  await navigation(page, "Circulación");
  await page.getByRole("button", { name: "+7 días", exact: true }).click();
  await confirmSimulation(page);
  await expect(
    page
      .getByRole("region", { name: "Reloj de la demostración" })
      .locator("time"),
  ).toHaveAttribute("datetime", "2026-11-29");
  await navigation(page, "Resumen");
  await page
    .getByRole("button", { name: "Restablecer datos", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancelar", exact: true })
    .click();
  await navigation(page, "Circulación");
  await expect(
    page
      .getByRole("region", { name: "Reloj de la demostración" })
      .locator("time"),
  ).toHaveAttribute("datetime", "2026-11-29");
  await navigation(page, "Resumen");
  await page
    .getByRole("button", { name: "Restablecer datos", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Restablecer datos", exact: true })
    .click();
  await navigation(page, "Circulación");
  await expect(
    page
      .getByRole("region", { name: "Reloj de la demostración" })
      .locator("time"),
  ).toHaveAttribute("datetime", "2026-11-22");
  await expect(request).toContainText("Lista para recoger");
  await expect(
    page.getByRole("region", {
      name: "Historial de operaciones de la muestra",
    }),
  ).toContainText("Las operaciones que pruebes aparecerán aquí");
});

test.describe("Navegación táctil", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    reducedMotion: "reduce",
  });
  test("solicitud y cancelación con tacto, movimiento reducido y WebGL ausente", async ({
    page,
    browserName,
  }) => {
    await page.addInitScript(() => {
      Object.assign(window, { __demoTouchStarts: 0 });
      document.addEventListener(
        "touchstart",
        () => {
          (window as typeof window & { __demoTouchStarts: number })
            .__demoTouchStarts++;
        },
        { passive: true },
      );
      Object.defineProperty(window, "WebGLRenderingContext", {
        value: undefined,
        configurable: true,
      });
      Object.defineProperty(window, "WebGL2RenderingContext", {
        value: undefined,
        configurable: true,
      });
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        type: string,
        ...args: unknown[]
      ) {
        return type.startsWith("webgl")
          ? null
          : Reflect.apply(original, this, [type, ...args]);
      };
    });
    await page.goto("/catalog?category=Literatura&q=arquitectura");
    await page.getByRole("button", { name: /^Cambiar perfil ficticio:/ }).tap();
    expect(
      await page.evaluate(
        () =>
          (window as typeof window & { __demoTouchStarts: number })
            .__demoTouchStarts,
      ),
    ).toBeGreaterThan(0);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /Lucía · Lectora/ })
      .tap();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await page
      .getByRole("link", {
        name: "Ver La arquitectura del silencio",
        exact: true,
      })
      .tap();
    await page
      .getByRole("button", { name: "Abrir portada", exact: true })
      .tap();
    await expect(page.locator(".physical-cover")).toHaveCSS(
      "transform",
      "none",
    );
    await page
      .getByRole("button", { name: "Solicitar libro", exact: true })
      .tap();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Confirmar simulación", exact: true })
      .tap();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await page
      .getByRole("button", { name: "Abrir navegación", exact: true })
      .tap();
    await page
      .getByRole("dialog")
      .getByRole("link", { name: "Mi biblioteca", exact: true })
      .tap();
    await expect(page.locator("main h1")).toHaveText("Mi biblioteca");
    const request = page.getByRole("article", {
      name: "Solicitud de La arquitectura del silencio",
      exact: true,
    });
    await expect(request).toContainText("Pendiente de validación");
    await request
      .getByRole("button", { name: "Cancelar solicitud", exact: true })
      .tap();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Confirmar simulación", exact: true })
      .tap();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(request).toContainText("Cancelada");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator("canvas")).toHaveCount(0);
    await captureLibrary(page, browserName, "390-dark-solicitud-cancelada");
  });
});
