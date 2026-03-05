import { expect, test } from "./support/test";

import { createCatalogProduct } from "./support/catalog";

test("creates product and reprices it from Products UI, then verifies Sales integration", async ({
  page,
  request,
}) => {
  const uniqueProductName = `E2E Catalog ${Date.now()}`;
  const uniqueProductSku = `E2E-${Date.now().toString().slice(-6)}`;

  await page.goto("/products");
  await expect(page.getByRole("heading", { name: "Productos e inventario" })).toBeVisible();

  await createCatalogProduct(request, {
    name: uniqueProductName,
    sku: uniqueProductSku,
    categoryId: "postres",
    price: 40,
    cost: 18,
    initialStock: 5,
  });

  await page.goto("/products");
  await page.getByTestId("products-workspace-search-input").fill(uniqueProductSku);
  await expect(
    page.locator('[data-testid^="products-workspace-card-"]').filter({ hasText: uniqueProductName }).first(),
  ).toBeVisible();

  await page.getByTestId("products-workspace-open-bulk-prices-button").click();
  await page.getByTestId("bulk-scope-select").selectOption("selection");

  const selectionItem = page
    .locator('[data-testid^="bulk-selection-item-"]')
    .filter({ hasText: uniqueProductName })
    .first();

  await expect(selectionItem).toBeVisible();
  await selectionItem.locator('[data-testid^="bulk-selection-checkbox-"]').click();
  await page.getByTestId("bulk-wizard-next-from-scope").click();

  await page.getByTestId("bulk-mode-select").selectOption("fixed_amount");
  await page.getByTestId("bulk-value-input").fill("10");
  await page.getByTestId("bulk-wizard-next-to-preview").click();

  await page.getByTestId("bulk-preview-button").click();
  await expect(page.getByTestId("bulk-feedback")).toContainText(
    "Previsualización lista: 1 filas.",
  );

  await page.getByTestId("bulk-wizard-next-to-confirm").click();
  await page.getByTestId("bulk-apply-button").click();
  await expect(page.getByTestId("products-workspace-feedback")).toContainText(
    "Lote aplicado: 1 productos actualizados.",
  );

  await page.goto("/cash-register");
  await page.getByLabel("Buscar en el menú").fill(uniqueProductName);

  const productCard = page
    .locator('[data-testid^="product-card-"]')
    .filter({ hasText: uniqueProductName })
    .first();

  await expect(productCard).toBeVisible();
  await expect(productCard).toContainText("$50");

  await productCard.click();

  const orderPanel = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Lista del pedido" }),
  });
  const orderLine = orderPanel.locator("article").filter({ hasText: uniqueProductName }).first();

  await expect(orderLine).toBeVisible();
  await expect(orderLine).toContainText("$50");
});
