import { test, expect, type Page } from "@playwright/test";

async function login(
    page: Page,
    role: "admin" | "librarian" | "reader" = "admin",
) {
    const accounts = {
        admin: ["demo.admin@example.test", "Demo-Admin2026!"],
        librarian: ["demo.biblioteca@example.test", "Demo-Biblio2026!"],
        reader: ["demo.lector@example.test", "Demo-Lector2026!"],
    };
    await page.goto("/login");
    await page
        .getByLabel("Correo electrónico", { exact: true })
        .fill(accounts[role][0]);
    await page
        .getByLabel("Contraseña", { exact: true })
        .fill(accounts[role][1]);
    await page
        .getByRole("button", { name: "Entrar a mi biblioteca", exact: true })
        .click();
    await expect(page).toHaveURL(/\/dashboard$/);
}

test("catálogo: búsqueda, filtros, paginación, estado vacío y vista de tabla", async ({
    page,
}) => {
    await page.goto("/catalog");
    await expect(page.locator(".catalog-grid .book-card")).toHaveCount(12);
    await page.getByRole("link", { name: "Siguiente", exact: true }).click();
    await expect(page).toHaveURL(/page=2/);
    await page.goto("/catalog");
    await page.getByLabel("Categoría", { exact: true }).selectOption("Ciencia");
    await expect(page).toHaveURL(/category=Ciencia/);
    await expect(
        page.locator(".catalog-grid .book-card").first(),
    ).toBeVisible();
    for (const badge of await page
        .locator(".catalog-grid .book-card .badge")
        .all()) {
        await expect(badge).toHaveText("Ciencia");
    }
    await page.goto("/catalog");
    await page
        .getByLabel("Buscar por título, autor o editorial")
        .fill("La arquitectura del silencio");
    await expect(page).toHaveURL(/q=La/);
    await expect(page.locator(".catalog-grid .book-card")).toHaveCount(1);
    await page.getByRole("button", { name: "Vista de tabla" }).click();
    await expect(page.locator(".book-table tbody tr")).toHaveCount(1);
    await page
        .getByLabel("Buscar por título, autor o editorial")
        .fill("TITULO-QA-INEXISTENTE-907");
    await expect(
        page.getByRole("heading", { name: "Aquí empieza otra búsqueda." }),
    ).toBeVisible();
});

test("registro público crea lector, impide administración y permite salir", async ({
    page,
}) => {
    const email = `qa-reader-${Date.now()}@example.test`;
    await page.goto("/register");
    await page
        .getByLabel("Tu nombre", { exact: true })
        .fill("Lector de prueba E2E");
    await page.getByLabel("Correo electrónico", { exact: true }).fill(email);
    await page
        .getByLabel("Elige una contraseña", { exact: true })
        .fill("Prueba-Segura2026!");
    await page
        .getByLabel("Repite tu contraseña", { exact: true })
        .fill("Prueba-Segura2026!");
    await page
        .getByRole("button", { name: "Crear mi cuenta", exact: true })
        .click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
        page.getByRole("link", { name: "Gestionar libros", exact: true }),
    ).toHaveCount(0);
    const forbidden = await page.goto("/manage/users");
    expect(forbidden?.status()).toBe(403);
    await page.goto("/dashboard");
    await page
        .getByRole("button", { name: "Cerrar sesión", exact: true })
        .click();
    await expect(page).toHaveURL(/\/$/);
    await expect(
        page.getByRole("link", { name: "Entrar a mi cuenta", exact: true }),
    ).toBeVisible();
});

test("bibliotecario: alta, edición, escape XSS, archivado y restauración", async ({
    page,
}) => {
    const unique = `QA-${Date.now()}`;
    const title = `${unique} <img src=x onerror="window.__bookXss=true">`;
    await login(page, "librarian");
    await page.goto("/manage/books/create");
    await page.getByLabel("Título de la obra *", { exact: true }).fill(title);
    await page
        .getByLabel("Autor *", { exact: true })
        .fill("Autor O'Connor de prueba");
    await page
        .getByLabel("Editorial *", { exact: true })
        .fill("Editorial ficticia de QA");
    await page
        .getByLabel("Año de publicación *", { exact: true })
        .fill("X / edición 2026");
    await page
        .getByLabel("Categoría *", { exact: true })
        .selectOption("Tecnología");
    await page
        .getByLabel("Descripción", { exact: true })
        .fill(
            "<script>window.__bookXss=true</script> Descripción de prueba con ñ.",
        );
    await page
        .getByRole("button", { name: "Incorporar libro", exact: true })
        .click();
    await expect(page).toHaveURL(/\/catalog\/\d+$/);
    const id = page.url().split("/").at(-1);
    await expect(
        page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    expect(
        await page.evaluate(
            () => (window as typeof window & { __bookXss?: boolean }).__bookXss,
        ),
    ).toBeUndefined();
    await expect(page.locator('main img[src="x"]')).toHaveCount(0);
    await page.goto(`/manage/books/${id}/edit`);
    await page
        .getByLabel("Editorial *", { exact: true })
        .fill("Editorial QA actualizada");
    await page
        .getByRole("button", { name: "Guardar cambios", exact: true })
        .click();
    await expect(
        page.getByText("Editorial QA actualizada", { exact: true }),
    ).toBeVisible();
    await page.goto(`/manage/books?q=${unique}`);
    await page
        .getByRole("button", { name: `Archivar ${title}`, exact: true })
        .click();
    await page
        .getByRole("dialog")
        .getByRole("button", { name: "Archivar libro", exact: true })
        .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.goto(`/manage/books?status=trash&q=${unique}`);
    await page.getByRole("button", { name: "Restaurar", exact: true }).click();
    await page
        .getByRole("dialog")
        .getByRole("button", { name: "Restaurar libro", exact: true })
        .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.goto(`/catalog?q=${unique}`);
    await expect(
        page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
});

test("administrador: cuenta de trabajo, cambio de rol e historial", async ({
    page,
}) => {
    const name = `Persona QA ${Date.now()}`;
    await login(page);
    await page.goto("/manage/users");
    await page
        .getByRole("button", { name: "Crear cuenta", exact: true })
        .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nombre", { exact: true }).fill(name);
    await dialog
        .getByLabel("Correo electrónico", { exact: true })
        .fill(`qa-admin-created-${Date.now()}@example.test`);
    await dialog.getByLabel("Rol", { exact: true }).selectOption("librarian");
    await dialog
        .getByLabel("Contraseña inicial", { exact: true })
        .fill("Prueba-Segura2026!");
    await dialog
        .getByLabel("Repite la contraseña", { exact: true })
        .fill("Prueba-Segura2026!");
    await dialog
        .getByRole("button", { name: "Crear cuenta", exact: true })
        .click();
    await expect(dialog).toHaveCount(0);
    const row = page.getByRole("row").filter({ hasText: name });
    await row.getByRole("button", { name: "Cambiar rol", exact: true }).click();
    await page
        .getByRole("dialog")
        .getByLabel("Rol de la cuenta")
        .selectOption("reader");
    await page
        .getByRole("dialog")
        .getByRole("button", { name: "Guardar rol", exact: true })
        .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(row.getByText("Lector", { exact: true })).toBeVisible();
    await page.goto("/manage/audit");
    await expect(page.locator(".data-table tbody tr").first()).toBeVisible();
});

test("servidor real: CSRF, cookies, cabeceras y archivos privados", async ({
    page,
    request,
}) => {
    await login(page);
    const response = await page.request.post("/manage/books", {
        data: { title: "Sin token QA" },
    });
    expect(response.status()).toBe(419);
    const home = await request.get("/");
    expect(home.status()).toBe(200);
    expect(home.headers()["content-security-policy"]).toContain(
        "frame-ancestors 'none'",
    );
    expect(home.headers()["x-content-type-options"]).toBe("nosniff");
    expect(home.headers()["x-frame-options"]).toBe("DENY");
    const session = (await page.context().cookies()).find(
        (cookie) => cookie.name === "bibliotecary_e2e_session",
    );
    expect(session?.httpOnly).toBe(true);
    expect(session?.sameSite).toBe("Lax");
    for (const privatePath of [
        "/.env",
        "/.git/HEAD",
        "/compose.yaml",
        "/database/schema.sql",
        "/info.php",
        "/storage/app/private/e2e.sqlite",
    ]) {
        const result = await request.get(privatePath);
        expect([403, 404]).toContain(result.status());
    }
});

test("navegación móvil y teclado sin desbordamiento horizontal", async ({
    page,
}) => {
    for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const path of ["/", "/catalog", "/login", "/register"]) {
            await page.goto(path);
            await expect(page.getByRole("main")).toBeVisible();
            expect(
                await page.evaluate(
                    () =>
                        document.documentElement.scrollWidth <=
                        window.innerWidth + 1,
                ),
            ).toBe(true);
        }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Abrir navegación" }).click();
    await page
        .getByRole("link", { name: "Explorar catálogo", exact: true })
        .click();
    await expect(page).toHaveURL(/\/catalog$/);
    await page.goto("/login");
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toBeVisible();
});

test("tablas administrativas contienen el desplazamiento dentro de su contenedor", async ({
    page,
}) => {
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
    for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const route of ["/manage/books", "/manage/users"]) {
            await page.goto(route);
            await page.getByRole("heading", { level: 1 }).waitFor();
            await page.evaluate(() => document.fonts.ready);
            expect(
                await page.evaluate(
                    () => document.documentElement.scrollWidth <= innerWidth,
                ),
                `${width}: ${route}`,
            ).toBe(true);
            const table = page.locator(".table-wrap");
            if (width === 390) {
                expect(
                    await table.evaluate(
                        (element) => element.scrollWidth > element.clientWidth,
                    ),
                ).toBe(true);
                await table.focus();
                await expect(table).toBeFocused();
                await page.keyboard.press("ArrowRight");
                await expect
                    .poll(() => table.evaluate((element) => element.scrollLeft))
                    .toBeGreaterThan(0);
                expect(await page.evaluate(() => scrollX)).toBe(0);
            }
        }
    }
});

test("movimiento reducido conserva las portadas editoriales", async ({
    page,
}) => {
    await page.goto("/");
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(page.locator(".editorial-books")).toBeVisible();
    await expect(page.getByRole("button", { name: /vista 3D/i })).toHaveCount(
        0,
    );
    await expect(page.locator("canvas")).toHaveCount(0);
});

test("portada editorial sin controles de escena 3D", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await expect(page.locator(".editorial-books")).toBeVisible();
    await expect(page.getByRole("button", { name: /vista 3D/i })).toHaveCount(
        0,
    );
    await expect(page.locator("canvas")).toHaveCount(0);
});

test("cambiar contraseña invalida la cookie anterior de la misma sesión", async ({
    page,
    browser,
}) => {
    await page.goto("/register");
    await page
        .getByLabel("Tu nombre", { exact: true })
        .fill("Sesión ficticia de QA");
    await page
        .getByLabel("Correo electrónico", { exact: true })
        .fill(`qa-session-${Date.now()}@example.test`);
    await page
        .getByLabel("Elige una contraseña", { exact: true })
        .fill("Prueba-Segura2026!");
    await page
        .getByLabel("Repite tu contraseña", { exact: true })
        .fill("Prueba-Segura2026!");
    await page
        .getByRole("button", { name: "Crear mi cuenta", exact: true })
        .click();
    await expect(page).toHaveURL(/\/dashboard$/);
    const oldCookies = await page.context().cookies();
    await page.goto("/profile");
    await page
        .getByLabel("Contraseña actual", { exact: true })
        .fill("Prueba-Segura2026!");
    await page
        .getByLabel("Nueva contraseña", { exact: true })
        .fill("Otra-PruebaSegura2026!");
    await page
        .getByLabel("Repite la nueva contraseña", { exact: true })
        .fill("Otra-PruebaSegura2026!");
    await page
        .getByRole("button", { name: "Actualizar contraseña", exact: true })
        .click();
    await expect(
        page.getByText(
            "Contraseña actualizada. Se cerraron las otras sesiones.",
            { exact: true },
        ),
    ).toBeVisible();
    const oldContext = await browser.newContext();
    try {
        await oldContext.addCookies(oldCookies);
        const response = await oldContext.request.get(
            new URL("/dashboard", page.url()).href,
            { maxRedirects: 0 },
        );
        expect(response.status()).toBe(302);
        expect(new URL(response.headers().location).pathname).toBe("/login");
    } finally {
        await oldContext.close();
    }
});

test("recuperación completa mediante SMTP local y token de un solo uso", async ({
    page,
    request,
}) => {
    const email = `qa-recovery-${Date.now()}@example.test`;
    await page.goto("/register");
    await page
        .getByLabel("Tu nombre", { exact: true })
        .fill("Recuperación ficticia QA");
    await page.getByLabel("Correo electrónico", { exact: true }).fill(email);
    await page
        .getByLabel("Elige una contraseña", { exact: true })
        .fill("Prueba-Segura2026!");
    await page
        .getByLabel("Repite tu contraseña", { exact: true })
        .fill("Prueba-Segura2026!");
    await page
        .getByRole("button", { name: "Crear mi cuenta", exact: true })
        .click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page
        .getByRole("button", { name: "Cerrar sesión", exact: true })
        .click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/forgot-password");
    await page.getByLabel("Correo electrónico", { exact: true }).fill(email);
    await page
        .getByRole("button", {
            name: "Enviar enlace de recuperación",
            exact: true,
        })
        .click();
    await expect(
        page.getByText("Solicitud recibida. Revisa tu correo para continuar.", {
            exact: true,
        }),
    ).toBeVisible();
    const mailBase = process.env.MAILPIT_URL || "http://localhost:8026";
    let messageId: string | undefined;
    await expect
        .poll(async () => {
            const result = await request.get(`${mailBase}/api/v1/search`, {
                params: { query: `to:${email}` },
            });
            const body = await result.json();
            messageId = body.messages?.find(
                (message: { ID: string; To: { Address: string }[] }) =>
                    message.To.some((to) => to.Address === email),
            )?.ID;
            return !!messageId;
        })
        .toBe(true);
    const message = await (
        await request.get(`${mailBase}/api/v1/message/${messageId}`)
    ).json();
    const resetLink = (message.Text as string).match(
        /https?:\/\/[^\s)]+\/reset-password\/[^\s)]+/,
    )?.[0];
    if (!resetLink)
        throw new Error(
            "El correo de prueba no contiene un enlace de recuperación.",
        );
    expect(new URL(resetLink).origin).toBe(new URL(page.url()).origin);
    await page.goto(resetLink);
    await page
        .getByLabel("Nueva contraseña", { exact: true })
        .fill("Recuperada-Segura2026!");
    await page
        .getByLabel("Repite la nueva contraseña", { exact: true })
        .fill("Recuperada-Segura2026!");
    await page
        .getByRole("button", { name: "Guardar nueva contraseña", exact: true })
        .click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto(resetLink);
    await page
        .getByLabel("Nueva contraseña", { exact: true })
        .fill("Reuso-NoPermitido2026!");
    await page
        .getByLabel("Repite la nueva contraseña", { exact: true })
        .fill("Reuso-NoPermitido2026!");
    await page
        .getByRole("button", { name: "Guardar nueva contraseña", exact: true })
        .click();
    await expect(
        page.getByText("Este enlace no es válido o ha caducado.", {
            exact: true,
        }),
    ).toBeVisible();
});
