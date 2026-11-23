import { test, expect } from "@playwright/test";

for (const reduced of [false, true]) {
  test(`filtrar conserva la tarjeta y ${reduced ? "omite" : "anima"} su desplazamiento`, async ({
    page,
    baseURL,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("request", (request) => {
      if (new URL(request.url()).origin !== new URL(baseURL!).origin)
        errors.push("Petición externa durante el filtro");
    });
    await page.emulateMedia({
      reducedMotion: reduced ? "reduce" : "no-preference",
    });
    await page.goto("/catalog");
    await expect(page.locator(".book-card")).toHaveCount(8);
    await expect
      .poll(() =>
        page
          .locator(".book-card")
          .evaluateAll((cards) =>
            cards.every(
              (card) => Number(getComputedStyle(card).opacity) >= 0.999,
            ),
          ),
      )
      .toBe(true);
    await page.evaluate(() => {
      const card = document
        .querySelector('[data-book-id="2"]')!
        .closest("article")!;
      const beforeX = card.getBoundingClientRect().x;
      const filter = [
        ...document.querySelectorAll<HTMLButtonElement>(
          ".category-chips button",
        ),
      ].find((button) => button.textContent?.startsWith("Ciencia"))!;
      const result = new Promise<{
        maximumTranslationX: number;
        displacementX: number;
        sameElement: boolean;
      }>((resolve) => {
        filter.addEventListener(
          "click",
          () => {
            const until = performance.now() + 750;
            let maximumTranslationX = 0;
            function observe() {
              const transform = getComputedStyle(card).transform;
              if (transform !== "none")
                maximumTranslationX = Math.max(
                  maximumTranslationX,
                  Math.abs(new DOMMatrixReadOnly(transform).m41),
                );
              if (performance.now() < until) requestAnimationFrame(observe);
              else
                resolve({
                  maximumTranslationX,
                  displacementX: Math.abs(
                    card.getBoundingClientRect().x - beforeX,
                  ),
                  sameElement:
                    card ===
                    document
                      .querySelector('[data-book-id="2"]')
                      ?.closest("article"),
                });
            }
            requestAnimationFrame(observe);
          },
          { once: true },
        );
      });
      Object.assign(window, { __bibliotecaryLayoutProbe: result });
    });
    await page.getByRole("button", { name: "Ciencia 4", exact: true }).click();
    await expect(page.locator(".book-card")).toHaveCount(4);
    const result = await page.evaluate(
      () =>
        (
          window as typeof window & {
            __bibliotecaryLayoutProbe: Promise<{
              maximumTranslationX: number;
              displacementX: number;
              sameElement: boolean;
            }>;
          }
        ).__bibliotecaryLayoutProbe,
    );
    expect(result.sameElement).toBe(true);
    expect(result.displacementX).toBeGreaterThan(40);
    if (reduced) expect(result.maximumTranslationX).toBeLessThan(0.5);
    else expect(result.maximumTranslationX).toBeGreaterThan(4);
    expect(errors).toEqual([]);
  });
}
