import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";

test("circulación real: lector solicita, personal prepara y entrega, devuelve y conserva historial", async ({
    page,
    browser,
    baseURL,
}) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    const external: string[] = [];
    const readerContext = await browser.newContext({
        baseURL,
        locale: "es-MX",
        viewport: { width: 390, height: 844 },
        reducedMotion: "reduce",
    });
    const reader = await readerContext.newPage();
    for (const surface of [page, reader]) {
        surface.on("pageerror", (error) => errors.push(error.message));
        surface.on("console", (message) => {
            if (message.type() === "error") errors.push(message.text());
        });
        surface.on("request", (request) => {
            if (new URL(request.url()).origin !== new URL(baseURL!).origin)
                external.push(request.url());
        });
    }
    const folder = "../docs/screenshots/v3/laravel";
    await fs.mkdir(folder, { recursive: true });
    try {
        const unique = Date.now();
        const title = `Cuaderno ficticio de circulación ${unique}`;
        const code = `QA-LOAN-${unique}`;
        const readerName = `Lector sintético ${unique}`;
        await page.goto("/login");
        await page
            .getByLabel("Correo electrónico", { exact: true })
            .fill("demo.admin@example.test");
        await page
            .getByLabel("Contraseña", { exact: true })
            .fill("Demo-Admin2026!");
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
            .fill("Autora ficticia de pruebas");
        await page
            .getByLabel("Editorial *", { exact: true })
            .fill("Editorial ficticia QA");
        await page
            .getByLabel("Año de publicación *", { exact: true })
            .fill("2026");
        await page
            .getByRole("button", { name: "Incorporar libro", exact: true })
            .click();
        await expect(page).toHaveURL(/\/catalog\/\d+$/);
        const bookId = page.url().split("/").at(-1)!;
        await page.goto("/manage/inventory");
        await page
            .getByRole("button", { name: "Incorporar ejemplar", exact: true })
            .click();
        await page
            .getByLabel("Ficha bibliográfica", { exact: true })
            .selectOption(bookId);
        await page.getByLabel("Código de barras", { exact: true }).fill(code);
        await page
            .getByLabel("Ubicación", { exact: true })
            .fill("Estante QA · 3");
        await page
            .getByRole("button", { name: "Guardar ejemplar", exact: true })
            .click();
        await expect(page.getByRole("dialog")).toHaveCount(0);

        await reader.goto("/register");
        await reader.getByLabel("Tu nombre", { exact: true }).fill(readerName);
        await reader
            .getByLabel("Correo electrónico", { exact: true })
            .fill(`qa-circulation-${unique}@example.test`);
        await reader
            .getByLabel("Elige una contraseña", { exact: true })
            .fill("Prueba-Segura2026!");
        await reader
            .getByLabel("Repite tu contraseña", { exact: true })
            .fill("Prueba-Segura2026!");
        await reader
            .getByRole("button", { name: "Crear mi cuenta", exact: true })
            .click();
        await expect(reader).toHaveURL(/\/dashboard$/);
        await reader.goto(`/catalog/${bookId}`);
        await expect(
            reader.getByText("1 de 1 ejemplares disponibles", { exact: true }),
        ).toBeVisible();
        await reader
            .getByRole("button", { name: "Solicitar préstamo", exact: true })
            .click();
        await reader
            .getByRole("button", { name: "Enviar solicitud", exact: true })
            .click();
        await expect(reader).toHaveURL(/\/my-library\?view=requests$/);
        await expect(
            reader.getByText("Pendiente de validación", { exact: true }),
        ).toBeVisible();
        await reader.evaluate(() => document.fonts.ready);
        await reader.screenshot({
            path: `${folder}/lector-solicitud-movil.png`,
            fullPage: true,
        });
        expect(
            (
                await new AxeBuilder({ page: reader })
                    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
                    .analyze()
            ).violations,
        ).toEqual([]);

        await page.goto(`/manage/circulation?q=${unique}`);
        await page
            .getByRole("button", {
                name: `Preparar solicitud de ${readerName}`,
                exact: true,
            })
            .click();
        await page
            .getByRole("button", { name: "Confirmar operación", exact: true })
            .click();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await expect(
            page.getByText("Listo para recoger", { exact: true }),
        ).toBeVisible();
        await page.screenshot({
            path: `${folder}/bibliotecario-recogida.png`,
            fullPage: true,
        });
        await reader.reload();
        await expect(
            reader.getByText("Listo para recoger", { exact: true }),
        ).toBeVisible();
        await page
            .getByRole("button", {
                name: `Entregar ejemplar a ${readerName}`,
                exact: true,
            })
            .click();
        await page
            .getByRole("button", { name: "Confirmar operación", exact: true })
            .click();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await reader
            .getByRole("link", { name: "Préstamos activos", exact: true })
            .click();
        await expect(
            reader.getByRole("heading", { name: title, exact: true }),
        ).toBeVisible();
        await expect(
            reader.getByText("Préstamo activo", { exact: true }),
        ).toBeVisible();
        await expect(reader.locator(".library-record")).toContainText(
            "Vencimiento:",
        );
        await reader.screenshot({
            path: `${folder}/lector-prestamo-movil.png`,
            fullPage: true,
        });

        await page.goto(`/manage/circulation?view=loans&q=${unique}`);
        await page
            .getByRole("button", {
                name: `Recibir devolución de ${code}`,
                exact: true,
            })
            .click();
        await page
            .getByLabel("Condición del ejemplar", { exact: true })
            .selectOption("good");
        await page
            .getByRole("button", { name: "Confirmar operación", exact: true })
            .click();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await reader
            .getByRole("link", { name: "Historial", exact: true })
            .click();
        await expect(
            reader.getByText("Devuelto", { exact: true }),
        ).toBeVisible();
        await reader.screenshot({
            path: `${folder}/lector-historial-movil.png`,
            fullPage: true,
        });
        expect(
            await reader.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
            ),
        ).toBe(true);
        await reader.goto(`/catalog/${bookId}`);
        await expect(
            reader.getByText("1 de 1 ejemplares disponibles", { exact: true }),
        ).toBeVisible();
        await page.goto(`/manage/circulation?view=history&q=${unique}`);
        await expect(page.getByText("Devuelto", { exact: true })).toBeVisible();
        await page.screenshot({
            path: `${folder}/bibliotecario-devolucion.png`,
            fullPage: true,
        });
        expect(
            (
                await new AxeBuilder({ page })
                    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
                    .analyze()
            ).violations,
        ).toEqual([]);
        await page.goto(`/manage/books?q=${unique}`);
        await page
            .getByRole("button", { name: `Archivar ${title}`, exact: true })
            .click();
        await page
            .getByRole("dialog")
            .getByRole("button", { name: "Archivar libro", exact: true })
            .click();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await reader.goto("/my-library?view=history");
        await expect(
            reader.getByRole("heading", { name: title, exact: true }),
        ).toBeVisible();
        await expect(
            reader.getByRole("link", { name: title, exact: true }),
        ).toHaveCount(0);
        expect(errors).toEqual([]);
        expect(external).toEqual([]);
    } finally {
        await readerContext.close();
    }
});
