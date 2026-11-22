import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("políticas: confirmar, cancelar, guardar y conservar cambios", async ({
    page,
}) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
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
    await page.getByRole("link", { name: "Políticas", exact: true }).click();
    const duration = page.getByLabel("Duración del préstamo (días naturales)", {
        exact: true,
    });
    const original = await duration.inputValue();
    const changed = String(
        Number(original) === 365 ? 364 : Number(original) + 1,
    );
    await duration.fill(changed);
    await page
        .getByRole("button", { name: "Revisar cambios", exact: true })
        .click();
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await page.reload();
    await expect(duration).toHaveValue(original);
    await duration.fill(changed);
    await page
        .getByRole("button", { name: "Revisar cambios", exact: true })
        .click();
    await page
        .getByRole("button", { name: "Guardar política", exact: true })
        .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.reload();
    await expect(duration).toHaveValue(changed);
    expect(
        (
            await new AxeBuilder({ page })
                .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
                .analyze()
        ).violations,
    ).toEqual([]);
    await duration.fill(original);
    await page
        .getByRole("button", { name: "Revisar cambios", exact: true })
        .click();
    await page
        .getByRole("button", { name: "Guardar política", exact: true })
        .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(errors).toEqual([]);
});
