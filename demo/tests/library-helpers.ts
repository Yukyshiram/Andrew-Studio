import { expect, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

export async function settleAnimations(page: Page) {
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter(
          (animation) =>
            animation.effect?.getComputedTiming().iterations !== Infinity,
        )
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
}
export async function changeTheme(page: Page, theme: string) {
  const toggle = page.getByRole("button", {
    name: theme === "light" ? "Activar tema claro" : "Activar tema oscuro",
    exact: true,
  });
  if (await toggle.isVisible()) await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  await expect(page.locator("body")).toHaveCSS(
    "color",
    theme === "light" ? "rgb(32, 37, 30)" : "rgb(243, 242, 235)",
  );
  await settleAnimations(page);
}

export async function captureLibrary(
  page: Page,
  browserName: string,
  name: string,
) {
  const folder = path.resolve(
    process.env.DEMO_LIBRARY_SCREENSHOTS || "demo/output/library-screenshots",
    browserName,
  );
  await fs.mkdir(folder, { recursive: true });
  await page.evaluate(async () => {
    await document.fonts.ready;
    scrollTo({ top: 0, left: 0, behavior: "instant" });
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  await page.screenshot({
    path: path.join(folder, `${name}.png`),
    fullPage: true,
    animations: "disabled",
  });
}

export async function selectProfile(
  page: Page,
  name = "Andrea · Administración",
) {
  await page.getByRole("button", { name: /^Cambiar perfil ficticio:/ }).click();
  const dialog = page.getByRole("dialog", { name: "Elige un perfil ficticio" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name, exact: false }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: `Cambiar perfil ficticio: ${name}` }),
  ).toBeFocused();
}
export async function gotoAsAdmin(page: Page, href: string) {
  await page.goto(href);
  await selectProfile(page);
}
export async function navigation(page: Page, label: string) {
  const mobile = page.getByRole("button", {
    name: "Abrir navegación",
    exact: true,
  });
  if (await mobile.isVisible()) {
    await mobile.click();
    await page
      .getByRole("dialog")
      .getByRole("link", { name: label, exact: true })
      .click();
  } else
    await page
      .locator(".desktop-sidebar")
      .getByRole("link", { name: label, exact: true })
      .click();
}
export async function confirmSimulation(page: Page) {
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar simulación", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
