import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function staffLogin(page: Page) {
    await page.goto("/login");
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
}
test("inventario: alta, edición, búsqueda, teclado y tabla móvil", async ({
    page,
}) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await staffLogin(page);
    await page.getByRole("link", { name: "Ejemplares", exact: true }).click();
    await page
        .getByRole("button", { name: "Incorporar ejemplar", exact: true })
        .click();
    const code = `QA-COPY-${Date.now()}`;
    await page.getByLabel("Código de barras", { exact: true }).fill(code);
    await page
        .getByLabel("Ubicación", { exact: true })
        .fill("Sala de pruebas A1");
    await page
        .getByRole("button", { name: "Guardar ejemplar", exact: true })
        .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByLabel("Buscar", { exact: true }).fill(code);
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await page
        .getByRole("button", { name: `Editar ${code}`, exact: true })
        .click();
    await page
        .getByLabel("Condición física", { exact: true })
        .selectOption("damaged");
    await page
        .getByLabel("Estado de inventario", { exact: true })
        .selectOption("repair");
    await page
        .getByRole("button", { name: "Guardar ejemplar", exact: true })
        .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator("tbody tr")).toContainText("En reparación");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page
        .getByRole("region", { name: "Inventario, tabla desplazable" })
        .focus();
    await page.keyboard.press("ArrowRight");
    expect(
        (
            await new AxeBuilder({ page })
                .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
                .analyze()
        ).violations,
    ).toEqual([]);
    expect(errors).toEqual([]);
});
