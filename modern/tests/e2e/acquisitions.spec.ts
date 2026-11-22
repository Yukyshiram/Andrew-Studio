import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";

async function accessible(page: Page) {
    await page.evaluate(() => document.fonts.ready);
    const report = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
    expect(report.violations).toEqual([]);
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
    ).toBe(true);
}

test("incorporaciones reales: anuncio, fechas públicas, inventario, llegada y panel operativo", async ({
    page,
    browser,
    baseURL,
    browserName,
}) => {
    test.setTimeout(180_000);
    const origin = new URL(baseURL!);
    if (
        !["localhost", "127.0.0.1"].includes(origin.hostname) ||
        origin.port !== "8082"
    )
        throw new Error(
            "Este recorrido solo admite el servidor local de QA aislado en 8082.",
        );
    const visitorContext = await browser.newContext({
        baseURL,
        viewport: { width: 390, height: 844 },
        locale: "es-MX",
        reducedMotion: "reduce",
    });
    const visitor = await visitorContext.newPage();
    const errors: string[] = [];
    const external: string[] = [];
    const folder = `${process.env.ACQUISITION_SCREENSHOT_DIR || "output/playwright/acquisitions"}/${browserName}`;
    await fs.mkdir(folder, { recursive: true });
    for (const surface of [page, visitor]) {
        surface.on("pageerror", (error) => errors.push(error.message));
        surface.on("console", (message) => {
            if (message.type() === "error") errors.push(message.text());
        });
        surface.on("request", (request) => {
            if (new URL(request.url()).origin !== origin.origin)
                external.push(request.url());
        });
    }
    const unique = `QA-NOV-${Date.now()}`;
    const title = `Atlas ficticio de próximas historias ${unique}`;
    const note = `Previsión ficticia ${unique} <img src=x onerror=alert(1)>`;
    try {
        await page.goto("/login");
        await page
            .getByLabel("Correo electrónico", { exact: true })
            .fill("demo.biblioteca@example.test");
        await page
            .getByLabel("Contraseña", { exact: true })
            .fill("Demo-Biblio2026!");
        await page
            .getByRole("button", {
                name: "Entrar a mi biblioteca",
                exact: true,
            })
            .click();
        await expect(page).toHaveURL(/\/dashboard$/);
        await page.goto("/manage/books/create");
        await page
            .getByLabel("Título de la obra *", { exact: true })
            .fill(title);
        await page
            .getByLabel("Autor *", { exact: true })
            .fill("Autora ficticia QA");
        await page
            .getByLabel("Editorial *", { exact: true })
            .fill("Editorial sintética de pruebas");
        await page
            .getByLabel("Año de publicación *", { exact: true })
            .fill("2030 / dato ficticio");
        await page
            .getByLabel("Categoría *", { exact: true })
            .selectOption("Ciencia");
        await page
            .getByRole("button", { name: "Incorporar libro", exact: true })
            .click();
        await expect(page).toHaveURL(/\/catalog\/\d+$/);
        const bookId = page.url().split("/").at(-1)!;
        await page.goto(`/manage/acquisitions?q=${unique}`);
        await page
            .getByRole("button", {
                name: "Registrar incorporación",
                exact: true,
            })
            .click();
        await page
            .getByLabel("Ficha bibliográfica", { exact: true })
            .selectOption(bookId);
        await page
            .getByLabel("Fecha de publicación editorial", { exact: true })
            .fill("2030-01-01");
        await page
            .getByLabel("Fecha de llegada estimada", { exact: true })
            .fill("2030-02-03");
        await page
            .getByLabel("Datos ficticios de demostración", { exact: true })
            .check();
        await page.getByLabel("Nota pública", { exact: true }).fill(note);
        await accessible(page);
        await page.screenshot({
            path: `${folder}/registro-escritorio.png`,
            fullPage: true,
        });
        await page
            .getByRole("button", { name: "Guardar incorporación", exact: true })
            .click();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await expect(
            page.getByRole("button", {
                name: "Registrar incorporación",
                exact: true,
            }),
        ).toBeFocused();
        await visitor.goto(`/news?q=${unique}`);
        const initialPage = JSON.parse(
            (await visitor.locator('script[data-page="app"]').textContent())!,
        );
        const today: string = initialPage.props.today;
        await expect(
            visitor.getByRole("heading", { name: title, exact: true }),
        ).toBeVisible();
        await expect(
            visitor.getByText("Datos ficticios", { exact: true }),
        ).toBeVisible();
        await expect(visitor.getByText(note, { exact: true })).toBeVisible();
        await expect(visitor.locator("main img")).toHaveCount(0);
        await expect(
            visitor.locator('.acquisition-dates time[datetime="2030-01-01"]'),
        ).toHaveCount(1);
        await expect(
            visitor.locator('.acquisition-dates time[datetime="2030-02-03"]'),
        ).toHaveCount(1);
        await accessible(visitor);
        await visitor.screenshot({
            path: `${folder}/novedades-movil.png`,
            fullPage: true,
        });
        await visitor
            .getByRole("button", { name: "Activar tema claro", exact: true })
            .click();
        await accessible(visitor);
        await visitor.screenshot({
            path: `${folder}/novedades-movil-claro.png`,
            fullPage: true,
        });
        await visitor
            .getByRole("button", { name: "Activar tema oscuro", exact: true })
            .click();
        await visitor.getByText("Filtrar por fechas", { exact: true }).click();
        await visitor
            .getByLabel("Filtrar fechas de", { exact: true })
            .selectOption("publication_on");
        await visitor.getByLabel("Desde", { exact: true }).fill("2030-01-01");
        await visitor.getByLabel("Hasta", { exact: true }).fill("2030-01-01");
        await visitor
            .getByRole("button", { name: "Aplicar filtros", exact: true })
            .click();
        await expect(visitor.locator(".news-card")).toHaveCount(1);
        await visitor
            .getByLabel("Filtrar fechas de", { exact: true })
            .selectOption("expected_on");
        await visitor
            .getByRole("button", { name: "Aplicar filtros", exact: true })
            .click();
        await expect(
            visitor.getByRole("heading", {
                name: "Las próximas historias llegarán aquí",
                exact: true,
            }),
        ).toBeVisible();
        await page
            .getByRole("button", {
                name: `Editar incorporación de ${title}`,
                exact: true,
            })
            .click();
        await page
            .getByLabel("Estado de incorporación", { exact: true })
            .selectOption("incorporated");
        await page
            .getByLabel("Fecha de incorporación real", { exact: true })
            .fill(today);
        await page
            .getByRole("button", { name: "Guardar incorporación", exact: true })
            .click();
        await expect(page.getByRole("dialog")).toContainText(
            "Registra primero al menos un ejemplar",
        );
        await page
            .getByRole("button", { name: "Cancelar", exact: true })
            .click();
        await page.goto(`/manage/inventory?q=${unique}`);
        await page
            .getByRole("button", { name: "Incorporar ejemplar", exact: true })
            .click();
        await page
            .getByLabel("Ficha bibliográfica", { exact: true })
            .selectOption(bookId);
        await page
            .getByLabel("Código de barras", { exact: true })
            .fill(`QA-NEWS-${unique}`);
        await page
            .getByLabel("Ubicación", { exact: true })
            .fill("Novedades de prueba");
        await page
            .getByRole("button", { name: "Guardar ejemplar", exact: true })
            .click();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await page.goto(`/manage/acquisitions?q=${unique}`);
        await page
            .getByRole("button", {
                name: `Editar incorporación de ${title}`,
                exact: true,
            })
            .click();
        await page
            .getByLabel("Estado de incorporación", { exact: true })
            .selectOption("incorporated");
        await page
            .getByLabel("Fecha de incorporación real", { exact: true })
            .fill(today);
        await page
            .getByRole("button", { name: "Guardar incorporación", exact: true })
            .click();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await visitor.goto(`/news?q=${unique}&status=incorporated`);
        await expect(
            visitor
                .locator(".news-card")
                .getByText("Incorporado", { exact: true }),
        ).toBeVisible();
        await expect(
            visitor.locator(`.acquisition-dates time[datetime="${today}"]`),
        ).toHaveCount(1);
        await visitor
            .getByRole("link", { name: /Consultar disponibilidad/ })
            .click();
        await expect(visitor).toHaveURL(new RegExp(`/catalog/${bookId}$`));
        await expect(
            visitor.getByRole("region", {
                name: "Disponibilidad y solicitud",
                exact: true,
            }),
        ).toContainText("1 de 1 ejemplares disponibles");
        await page
            .getByRole("button", {
                name: `Editar incorporación de ${title}`,
                exact: true,
            })
            .click();
        await expect(
            page.getByLabel("Estado de incorporación", { exact: true }),
        ).toBeDisabled();
        await expect(
            page.getByLabel("Fecha de incorporación real", { exact: true }),
        ).toHaveValue(today);
        await page
            .getByRole("button", { name: "Cancelar", exact: true })
            .click();
        await page
            .getByRole("button", {
                name: "Registrar incorporación",
                exact: true,
            })
            .click();
        await expect(
            page.getByLabel("Fecha de publicación editorial", { exact: true }),
        ).toHaveValue("");
        await expect(
            page.getByLabel("Fecha de incorporación real", { exact: true }),
        ).toHaveValue("");
        const nextDay = new Date(Date.parse(`${today}T12:00:00Z`) + 86_400_000)
            .toISOString()
            .slice(0, 10);
        await page
            .getByLabel("Fecha de llegada estimada", { exact: true })
            .fill(nextDay);
        await page
            .getByLabel("Datos ficticios de demostración", { exact: true })
            .check();
        await page
            .getByRole("button", { name: "Guardar incorporación", exact: true })
            .click();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await page
            .getByRole("navigation", {
                name: "Navegación principal",
                exact: true,
            })
            .getByRole("link", { name: "Panel", exact: true })
            .click();
        await expect(page).toHaveURL(/\/dashboard$/);
        await expect(
            page.getByRole("region", {
                name: "Operación de la biblioteca",
                exact: true,
            }),
        ).toBeVisible();
        await expect(
            page.getByRole("region", {
                name: "Resumen financiero administrativo",
                exact: true,
            }),
        ).toHaveCount(0);
        await expect(
            page.getByRole("region", {
                name: "Próximas novedades",
                exact: true,
            }),
        ).toContainText(title);
        await accessible(page);
        await page.screenshot({
            path: `${folder}/panel-bibliotecario.png`,
            fullPage: true,
        });
        await page.setViewportSize({ width: 390, height: 844 });
        await accessible(page);
        await page.screenshot({
            path: `${folder}/panel-movil.png`,
            fullPage: true,
        });
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.goto(`/manage/acquisitions?q=${unique}`);
        const pending = page
            .locator(".library-record")
            .filter({ has: page.getByText("Anunciado", { exact: true }) });
        await pending
            .getByRole("button", {
                name: `Editar incorporación de ${title}`,
                exact: true,
            })
            .click();
        await page
            .getByLabel("Estado de incorporación", { exact: true })
            .selectOption("cancelled");
        await page
            .getByRole("button", { name: "Guardar incorporación", exact: true })
            .click();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await page.goto(`/manage/books?q=${unique}`);
        await page
            .getByRole("button", { name: `Archivar ${title}`, exact: true })
            .click();
        await page
            .getByRole("dialog")
            .getByRole("button", { name: "Archivar libro", exact: true })
            .click();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await visitor.goto(`/news?q=${unique}`);
        await expect(visitor.locator(".news-card")).toHaveCount(0);
        expect(errors).toEqual([]);
        expect(external).toEqual([]);
    } finally {
        await visitorContext.close();
    }
});
