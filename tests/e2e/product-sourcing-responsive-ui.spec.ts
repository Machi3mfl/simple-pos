import { expect, test, type Page, type Route } from "@playwright/test";

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
    {
      providerId: "carrefour",
      sourceProductId: "637679",
      name: "Gaseosa cola Pepsi Black pet 2 lts",
      brand: "Pepsi",
      ean: "7791813421061",
      categoryTrail: ["/Bebidas/Gaseosas/Gaseosas cola/", "/Bebidas/Gaseosas/"],
      suggestedCategoryId: "gaseosas-cola",
      imageUrl: "https://www.carrefour.com.ar/arquivos/ids/123456/7791813421061_E01.jpg",
      referencePrice: 4200,
      referenceListPrice: 4350,
      productUrl: "https://www.carrefour.com.ar/gaseosa-cola-pepsi-black-pet-2lts/p",
    },
    {
      providerId: "carrefour",
      sourceProductId: "745262",
      name: "Gaseosa cola Pepsi Black pet 1,5 lts",
      brand: "Pepsi",
      ean: "7791813421062",
      categoryTrail: ["/Bebidas/Gaseosas/Gaseosas cola/", "/Bebidas/Gaseosas/"],
      suggestedCategoryId: "gaseosas-cola",
      imageUrl: "https://www.carrefour.com.ar/arquivos/ids/654321/7791813421062_E01.jpg",
      referencePrice: 3900,
      referenceListPrice: 4050,
      productUrl: "https://www.carrefour.com.ar/gaseosa-cola-pepsi-black-pet-15lts/p",
    },
  ],
  page: 1,
  pageSize: 8,
  hasMore: false,
} as const;

async function mockSourcingApi(page: Page): Promise<void> {
  await page.route("**/api/v1/product-sourcing/search**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(searchResponse),
    });
  });

  await page.route("**/api/v1/product-sourcing/category-mappings**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [] }),
    });
  });

  await page.route("**/api/v1/product-sourcing/import-history**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [] }),
    });
  });
}

test.describe("product sourcing responsive ui", () => {
  test("keeps the selection panel above results on tablet", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 1366 });
    await mockSourcingApi(page);

    await page.goto("/products/sourcing");
    await page.getByTestId("product-sourcing-search-input").fill("pepsi");
    await page.waitForTimeout(650);
    await page.getByTestId("product-sourcing-toggle-637679").click();

    const selectionPanel = page.getByTestId("product-sourcing-selection-panel");
    const resultsGrid = page.getByTestId("product-sourcing-results-grid");
    const importButton = page.getByTestId("product-sourcing-import-button");
    const selectionBox = await selectionPanel.boundingBox();
    const resultsBox = await resultsGrid.boundingBox();
    const buttonBox = await importButton.boundingBox();

    expect(selectionBox).not.toBeNull();
    expect(resultsBox).not.toBeNull();
    expect(buttonBox).not.toBeNull();
    expect(selectionBox!.y).toBeLessThan(resultsBox!.y);
    expect(selectionBox!.width).toBeGreaterThan(700);
    expect(buttonBox!.x + buttonBox!.width).toBeLessThanOrEqual(1024);
  });

  test("keeps the sourcing flow usable on mobile width", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockSourcingApi(page);

    await page.goto("/products/sourcing");
    await page.getByTestId("product-sourcing-search-input").fill("pepsi");
    await page.waitForTimeout(650);
    await page.getByTestId("product-sourcing-toggle-637679").click();

    await expect(page.getByTestId("nav-item-products")).toBeVisible();
    await expect(page.getByTestId("product-sourcing-selected-count")).toHaveText("1");
    await expect(page.getByTestId("product-sourcing-import-button")).toBeVisible();

    const resultCard = page.getByTestId("product-sourcing-result-637679");
    const resultBox = await resultCard.boundingBox();
    expect(resultBox).not.toBeNull();
    expect(resultBox!.x + resultBox!.width).toBeLessThanOrEqual(390);
  });
});
