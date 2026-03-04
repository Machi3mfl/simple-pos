import { expect, test } from "./support/test";

import { getProductSourcingSessionStorageKey } from "../../src/modules/product-sourcing/presentation/session/productSourcingSessionStorage";

const searchResponse = {
  providerId: "carrefour",
  items: [
    {
      providerId: "carrefour",
      sourceProductId: "393964",
      name: "Gaseosa cola Coca Cola Zero 2,25 lts",
      brand: "Coca Cola",
      ean: "7790895067570",
      categoryTrail: ["/Bebidas/Gaseosas/Gaseosas cola/", "/Bebidas/Gaseosas/"],
      suggestedCategoryId: "gaseosas-cola",
      imageUrl:
        "https://carrefourar.vteximg.com.br/arquivos/ids/395283/7790895067570_E01.jpg?v=638326494223030000",
      referencePrice: 5250,
      referenceListPrice: 5499,
      productUrl: "https://www.carrefour.com.ar/gaseosa-cola-coca-cola-zero-225-lts-393964/p",
    },
    {
      providerId: "carrefour",
      sourceProductId: "30138",
      name: "Gaseosa cola Coca Cola sabor original 2,25 lts",
      brand: "Coca Cola",
      ean: "7790895000997",
      categoryTrail: ["/Bebidas/Gaseosas/Gaseosas cola/", "/Bebidas/Gaseosas/"],
      suggestedCategoryId: "gaseosas-cola",
      imageUrl:
        "https://carrefourar.vteximg.com.br/arquivos/ids/332148/7790895000997_E01.jpg?v=638211437412370000",
      referencePrice: 5250,
      referenceListPrice: 5250,
      productUrl: "https://www.carrefour.com.ar/gaseosa-cola-coca-cola-sabor-original-225-lts-30138/p",
    },
  ],
  page: 1,
  pageSize: 8,
  hasMore: false,
} as const;

test("restores sourcing query, selection, and drafts after reload", async ({ page }) => {
  const storageKey = getProductSourcingSessionStorageKey();
  let searchRequests = 0;

  await page.route("**/api/v1/product-sourcing/search**", async (route) => {
    searchRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(searchResponse),
    });
  });

  await page.goto("/products/sourcing");

  await page.getByTestId("product-sourcing-search-input").fill("coca cola");
  await page.waitForTimeout(650);
  expect(searchRequests).toBe(1);

  await page.getByTestId("product-sourcing-toggle-393964").click();
  await expect(page.getByTestId("product-sourcing-selected-count")).toHaveText("1");

  await page
    .getByTestId("product-sourcing-import-name-393964")
    .fill("Coca Cola Zero 2,25 importada");
  await page
    .getByTestId("product-sourcing-import-category-393964")
    .fill("Desayuno y merienda");
  await page.locator("body").click();
  await page.getByTestId("product-sourcing-import-price-393964").fill("5890");
  await page.getByTestId("product-sourcing-import-stock-393964").fill("6");
  await page.getByTestId("product-sourcing-import-cost-393964").fill("3150");
  await page.getByTestId("product-sourcing-import-min-stock-393964").fill("2");

  await expect
    .poll(async () =>
      page.evaluate((key) => {
        const rawValue = window.localStorage.getItem(key);
        if (!rawValue) {
          return null;
        }

        const parsed = JSON.parse(rawValue) as {
          selectedIds: string[];
          query: string;
          importDrafts: Record<string, { name: string; categoryId: string }>;
        };

        return {
          selectedCount: parsed.selectedIds.length,
          query: parsed.query,
          restoredName: parsed.importDrafts["393964"]?.name ?? "",
          restoredCategoryCode: parsed.importDrafts["393964"]?.categoryId ?? "",
        };
      }, storageKey),
    )
    .toEqual({
      selectedCount: 1,
      query: "coca cola",
      restoredName: "Coca Cola Zero 2,25 importada",
      restoredCategoryCode: "desayuno-y-merienda",
    });

  await page.reload();

  await expect(page.getByTestId("product-sourcing-session-feedback")).toContainText(
    "Se restauró la sesión anterior de sourcing.",
  );
  await expect(page.getByTestId("product-sourcing-search-input")).toHaveValue("coca cola");
  await expect(page.getByTestId("product-sourcing-selected-count")).toHaveText("1");
  await expect(page.getByTestId("product-sourcing-result-393964")).toContainText(
    "Gaseosa cola Coca Cola Zero 2,25 lts",
  );
  await expect(page.getByTestId("product-sourcing-import-name-393964")).toHaveValue(
    "Coca Cola Zero 2,25 importada",
  );
  await expect(page.getByTestId("product-sourcing-import-category-393964")).toHaveValue(
    "Desayuno y merienda",
  );
  await expect(page.getByTestId("product-sourcing-import-price-393964")).toHaveValue("5890");
  await expect(page.getByTestId("product-sourcing-import-stock-393964")).toHaveValue("6");
  await expect(page.getByTestId("product-sourcing-import-cost-393964")).toHaveValue("3150");
  await expect(page.getByTestId("product-sourcing-import-min-stock-393964")).toHaveValue("2");

  await page.waitForTimeout(650);
  expect(searchRequests).toBe(1);

  await page.getByTestId("product-sourcing-discard-session-button").click();
  await expect(page.getByTestId("product-sourcing-search-input")).toHaveValue("");
  await expect(page.getByTestId("product-sourcing-result-393964")).toHaveCount(0);
  await expect(page.getByTestId("product-sourcing-selection-panel")).toContainText(
    "Selecciona resultados para completar la importacion",
  );
  await expect
    .poll(async () =>
      page.evaluate((key) => window.localStorage.getItem(key), storageKey),
    )
    .toBeNull();
});
