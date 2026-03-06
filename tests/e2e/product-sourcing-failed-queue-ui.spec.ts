import { expect, test } from "./support/test";

import { getProductSourcingFailedQueueStorageKey } from "../../src/modules/product-sourcing/presentation/session/productSourcingFailedQueue";

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

test("persists failed imports across sessions and allows filtering, retry, and dismiss", async ({
  page,
}) => {
  const storageKey = getProductSourcingFailedQueueStorageKey();
  let importAttempts = 0;

  await page.route("**/api/v1/product-sourcing/search**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(searchResponse),
    });
  });

  await page.route("**/api/v1/product-sourcing/import", async (route) => {
    importAttempts += 1;

    if (importAttempts === 1) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          importedCount: 0,
          items: [],
          invalidItems: [
            {
              row: 1,
              sourceProductId: "393964",
              name: "Gaseosa cola Coca Cola Zero 2,25 lts",
              code: "unexpected_error",
              retryable: true,
              reason: "Error temporal del proveedor al persistir la imagen.",
            },
            {
              row: 2,
              sourceProductId: "30138",
              name: "Gaseosa cola Coca Cola sabor original 2,25 lts",
              code: "already_imported",
              retryable: false,
              reason: "El producto ya había sido importado previamente.",
            },
          ],
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        importedCount: 1,
        items: [
          {
            row: 1,
            providerId: "carrefour",
            sourceProductId: "393964",
            item: {
              id: "product-393964",
              sku: "CRF-393964",
              name: "Gaseosa cola Coca Cola Zero 2,25 lts",
              categoryId: "gaseosas-cola",
              price: 5250,
              stock: 0,
              minStock: 0,
              imageUrl: "https://storage.example.com/crf-393964.jpg",
              isActive: true,
            },
          },
        ],
        invalidItems: [],
      }),
    });
  });

  await page.goto("/products/sourcing");
  await page.evaluate((key) => window.localStorage.removeItem(key), storageKey);

  await page.getByTestId("product-sourcing-search-input").fill("coca cola");
  await page.waitForTimeout(650);

  await page.getByTestId("product-sourcing-toggle-393964").click();
  await page.getByTestId("product-sourcing-toggle-30138").click();
  await expect(page.getByTestId("product-sourcing-selected-count")).toHaveText("2");
  await page.getByTestId("product-sourcing-next-to-details").click();
  await page.getByTestId("product-sourcing-next-to-confirm").click();
  await page
    .getByTestId("product-sourcing-import-confirmation-toast")
    .getByRole("button", { name: "Continuar" })
    .click();
  await page.getByTestId("product-sourcing-import-button").click();
  await expect(page.getByTestId("product-sourcing-import-feedback")).toContainText(
    "0 productos creados y 2 rechazados",
  );
  await page.getByTestId("product-sourcing-open-failed-queue").click();
  await expect(page.getByTestId("product-sourcing-failed-queue-entry-393964")).toContainText(
    "Recuperable",
  );
  await expect(page.getByTestId("product-sourcing-failed-queue-entry-30138")).toContainText(
    "No recuperable",
  );

  await expect
    .poll(async () =>
      page.evaluate((key) => {
        const rawValue = window.localStorage.getItem(key) ?? "[]";
        return JSON.parse(rawValue).length;
      }, storageKey),
    )
    .toBe(2);

  await page.reload();

  await page.getByTestId("product-sourcing-open-failed-queue").click();
  await expect(page.getByTestId("product-sourcing-failed-queue-entry-393964")).toBeVisible();
  await expect(page.getByTestId("product-sourcing-failed-queue-entry-30138")).toBeVisible();

  await page.getByTestId("product-sourcing-failed-queue-filter-retryable").click();
  await expect(page.getByTestId("product-sourcing-failed-queue-entry-393964")).toBeVisible();
  await expect(page.getByTestId("product-sourcing-failed-queue-entry-30138")).toHaveCount(0);

  await page.getByTestId("product-sourcing-failed-queue-retry-393964").click();
  await expect(page.getByTestId("product-sourcing-import-feedback")).toContainText(
    "1 productos creados",
  );
  await expect(page.getByTestId("product-sourcing-failed-queue-entry-393964")).toHaveCount(0);

  await page.getByTestId("product-sourcing-failed-queue-filter-resolved").click();
  await expect(page.getByTestId("product-sourcing-failed-queue-entry-393964")).toContainText(
    "Resuelto",
  );
  await expect(page.getByTestId("product-sourcing-failed-queue-entry-393964")).toContainText(
    "CRF-393964",
  );

  await page.getByTestId("product-sourcing-failed-queue-filter-non_recoverable").click();
  await expect(page.getByTestId("product-sourcing-failed-queue-entry-30138")).toBeVisible();
  await page.getByTestId("product-sourcing-failed-queue-dismiss-30138").click();
  await expect(page.getByTestId("product-sourcing-failed-queue-feedback")).toContainText(
    "Se descartó",
  );
  await expect(page.getByTestId("product-sourcing-failed-queue-empty")).toBeVisible();

  await page.getByTestId("product-sourcing-failed-queue-filter-dismissed").click();
  await expect(page.getByTestId("product-sourcing-failed-queue-entry-30138")).toContainText(
    "Descartado",
  );
});
