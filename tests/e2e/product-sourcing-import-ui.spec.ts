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

    await page.goto("/cash-register");
    await page.getByTestId("nav-item-products").click();
    await page.getByTestId("products-workspace-open-create-button").click();

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

    await page.getByTestId("nav-item-cash-register").click();
    await page.getByLabel("Buscar en el menú").fill(importedName);
    const salesCard = page
      .locator('[data-testid^="product-card-"]')
      .filter({ hasText: importedName })
      .first();
    await expect(salesCard).toBeVisible();
  });

  test("keeps partial failed imports actionable from the sourcing screen", async ({
    page,
  }) => {
    const marker = uniqueMarker();
    const duplicateSourceId = `dup-${marker}`;
    const newSourceId = `new-${marker}`;

    await page.route("**/api/v1/product-sourcing/search**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          providerId: "carrefour",
          items: [
            {
              providerId: "carrefour",
              sourceProductId: duplicateSourceId,
              name: `Duplicado ${marker}`,
              brand: "Carrefour",
              ean: `7790${marker.replace(/-/g, "").slice(-8)}`,
              categoryTrail: ["/Bebidas/Gaseosas/"],
              suggestedCategoryId: "drink",
              imageUrl: tinyPngDataUrl,
              referencePrice: 321.5,
              referenceListPrice: 350,
              productUrl: `https://example.com/${duplicateSourceId}`,
            },
            {
              providerId: "carrefour",
              sourceProductId: newSourceId,
              name: `Nuevo ${marker}`,
              brand: "Carrefour",
              ean: `7791${marker.replace(/-/g, "").slice(-8)}`,
              categoryTrail: ["/Bebidas/Gaseosas/"],
              suggestedCategoryId: "drink",
              imageUrl: tinyPngDataUrl,
              referencePrice: 654.5,
              referenceListPrice: 700,
              productUrl: `https://example.com/${newSourceId}`,
            },
          ],
          page: 1,
          pageSize: 8,
          hasMore: false,
        }),
      });
    });

    await page.goto("/products/sourcing");
    await page.getByTestId("product-sourcing-search-input").fill("lote parcial");
    await page.waitForTimeout(650);

    await page.getByTestId(`product-sourcing-toggle-${duplicateSourceId}`).click();
    await page.getByTestId(`product-sourcing-import-name-${duplicateSourceId}`).fill(
      `Importado antes ${marker}`,
    );
    await page.getByTestId(`product-sourcing-import-category-${duplicateSourceId}`).fill("drink");
    await page.getByTestId(`product-sourcing-import-price-${duplicateSourceId}`).fill("111");
    await page.getByTestId(`product-sourcing-import-stock-${duplicateSourceId}`).fill("1");
    await page.getByTestId(`product-sourcing-import-cost-${duplicateSourceId}`).fill("50");
    await page.getByTestId(`product-sourcing-import-min-stock-${duplicateSourceId}`).fill("0");
    await page.getByTestId("product-sourcing-import-button").click();

    await expect(page.getByTestId("product-sourcing-import-feedback")).toContainText(
      "Importacion completada: 1 productos creados.",
    );

    await page.getByTestId(`product-sourcing-toggle-${duplicateSourceId}`).click();
    await page.getByTestId(`product-sourcing-toggle-${newSourceId}`).click();
    await page.getByTestId(`product-sourcing-import-name-${newSourceId}`).fill(
      `Nuevo importado ${marker}`,
    );
    await page.getByTestId(`product-sourcing-import-category-${newSourceId}`).fill("drink");
    await page.getByTestId(`product-sourcing-import-price-${newSourceId}`).fill("222");
    await page.getByTestId(`product-sourcing-import-stock-${newSourceId}`).fill("2");
    await page.getByTestId(`product-sourcing-import-cost-${newSourceId}`).fill("80");
    await page.getByTestId(`product-sourcing-import-min-stock-${newSourceId}`).fill("1");
    await page.getByTestId("product-sourcing-import-button").click();

    await expect(page.getByTestId("product-sourcing-import-feedback")).toContainText(
      "Importacion completada: 1 productos creados y 1 rechazados.",
    );
    await expect(page.getByTestId("product-sourcing-pending-invalid-panel")).toBeVisible();
    await expect(
      page.getByTestId(`product-sourcing-invalid-result-${duplicateSourceId}`),
    ).toContainText("No recuperable");
    await expect(
      page.getByTestId(`product-sourcing-invalid-card-${duplicateSourceId}`),
    ).toContainText("No recuperable");
    await expect(page.getByTestId("product-sourcing-selected-count")).toHaveText("1");

    await page.getByTestId("product-sourcing-dismiss-terminal-invalid-button").click();
    await expect(page.getByTestId("product-sourcing-selected-count")).toHaveText("0");
    await expect(page.getByTestId("product-sourcing-pending-invalid-panel")).toHaveCount(0);
  });
});
