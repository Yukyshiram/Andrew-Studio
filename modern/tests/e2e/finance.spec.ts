import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";

async function audit(page: Page) {
    await page.evaluate(() => document.fonts.ready);
    return new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
}

test("tesorería real: cargo exacto, consulta privada, pago, reversión e historial accesible", async ({
    page,
    browser,
    baseURL,
    browserName,
}) => {
    test.setTimeout(120_000);
    const unique = Date.now().toString();
    const name = `Socio tesorería QA ${unique}`;
    const reason = `Cargo sintético ${unique} <img src=x onerror=alert(1)>`;
    const errors: string[] = [];
    const external: string[] = [];
    const readerContext = await browser.newContext({
        baseURL,
        locale: "es-MX",
        viewport: { width: 390, height: 844 },
        reducedMotion: "reduce",
    });
    const reader = await readerContext.newPage();
    const folder = process.env.FINANCE_SCREENSHOT_DIR
        ? `${process.env.FINANCE_SCREENSHOT_DIR}/${browserName}`
        : browserName === "chromium"
          ? "output/playwright/finance"
          : `output/playwright/finance/${browserName}`;
    await fs.mkdir(folder, { recursive: true });
    for (const surface of [page, reader]) {
        surface.on("pageerror", (error) => errors.push(error.message));
        surface.on("console", (message) => {
            if (message.type() === "error") errors.push(message.text());
        });
        surface.on("dialog", async (dialog) => {
            errors.push(`Diálogo inesperado: ${dialog.type()}`);
            await dialog.dismiss();
        });
        surface.on("request", (request) => {
            if (new URL(request.url()).origin !== new URL(baseURL!).origin)
                external.push(request.url());
        });
    }
    try {
        await reader.goto("/register");
        await reader.getByLabel("Tu nombre", { exact: true }).fill(name);
        await reader
            .getByLabel("Correo electrónico", { exact: true })
            .fill(`qa-finance-${unique}@example.test`);
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
        await reader.goto("/my-library");
        await reader
            .getByRole("link", { name: "Cargos y saldo", exact: true })
            .click();
        await expect(
            reader.getByRole("heading", {
                name: "Sin movimientos en esta vista",
                exact: true,
            }),
        ).toBeVisible();

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
        await page
            .getByRole("link", { name: "Tesorería", exact: true })
            .click();
        await page.getByLabel("Buscar socio", { exact: true }).fill(name);
        await page
            .getByRole("button", { name: "Consultar periodo", exact: true })
            .click();
        await page
            .locator(".library-member-picker")
            .getByRole("link")
            .filter({ hasText: name })
            .click();
        await expect(
            page.getByRole("heading", {
                name: `Cuenta de ${name}`,
                exact: true,
            }),
        ).toBeVisible();
        await page
            .getByRole("button", { name: "Registrar movimiento", exact: true })
            .click();
        await page
            .getByLabel("Tipo de movimiento", { exact: true })
            .selectOption("adjustment");
        await page.getByLabel("Importe (MXN)", { exact: true }).fill("1.234");
        await page.getByLabel("Motivo", { exact: true }).fill(reason);
        await page
            .getByLabel("Referencia (opcional)", { exact: true })
            .fill(`REC-QA-${unique}`);
        await page
            .getByRole("button", { name: "Confirmar registro", exact: true })
            .click();
        await expect(page.locator("#finance-amount-error")).toBeVisible();
        await page.getByLabel("Importe (MXN)", { exact: true }).fill("125.50");
        await page.screenshot({
            path: `${folder}/confirmar-cargo.png`,
            fullPage: true,
        });
        await page
            .getByRole("button", { name: "Confirmar registro", exact: true })
            .click();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await expect(page.locator(".data-table tbody tr")).toHaveCount(1);
        await expect(page.locator('img[src="x"]')).toHaveCount(0);
        await reader.reload();
        await expect(reader.locator(".data-table tbody tr")).toHaveCount(1);
        await expect(reader.locator(".data-table")).toContainText(reason);
        await expect(
            reader
                .locator('[aria-label="Resumen de la cuenta financiera"]')
                .getByText("$125.50", { exact: true }),
        ).toHaveCount(2);
        await expect(
            reader.getByRole("button", {
                name: "Registrar movimiento",
                exact: true,
            }),
        ).toHaveCount(0);
        await reader.screenshot({
            path: `${folder}/cuenta-lector-movil.png`,
            fullPage: true,
        });
        expect((await audit(reader)).violations).toEqual([]);
        expect(
            await reader.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
            ),
        ).toBe(true);

        await page
            .getByRole("button", { name: "Registrar movimiento", exact: true })
            .click();
        await page.getByLabel("Importe (MXN)", { exact: true }).fill("999.00");
        await expect(
            page.getByLabel("Tipo de movimiento", { exact: true }),
        ).toHaveValue("payment");
        await expect(
            page.getByLabel("Referencia (opcional)", { exact: true }),
        ).toHaveValue("");
        await page
            .getByLabel("Motivo", { exact: true })
            .fill(`Pago sintético ${unique}`);
        await page
            .getByRole("button", { name: "Confirmar registro", exact: true })
            .click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await expect(
            page.getByText(
                "El movimiento superaría el saldo pendiente. No se registran sobrepagos ni saldos a favor en esta versión.",
                { exact: true },
            ),
        ).toBeVisible();
        await page.getByLabel("Importe (MXN)", { exact: true }).fill("25.50");
        await page
            .getByRole("button", { name: "Confirmar registro", exact: true })
            .click();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await expect(
            page
                .locator('[aria-label="Resumen de la cuenta financiera"]')
                .getByText("$100.00", { exact: true }),
        ).toHaveCount(2);
        const payment = page
            .locator(".data-table tbody tr")
            .filter({ hasText: `Pago sintético ${unique}` });
        await payment
            .getByRole("button", { name: /^Revertir movimiento / })
            .click();
        await page
            .getByLabel("Motivo", { exact: true })
            .fill(`Corrección sintética ${unique}`);
        await page
            .getByRole("button", { name: "Confirmar registro", exact: true })
            .click();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await expect(payment).toContainText("Revertido por el movimiento #");
        await expect(
            page.locator("main p[tabindex='-1']").first(),
        ).toBeFocused();
        await expect(
            page
                .locator('[aria-label="Resumen de la cuenta financiera"]')
                .getByText("$125.50", { exact: true }),
        ).toHaveCount(2);
        await expect(
            page
                .locator(".library-metrics .panel")
                .filter({ hasText: "Pagos netos del periodo" }),
        ).toContainText("$0.00");
        await expect(page.locator(".data-table tbody tr")).toHaveCount(3);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
            path: `${folder}/tesoreria-escritorio.png`,
            fullPage: true,
        });
        expect((await audit(page)).violations).toEqual([]);
        await page.setViewportSize({ width: 390, height: 844 });
        await page.screenshot({
            path: `${folder}/tesoreria-movil.png`,
            fullPage: true,
        });
        expect(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
            ),
        ).toBe(true);
        await reader
            .getByRole("button", { name: "Actualizar mis cargos", exact: true })
            .click();
        await expect(reader.locator(".data-table tbody tr")).toHaveCount(3);
        await reader.reload();
        await expect(reader.locator(".data-table tbody tr")).toHaveCount(3);
        await expect(
            reader
                .locator('[aria-label="Resumen de la cuenta financiera"]')
                .getByText("$125.50", { exact: true }),
        ).toHaveCount(2);
        expect(errors).toEqual([]);
        expect(external).toEqual([]);
    } finally {
        await readerContext.close();
    }
});
