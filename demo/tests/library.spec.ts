import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  selectProfile,
  navigation,
  confirmSimulation,
  captureLibrary,
} from "./library-helpers";

test.beforeEach(async ({ page, baseURL }) => {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(message.text());
  });
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.origin !== new URL(baseURL!).origin ||
      /\.php|\/api\/|localhost:808|collection-scene|\/three[/.]/i.test(url.href)
    )
      problems.push(`Petición no permitida: ${url.pathname}`);
  });
  test.info().annotations.push({
    type: "data",
    description:
      "Solo datos ficticios en memoria; sin backend, autenticación ni pagos reales.",
  });
  runtime.set(page, problems);
});
const runtime = new WeakMap<object, string[]>();
test.afterEach(async ({ page }) => {
  expect(runtime.get(page)).toEqual([]);
});

test("lector y biblioteca completan solicitud, entrega, renovación y devolución sin backend", async ({
  page,
  browserName,
}) => {
  test.setTimeout(60000);
  await page.goto("/catalog/1");
  await expect(
    page.getByRole("region", { name: "Disponibilidad y solicitud" }),
  ).toContainText("2 ejemplares disponibles");
  await selectProfile(page, "Lucía · Lectora");
  await page
    .getByRole("button", { name: "Solicitar libro", exact: true })
    .click();
  await confirmSimulation(page);
  await navigation(page, "Mi biblioteca");
  const request = page.getByRole("article", {
    name: "Solicitud de La arquitectura del silencio",
    exact: true,
  });
  await expect(request).toContainText("Pendiente de validación");
  await expect(
    page.getByRole("region", { name: "Mis préstamos activos" }),
  ).toContainText("Tu próxima lectura te espera");
  await selectProfile(page, "Mateo · Biblioteca");
  await navigation(page, "Probar panel administrador");
  await navigation(page, "Circulación");
  const prepared = page.getByRole("article", {
    name: "Solicitud de La arquitectura del silencio para Lucía Mar",
    exact: true,
  });
  await prepared
    .getByRole("button", { name: "Validar y preparar", exact: true })
    .click();
  await confirmSimulation(page);
  await expect(prepared).toContainText("Lista para recoger");
  await prepared
    .getByRole("button", { name: "Confirmar entrega", exact: true })
    .click();
  await confirmSimulation(page);
  await expect(prepared).toHaveCount(0);
  const staffLoan = page.getByRole("article", {
    name: "Préstamo de La arquitectura del silencio para Lucía Mar",
    exact: true,
  });
  await expect(staffLoan).toContainText("7 dic 2026");
  await navigation(page, "Volver a la biblioteca");
  await navigation(page, "Mi biblioteca");
  await selectProfile(page, "Lucía · Lectora");
  const loan = page.getByRole("article", {
    name: "Préstamo de La arquitectura del silencio",
    exact: true,
  });
  await expect(loan).toContainText("Préstamo activo");
  await loan
    .getByRole("button", { name: "Renovar préstamo", exact: true })
    .click();
  await confirmSimulation(page);
  await expect(loan).toContainText("21 dic 2026");
  await expect(loan).toContainText("Renovaciones: 1 de 2");
  await captureLibrary(page, browserName, "1440-dark-prestamo-renovado");
  await loan
    .getByRole("link", { name: "La arquitectura del silencio", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Disponibilidad y solicitud" }),
  ).toContainText("1 ejemplar disponible");
  await expect(
    page.getByRole("link", { name: "Consultar mi préstamo", exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Solicitar libro", exact: true }),
  ).toHaveCount(0);
  await selectProfile(page, "Mateo · Biblioteca");
  await navigation(page, "Probar panel administrador");
  await navigation(page, "Circulación");
  await staffLoan
    .getByRole("button", { name: "Recibir devolución", exact: true })
    .click();
  await confirmSimulation(page);
  await expect(staffLoan).toHaveCount(0);
  await navigation(page, "Volver a la biblioteca");
  await navigation(page, "Mi biblioteca");
  await selectProfile(page, "Lucía · Lectora");
  await expect(
    page.getByRole("region", {
      name: "Mi historial de préstamos",
      exact: true,
    }),
  ).toContainText("La arquitectura del silencio");
  await expect(
    page.getByRole("region", { name: "Mis préstamos activos" }),
  ).toContainText("Tu próxima lectura te espera");
  await captureLibrary(page, browserName, "1440-dark-devolucion-historial");
  await navigation(page, "Catálogo");
  await page
    .getByRole("link", {
      name: "Ver La arquitectura del silencio",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("region", { name: "Disponibilidad y solicitud" }),
  ).toContainText("2 ejemplares disponibles");
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((key) => key !== "bibliotecary-theme"),
    ),
  ).toEqual([]);
  expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual([]);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Cambiar perfil ficticio: Visitante" }),
  ).toBeVisible();
});

test("la devolución atiende la siguiente reserva y la recogida expira con el reloj ficticio", async ({
  page,
}) => {
  await page.goto("/catalog/2");
  await selectProfile(page, "Lucía · Lectora");
  await page
    .getByRole("button", { name: "Reservar título", exact: true })
    .click();
  await confirmSimulation(page);
  await selectProfile(page, "Mateo · Biblioteca");
  await navigation(page, "Probar panel administrador");
  await navigation(page, "Circulación");
  const request = page.getByRole("article", {
    name: "Solicitud de Atlas de lo invisible para Lucía Mar",
    exact: true,
  });
  await request
    .getByRole("button", { name: "Validar y preparar", exact: true })
    .click();
  await confirmSimulation(page);
  await expect(request).toContainText("Posición 1");
  await page
    .getByRole("article", {
      name: "Préstamo de Atlas de lo invisible para Nora Vega",
      exact: true,
    })
    .getByRole("button", { name: "Recibir devolución" })
    .click();
  await confirmSimulation(page);
  await expect(request).toContainText("Lista para recoger");
  await page.getByRole("button", { name: "+7 días", exact: true }).click();
  await confirmSimulation(page);
  await expect(request).toHaveCount(0);
  await page.getByLabel("Mostrar solicitudes").selectOption("all");
  await expect(request).toContainText("Plazo vencido");
  await expect(
    page
      .getByRole("region", {
        name: "Tabla de ejemplares ficticios",
        exact: true,
      })
      .getByRole("row")
      .filter({ hasText: "DEMO-002-A" }),
  ).toContainText("Disponible");
});

test("tesorería simula centavos y reversiones conservando los originales", async ({
  page,
}) => {
  await page.goto("/demo/admin/finance");
  await expect(
    page.getByRole("button", { name: "Registrar pago ficticio", exact: true }),
  ).toHaveCount(0);
  await selectProfile(page, "Mateo · Biblioteca");
  await expect(
    page.getByRole("button", { name: "Registrar pago ficticio", exact: true }),
  ).toHaveCount(0);
  await selectProfile(page);
  const summary = page.getByRole("region", {
    name: "Resumen financiero ficticio",
    exact: true,
  });
  await expect(summary).toContainText("$0.25");
  await page.getByLabel("Importe ficticio en MXN").fill("0.251");
  await expect(
    page.getByRole("button", { name: "Registrar pago ficticio", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Importe ficticio en MXN").fill("1.00");
  await expect(
    page.getByRole("button", { name: "Registrar pago ficticio", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Importe ficticio en MXN").fill("0,25");
  await page
    .getByRole("button", { name: "Registrar pago ficticio", exact: true })
    .click();
  await confirmSimulation(page);
  await expect(summary).not.toContainText("$0.25");
  const payment = page.getByRole("article").filter({
    hasText: "Pago ficticio registrado en la muestra; no se transfirió dinero",
  });
  await payment
    .getByRole("button", { name: "Revertir pago", exact: true })
    .click();
  await confirmSimulation(page);
  await expect(payment).toContainText("Revertido; el original se conserva");
  await expect(
    payment.getByRole("button", { name: "Revertir pago", exact: true }),
  ).toHaveCount(0);
  await expect(summary).toContainText("$0.25");
  await expect(
    page.getByRole("article").filter({
      hasText:
        "Reversión ficticia de un pago; se conserva el movimiento original",
    }),
  ).toHaveCount(1);
  await page.getByLabel("Cuenta ficticia").selectOption("lucia");
  await expect(
    page.getByRole("heading", { name: "Una cuenta sin movimientos" }),
  ).toBeVisible();
});

test("novedades filtra fechas sin crear existencias y recarga rutas profundas", async ({
  page,
}) => {
  for (const href of [
    "/my-library",
    "/demo/admin/circulation",
    "/demo/admin/finance",
    "/news?status=ordered&from=2026-12-05&to=2026-12-05",
  ]) {
    const response = await page.goto(href);
    expect(response?.status()).toBe(200);
    await expect(page.locator("main h1")).toBeVisible();
    await page.reload();
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator('input[type="password"], canvas')).toHaveCount(0);
  }
  await expect(page.locator(".news-card")).toHaveCount(1);
  await expect(page.locator(".news-card")).toContainText("Pedido");
  await page.getByLabel("Estado de incorporación").selectOption("");
  await page.getByText("Filtrar por fechas", { exact: true }).click();
  await page.getByLabel("Desde", { exact: true }).fill("");
  await page.getByLabel("Hasta", { exact: true }).fill("");
  await expect(page.locator(".news-card")).toHaveCount(3);
  await page.getByLabel("Tipo de fecha").selectOption("publication");
  await page.getByLabel("Desde", { exact: true }).fill("2026-12-12");
  await page.getByLabel("Hasta", { exact: true }).fill("2026-12-12");
  await expect(page.locator(".news-card")).toHaveCount(1);
  await expect(page.locator(".news-card")).toContainText("Anunciado");
  await page
    .getByLabel("Categoría", { exact: true })
    .selectOption("Tecnología");
  await expect(page.locator(".news-card")).toHaveCount(0);
});

test("pantallas nuevas accesibles, responsive y sin movimiento obligatorio", async ({
  page,
  browserName,
}) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const screens = [
    ["/my-library", "Lucía · Lectora", "lector"],
    ["/demo/admin/circulation", "Mateo · Biblioteca", "circulacion"],
    ["/demo/admin/finance", "Andrea · Administración", "tesoreria"],
    ["/news", "Visitante", "novedades"],
  ] as const;
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    for (const theme of ["dark", "light"]) {
      for (const [href, profile, name] of screens) {
        await page.goto(href);
        await expect(page.locator("main h1")).toBeVisible();
        if (profile !== "Visitante") await selectProfile(page, profile);
        const themeButton = page.getByRole("button", {
          name:
            theme === "light" ? "Activar tema claro" : "Activar tema oscuro",
          exact: true,
        });
        if (await themeButton.isVisible()) await themeButton.click();
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expect(page.locator("body")).toHaveCSS(
          "color",
          theme === "light" ? "rgb(32, 37, 30)" : "rgb(243, 242, 235)",
        );
        const recordHeading = page.locator(".library-record h3").first();
        if (await recordHeading.count())
          await expect(recordHeading).toHaveCSS(
            "color",
            theme === "light" ? "rgb(32, 37, 30)" : "rgb(243, 242, 235)",
          );
        await page.evaluate(() => document.fonts.ready);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${width} ${theme} ${href}`,
        ).toBe(true);
        expect(
          (
            await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
              .analyze()
          ).violations,
          `${width} ${theme} ${href}`,
        ).toEqual([]);
        if (theme === "dark" || width === 390)
          await captureLibrary(page, browserName, `${width}-${theme}-${name}`);
      }
    }
  }
  await page.getByRole("button", { name: /^Cambiar perfil ficticio:/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: /^Cambiar perfil ficticio:/ }),
  ).toBeFocused();
});
