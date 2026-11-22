import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import path from "node:path";
import books from "../src/data/books.json" with { type: "json" };

const routes = [
  "/",
  "/catalog",
  "/catalog/1",
  "/about",
  "/demo/admin",
  "/demo/admin/books",
  "/demo/admin/books?status=archived",
];
const publicNav = (page: Page) =>
  page.getByRole("navigation", { name: "Navegación principal", exact: true });
const rows = (page: Page) => page.locator(".admin-books-table tbody tr");
const runtimeChecks = new WeakMap<
  Page,
  { errors: string[]; requests: string[] }
>();
test.beforeEach(async ({ page, baseURL }) => {
  const checks = { errors: [] as string[], requests: [] as string[] };
  runtimeChecks.set(page, checks);
  page.on("pageerror", (error) => checks.errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") checks.errors.push(message.text());
  });
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.origin !== new URL(baseURL!).origin ||
      /\.php|\/api\/|localhost:808|collection-scene|\/three[\/.]/i.test(
        url.href,
      )
    )
      checks.requests.push(url.href);
  });
});
test.afterEach(async ({ page }) => {
  const checks = runtimeChecks.get(page);
  expect(checks?.errors ?? []).toEqual([]);
  expect(checks?.requests ?? []).toEqual([]);
});
async function audit(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await expect
    .poll(() =>
      page
        .locator(".book-card")
        .evaluateAll((nodes) =>
          nodes.every((el) => Number(getComputedStyle(el).opacity) >= 0.999),
        ),
    )
    .toBe(true);
  return new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
}

test("visitante: inicio, catálogo, búsqueda, filtros, ficha, acerca y ausencia de edición pública", async ({
  page,
  baseURL,
}) => {
  const errors: string[] = [];
  const forbidden: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("request", (r) => {
    const url = new URL(r.url());
    if (
      url.origin !== new URL(baseURL!).origin ||
      /\.php|\/api\/|localhost:808|collection-scene|\/three[\/.]/i.test(
        url.href,
      )
    )
      forbidden.push(url.href);
  });
  await page.goto("/");
  await expect(publicNav(page).getByRole("link")).toHaveText([
    "Inicio",
    "Catálogo",
    "Acerca del proyecto",
  ]);
  await expect(
    publicNav(page).getByRole("link", {
      name: /gestión|administrador|taller|editar/i,
    }),
  ).toHaveCount(0);
  await expect(
    page.locator(".sidebar-note,.edition-label,.demo-live-label,canvas"),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: "Explorar catálogo", exact: true })
    .click();
  await expect(page).toHaveURL(/\/catalog$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Catálogo de libros",
  );
  await expect(page.locator(".book-card")).toHaveCount(8);
  await page.getByRole("button", { name: "Página 2", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Página 2", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "Filosofía 4", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Filosofía 4", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".book-card")).toHaveCount(4);
  await page
    .getByRole("searchbox", { name: "Buscar por título, autor o editorial" })
    .fill("incertidumbre");
  await expect(page.locator(".book-card")).toHaveCount(1);
  await page
    .getByRole("link", {
      name: "Ver El valor de la incertidumbre",
      exact: true,
    })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "El valor de la incertidumbre",
  );
  await expect(
    page.getByText("Ficha ficticia de demostración", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("tabpanel")).toContainText(
    "Reflexiones sobre cómo decidir",
  );
  await page
    .getByRole("button", { name: "Abrir portada", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Cerrar portada", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("tab", { name: "Datos bibliográficos" }).click();
  await expect(page.getByRole("tabpanel")).toContainText("2021");
  await page.getByRole("button", { name: "Volver a la colección" }).click();
  await expect(page.getByRole("searchbox")).toHaveValue("incertidumbre");
  await publicNav(page)
    .getByRole("link", { name: "Acerca del proyecto" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Acerca del proyecto", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/no son sinopsis de publicaciones reales/),
  ).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(forbidden).toEqual([]);
});

test("administración: entrada secundaria, módulos, ruta anterior y regreso a visitante", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("link", {
      name: "Probar panel administrador",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/demo\/admin$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Resumen de la colección",
  );
  await expect(
    page.getByText("Modo demostración", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/se reinician al recargar/)).toBeVisible();
  await expect(publicNav(page).getByRole("link")).toHaveText([
    "Resumen",
    "Gestión de fichas",
  ]);
  await page
    .getByRole("link", { name: "Gestionar fichas", exact: true })
    .click();
  await expect(page).toHaveURL(/\/demo\/admin\/books$/);
  await expect(rows(page)).toHaveCount(8);
  await publicNav(page)
    .getByRole("link", { name: "Resumen", exact: true })
    .click();
  await expect(page).toHaveURL(/\/demo\/admin$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Resumen de la colección",
  );
  await page
    .getByRole("banner")
    .getByRole("link", { name: "Volver a la biblioteca" })
    .click();
  await expect(page).toHaveURL(/\/catalog$/);
  await expect(
    page.getByText("Modo demostración", { exact: true }),
  ).toHaveCount(0);
  await expect(
    publicNav(page).getByRole("link", { name: "Gestión de fichas" }),
  ).toHaveCount(0);
  await page.goto("/studio");
  await expect(page).toHaveURL(/\/demo\/admin$/);
});

test("administración: búsqueda, categorías, estados y paginación compacta", async ({
  page,
}) => {
  await page.goto("/demo/admin/books");
  await expect(rows(page)).toHaveCount(8);
  await page
    .getByRole("navigation", { name: "Paginación de fichas" })
    .getByRole("button", { name: "Siguiente" })
    .click();
  await expect(page).toHaveURL(/page=2/);
  await page.reload();
  await expect(page.getByText("Página 2 de 3", { exact: true })).toBeVisible();
  await page.getByLabel("Filtrar por categoría").selectOption("Historia");
  await expect(rows(page)).toHaveCount(4);
  await expect(
    page.getByRole("cell", { name: "X", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("searchbox", { name: "Buscar fichas", exact: true })
    .fill("archivo");
  await expect(rows(page)).toHaveCount(1);
  await page
    .getByRole("searchbox", { name: "Buscar fichas", exact: true })
    .fill("no existe");
  await expect(
    page.getByRole("heading", { name: "No hay fichas con estos filtros" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await expect(rows(page)).toHaveCount(8);
  await page.getByLabel("Estado de las fichas").selectOption("archived");
  await expect(
    page.getByRole("heading", { name: "El archivo está vacío" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Restaurar/ })).toHaveCount(0);
  await page.goto("/demo/admin/books?page=999&category=Literatura");
  await expect(page.getByText("Página 1 de 1", { exact: true })).toBeVisible();
  await expect(rows(page)).toHaveCount(4);
});

test("edición validada, archivo confirmado, cancelación, restauración y estado compartido", async ({
  page,
}) => {
  await page.goto("/demo/admin/books");
  const edit = page.getByRole("button", {
    name: "Editar La arquitectura del silencio",
    exact: true,
  });
  await edit.click();
  await page.getByLabel("Título", { exact: true }).fill("");
  await page.getByRole("button", { name: "Guardar en la demo" }).click();
  await expect(page.getByText("Escribe el título.")).toBeVisible();
  await expect(page.getByLabel("Título", { exact: true })).toBeFocused();
  await page
    .getByLabel("Título", { exact: true })
    .fill("Una perspectiva renovada");
  await page.getByRole("button", { name: "Guardar en la demo" }).click();
  await expect(
    page.getByRole("button", {
      name: "Editar Una perspectiva renovada",
      exact: true,
    }),
  ).toBeFocused();
  await page
    .getByRole("button", {
      name: "Archivar Una perspectiva renovada",
      exact: true,
    })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancelar", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Archivar Una perspectiva renovada",
      exact: true,
    }),
  ).toBeFocused();
  await page
    .getByRole("button", {
      name: "Archivar Una perspectiva renovada",
      exact: true,
    })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Archivar ficha", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Editar Una perspectiva renovada",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(page.locator(".admin-feedback")).toBeFocused();
  await page.getByLabel("Estado de las fichas").selectOption("archived");
  await expect(rows(page)).toHaveCount(1);
  await page
    .getByRole("button", {
      name: "Restaurar Una perspectiva renovada",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "El archivo está vacío" }),
  ).toBeVisible();
  await page
    .getByRole("banner")
    .getByRole("link", { name: "Volver a la biblioteca" })
    .click();
  await expect(page).toHaveURL(/\/catalog$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Catálogo de libros",
  );
  await expect(
    page.getByRole("link", {
      name: "Ver Una perspectiva renovada",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("link", {
      name: "Ver La arquitectura del silencio",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Ver Una perspectiva renovada",
      exact: true,
    }),
  ).toHaveCount(0);
});

test("alta simulada, escape de texto y restablecimiento confirmado sin persistencia", async ({
  page,
  context,
}) => {
  await page.goto("/demo/admin/books");
  await page.getByRole("button", { name: "Nueva ficha", exact: true }).click();
  await page.getByRole("button", { name: "Guardar en la demo" }).click();
  for (const label of ["Título", "Autor", "Editorial", "Año de publicación"])
    await expect(page.getByLabel(label, { exact: true })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  const title = "Cuaderno de pruebas locales";
  const description =
    '<img src=x onerror="window.__demoXss=1"> Texto de prueba.';
  await page.getByLabel("Título", { exact: true }).fill(title);
  await page.getByLabel("Autor", { exact: true }).fill("Autor ficticio");
  await page
    .getByLabel("Editorial", { exact: true })
    .fill("Editorial de ejemplo");
  await page
    .getByLabel("Año de publicación", { exact: true })
    .fill("2020–2024");
  await page.getByLabel("Categoría", { exact: true }).selectOption("General");
  await page.getByLabel("Color de portada").selectOption("purple");
  await page.getByLabel("Descripción", { exact: true }).fill(description);
  await page.getByRole("button", { name: "Guardar en la demo" }).click();
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page)).toContainText(title);
  await expect(rows(page)).toContainText("2020–2024");
  await publicNav(page)
    .getByRole("link", { name: "Resumen", exact: true })
    .click();
  await expect(page.locator(".admin-metric").first()).toContainText("25");
  await page
    .getByRole("banner")
    .getByRole("link", { name: "Volver a la biblioteca" })
    .click();
  await page.getByRole("searchbox").fill("Cuaderno de pruebas locales");
  await page.getByRole("link", { name: `Ver ${title}`, exact: true }).click();
  await expect(page.getByRole("tabpanel")).toHaveText(description);
  await expect(page.locator(".editorial-panel img")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => (window as unknown as { __demoXss?: number }).__demoXss,
    ),
  ).toBeUndefined();
  await page
    .getByRole("link", { name: "Probar panel administrador", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Restablecer datos", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancelar", exact: true })
    .click();
  await expect(page.locator(".admin-metric").first()).toContainText("25");
  await page
    .getByRole("button", { name: "Restablecer datos", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Restablecer datos", exact: true })
    .click();
  await expect(page.locator(".admin-metric").first()).toContainText("24");
  await expect(page.getByRole("status")).toContainText("restablecidos");
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((key) => key !== "bibliotecary-theme"),
    ),
  ).toEqual([]);
  expect(await context.cookies()).toEqual([]);
});

test("fichas diferenciadas: 24 rutas profundas, datos ficticios y ausencia de lectura inventada", async ({
  page,
}) => {
  expect(new Set(books.map((book) => book.description)).size).toBe(24);
  for (const book of books) {
    await page.goto(`/catalog/${book.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      book.title,
    );
    await expect(page.getByRole("tabpanel")).toHaveText(book.description);
    await expect(
      page.getByText("Ficha ficticia de demostración", { exact: true }),
    ).toBeVisible();
  }
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    books.at(-1)!.title,
  );
  await expect(
    page.getByRole("link", { name: /leer libro|descargar/i }),
  ).toHaveCount(0);
});

test("volver conserva filtros, página, foco y posición con navegación rápida", async ({
  page,
}) => {
  await page.goto("/catalog?page=2&sort=title");
  const link = page.locator(".book-card-cover").nth(6);
  await link.scrollIntoViewIfNeeded();
  await link.focus();
  const id = await link.getAttribute("data-book-id");
  const y = await page.evaluate(() => scrollY);
  await link.click();
  await expect(page).toHaveURL(new RegExp(`/catalog/${id}$`));
  await page.getByRole("button", { name: "Volver a la colección" }).click();
  await expect(page).toHaveURL(/page=2&sort=title/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(y, 0);
  await expect(page.locator(`[data-book-id="${id}"]`)).toBeFocused();
  for (let i = 0; i < 3; i++) {
    await page.locator(".book-card-cover").first().click();
    await page.getByRole("button", { name: "Volver a la colección" }).click();
  }
  await expect(page.locator(".book-card")).toHaveCount(8);
});

test("teclado, foco, Escape y tabs bibliográficos", async ({ page }) => {
  await page.goto("/catalog/1");
  await page.getByRole("tab", { name: "Descripción", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Datos bibliográficos" }),
  ).toBeFocused();
  await page.keyboard.press("Home");
  await expect(
    page.getByRole("tab", { name: "Descripción", exact: true }),
  ).toBeFocused();
  await page.goto("/demo/admin/books");
  const trigger = page.getByRole("button", {
    name: "Nueva ficha",
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  await expect
    .poll(() =>
      page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')),
    )
    .toBe(true);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("accesibilidad de todas las pantallas, formularios y confirmaciones en ambos temas", async ({
  page,
}) => {
  test.setTimeout(90000);
  for (const theme of ["dark", "light"]) {
    for (const route of routes) {
      await page.goto(route);
      await page.locator("main h1").waitFor();
      await page.evaluate(
        (value) => (document.documentElement.dataset.theme = value),
        theme,
      );
      expect((await audit(page)).violations, `${theme}: ${route}`).toEqual([]);
    }
  }
  await page.goto("/demo/admin/books");
  await page.getByRole("button", { name: "Nueva ficha", exact: true }).click();
  expect((await audit(page)).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", {
      name: "Archivar La arquitectura del silencio",
      exact: true,
    })
    .click();
  expect((await audit(page)).violations).toEqual([]);
});

test("responsive: todas las pantallas, menú móvil, foco y formularios sin desbordamiento", async ({
  page,
}) => {
  test.setTimeout(60000);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(route);
      await page.locator("main h1").waitFor();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${width}: ${route}`,
      ).toBe(true);
    }
    if (width < 781) {
      await page.goto("/");
      await page.getByRole("button", { name: "Abrir navegación" }).click();
      const menu = page.getByRole("dialog");
      await expect(menu).toBeVisible();
      await expect(menu.getByRole("navigation")).not.toContainText("Gestión");
      await menu
        .getByRole("link", {
          name: "Probar panel administrador",
          exact: true,
        })
        .click();
      await expect(menu).not.toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Resumen de la colección",
      );
      await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
      await page.getByRole("button", { name: "Abrir navegación" }).click();
      await page
        .getByRole("dialog")
        .getByRole("link", { name: "Gestión de fichas" })
        .click();
      await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    } else await page.goto("/demo/admin/books");
    await page
      .getByRole("button", { name: "Nueva ficha", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    expect(
      await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await page
      .getByRole("banner")
      .getByRole("link", { name: "Volver a la biblioteca" })
      .click();
    await expect(page).toHaveURL(/\/catalog$/);
  }
});

test("reduced-motion, sin View Transitions ni dependencias WebGL y estado vacío", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() =>
    Object.defineProperty(document, "startViewTransition", {
      value: undefined,
      configurable: true,
    }),
  );
  await page.goto("/");
  await expect(page.locator(".editorial-books")).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /vista 3D/i })).toHaveCount(0);
  await page
    .getByRole("link", { name: "Explorar catálogo", exact: true })
    .click();
  await page.getByRole("searchbox").fill("geometria");
  await expect(page.locator(".book-card")).toHaveCount(1);
  await page.locator(".book-card-cover").click();
  await page
    .getByRole("button", { name: "Abrir portada", exact: true })
    .click();
  expect(
    await page
      .locator(".physical-cover")
      .evaluate((el) => getComputedStyle(el).transform),
  ).toBe("none");
  await page.getByRole("button", { name: "Volver a la colección" }).click();
  await page.getByRole("searchbox").fill("no existe esa ficha");
  await expect(
    page.getByRole("heading", { name: "Todavía quedan caminos por explorar" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Activar tema claro" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Activar tema oscuro" }),
  ).toBeVisible();
  await page.goto("/ruta-desconocida");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "no está en la colección",
  );
});

test("capturas después: todas las pantallas en escritorio, tablet y móvil", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Capturas de referencia en Chromium; flujos en los tres motores.",
  );
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const folder = path.resolve(
    process.env.DEMO_SCREENSHOT_DIR || "docs/screenshots/v2.6/after",
  );
  await fs.mkdir(folder, { recursive: true });
  const sizes: Record<string, unknown> = {};
  async function shot(name: string) {
    await page.locator("main h1").waitFor();
    await page.evaluate(() => document.fonts.ready);
    await expect
      .poll(() =>
        page
          .locator(".book-card")
          .evaluateAll((nodes) =>
            nodes.every((el) => Number(getComputedStyle(el).opacity) >= 0.999),
          ),
      )
      .toBe(true);
    await page.evaluate(async () => {
      const paint = () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        );
      for (
        let y = 0;
        y < document.documentElement.scrollHeight;
        y += innerHeight
      ) {
        scrollTo({ top: y, behavior: "instant" });
        await paint();
      }
      scrollTo({ top: 0, behavior: "instant" });
      await paint();
    });
    await page.screenshot({
      path: path.join(folder, name + ".png"),
      fullPage: true,
    });
    sizes[name] = await page.evaluate(() => ({
      width: innerWidth,
      height: innerHeight,
      documentHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
    }));
  }
  for (const [device, width, height] of [
    ["desktop", 1440, 1000],
    ["tablet", 768, 1024],
    ["mobile", 390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    for (const [name, route] of [
      ["inicio", "/"],
      ["catalogo", "/catalog"],
      ["ficha", "/catalog/1"],
      ["acerca", "/about"],
      ["resumen", "/demo/admin"],
      ["fichas", "/demo/admin/books"],
      ["archivo", "/demo/admin/books?status=archived"],
    ]) {
      await page.goto(route);
      await shot(`${device}-${name}`);
    }
    await page.goto("/demo/admin/books");
    await page
      .getByRole("button", {
        name: "Editar La arquitectura del silencio",
        exact: true,
      })
      .click();
    await shot(`${device}-edicion`);
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", {
        name: "Archivar La arquitectura del silencio",
        exact: true,
      })
      .click();
    await shot(`${device}-confirmacion`);
    await page.keyboard.press("Escape");
  }
  await fs.writeFile(
    process.env.DEMO_SIZES_FILE || "docs/evidence/ux26-screen-sizes.json",
    JSON.stringify({ recordedAt: new Date().toISOString(), sizes }, null, 2) +
      "\n",
  );
});
