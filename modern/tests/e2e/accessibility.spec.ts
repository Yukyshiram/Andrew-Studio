import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const path of ["/", "/catalog", "/login", "/register"]) {
    test(`accesibilidad WCAG automatizada ${path}`, async ({ page }) => {
        const response = await page.goto(path);
        expect(response?.status()).toBe(200);
        await expect(page.getByRole("main")).toBeVisible();
        const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
            .analyze();
        expect(results.violations).toEqual([]);
    });
}

test("accesibilidad de las pantallas de gestión y perfil", async ({ page }) => {
    const login = await page.goto("/login");
    expect(login?.status()).toBe(200);
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
    for (const path of [
        "/dashboard",
        "/manage/books",
        "/manage/books/create",
        "/manage/users",
        "/manage/audit",
        "/profile",
    ]) {
        await page.goto(path);
        await expect(page.getByRole("main")).toBeVisible();
        const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
            .analyze();
        expect(results.violations, path).toEqual([]);
    }
    for (const path of ["/profile", "/"]) {
        await page.goto(path);
        const light = page.getByRole("button", {
            name: "Activar tema claro",
            exact: true,
        });
        if (await light.count()) {
            await light.click();
        }
        const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
            .analyze();
        expect(results.violations, `${path} en tema claro`).toEqual([]);
    }
});
