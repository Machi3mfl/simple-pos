import { expect, test } from "@playwright/test";

test("creates product and reprices it from Products UI, then verifies Sales integration", async ({
  page,
}) => {
  const uniqueProductName = `E2E Catalog ${Date.now()}`;

  await page.goto("/products");
  await expect(page.getByRole("heading", { name: "Productos e inventario" })).toBeVisible();

  await page.getByTestId("products-workspace-open-create-button").click();
  await page.getByTestId("products-workspace-create-name-input").fill(uniqueProductName);
  await page.getByTestId("products-workspace-create-category-input").fill("Postres");
  await page.getByTestId("products-workspace-create-price-input").fill("40");
  await page.getByTestId("products-workspace-create-cost-input").fill("18");
  await page.getByTestId("products-workspace-create-stock-input").fill("5");
  await page.getByTestId("products-workspace-create-submit-button").click();

  await expect(page.getByTestId("products-workspace-feedback")).toContainText(
    `Producto creado: ${uniqueProductName}`,
  );

  await page.getByTestId("products-workspace-open-bulk-prices-button").click();
  await page.getByTestId("bulk-scope-select").selectOption("selection");
  await page.getByTestId("bulk-mode-select").selectOption("fixed_amount");
  await page.getByTestId("bulk-value-input").fill("10");

  const selectionItem = page
    .locator('[data-testid^="bulk-selection-item-"]')
    .filter({ hasText: uniqueProductName })
    .first();

  await expect(selectionItem).toBeVisible();
  await selectionItem.locator('input[type="checkbox"]').check();

  await page.getByTestId("bulk-preview-button").click();
  await expect(page.getByTestId("bulk-feedback")).toContainText(
    "Previsualización lista: 1 filas.",
  );

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
