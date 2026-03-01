import { expect, test } from "@playwright/test";

function uniqueMarker(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

const tinyPngDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9s0lH8sAAAAASUVORK5CYII=";

test.describe("product sourcing UI assisted import", () => {
  test.skip(
    process.env.POS_BACKEND_MODE !== "supabase",
    "This suite validates real backend persistence with POS_BACKEND_MODE=supabase.",
  );

  test("imports a selected external product from the sourcing screen into the products workspace", async ({
    page,
  }) => {
    const marker = uniqueMarker();
    const sourceProductId = `src-${marker}`;
    const importedName = `Sourcing UI ${marker}`;
    const importedPrice = "123.45";

    await page.route("**/api/v1/product-sourcing/search**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          providerId: "carrefour",
          items: [
            {
              providerId: "carrefour",
              sourceProductId,
              name: `Proveedor ${marker}`,
              brand: "Carrefour",
              ean: `7790${marker.replace(/-/g, "").slice(-8)}`,
              categoryTrail: ["/Bebidas/Gaseosas/"],
              suggestedCategoryId: "drink",
              imageUrl: tinyPngDataUrl,
              referencePrice: 321.5,
              referenceListPrice: 350,
              productUrl: `https://example.com/${sourceProductId}`,
            },
          ],
          page: 1,
          pageSize: 8,
          hasMore: false,
        }),
      });
    });

    await page.goto("/sales");
    await page.getByTestId("nav-item-products").click();
    await page.getByTestId("products-workspace-open-sourcing-link").click();

    await expect(page).toHaveURL(/\/products\/sourcing$/);
    await page.getByTestId("product-sourcing-search-input").fill("cola externa");
    await page.waitForTimeout(650);

    await expect(page.getByTestId(`product-sourcing-result-${sourceProductId}`)).toBeVisible();
    await page.getByTestId(`product-sourcing-toggle-${sourceProductId}`).click();
    await expect(page.getByTestId("product-sourcing-selected-count")).toHaveText("1");

    await page.getByTestId(`product-sourcing-import-name-${sourceProductId}`).fill(importedName);
    await page.getByTestId(`product-sourcing-import-category-${sourceProductId}`).fill("drink");
    await page.getByTestId(`product-sourcing-import-price-${sourceProductId}`).fill(importedPrice);
    await page.getByTestId(`product-sourcing-import-stock-${sourceProductId}`).fill("5");
    await page.getByTestId(`product-sourcing-import-cost-${sourceProductId}`).fill("70");
    await page.getByTestId(`product-sourcing-import-min-stock-${sourceProductId}`).fill("2");
    await page.getByTestId("product-sourcing-import-button").click();

    await expect(page.getByTestId("product-sourcing-import-feedback")).toContainText(
      "Importacion completada: 1 productos creados.",
    );
    await expect(page.getByTestId(`product-sourcing-import-result-${sourceProductId}`)).toContainText(
      importedName,
    );
    await expect(
      page.getByTestId(`product-sourcing-history-row-${sourceProductId}`),
    ).toContainText(importedName);
    await expect(
      page.getByTestId(`product-sourcing-history-row-${sourceProductId}`),
    ).toContainText(`CRF-${sourceProductId.toUpperCase()}`);

    await page.getByTestId("product-sourcing-go-products-link").click();
    await expect(page).toHaveURL(/\/products$/);

    await page.getByTestId("products-workspace-search-input").fill(importedName);
    const productCard = page
      .locator('[data-testid^="products-workspace-card-"]')
      .filter({ hasText: importedName })
      .first();
    await expect(productCard).toBeVisible();
    await expect(productCard).toContainText("$123.45");
    await expect(productCard.locator("img").first()).toHaveAttribute(
      "src",
      /\/storage\/v1\/object\/public\/product-sourcing-images\//,
    );

    await page.getByTestId("nav-item-sales").click();
    await page.getByLabel("Buscar en el menú").fill(importedName);
    const salesCard = page
      .locator('[data-testid^="product-card-"]')
      .filter({ hasText: importedName })
      .first();
    await expect(salesCard).toBeVisible();
  });
});
