import { expect, test } from "@playwright/test";

import { createCatalogProduct } from "./support/catalog";

const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z6BYAAAAASUVORK5CYII=";
const TINY_PNG_DATA_URL = `data:image/png;base64,${TINY_PNG_BASE64}`;
const TINY_PNG_BUFFER = Buffer.from(TINY_PNG_BASE64, "base64");

function uniqueMarker(): string {
  return `products-ui-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

test("navigates to sourcing, searches by EAN, edits stock and uses bulk actions from the products workspace", async ({
  page,
  request,
}) => {
  const marker = uniqueMarker();
  const singleProductName = `Workspace UI ${marker}`;
  const singleProductSku = `WUI-${marker.slice(-6)}`;
  const singleProductEan = `7790${marker.replace(/-/g, "").slice(-8)}`;
  const bulkProductName = `Bulk UI ${marker}`;
  const bulkProductSku = `BUI-${marker.slice(-6)}`;
  const bulkProductEan = `7791${marker.replace(/-/g, "").slice(-8)}`;

  await createCatalogProduct(request, {
    name: singleProductName,
    sku: singleProductSku,
    ean: singleProductEan,
    categoryId: "desayuno-y-merienda",
    price: 80,
    cost: 30,
    initialStock: 4,
    minStock: 2,
    imageUrl: TINY_PNG_DATA_URL,
  });

  await page.goto("/cash-register");
  await page.getByTestId("nav-item-products").click();

  await page.getByTestId("products-workspace-open-create-button").click();
  await expect(page).toHaveURL(/\/products\/sourcing$/);

  await page.goto("/products");
  await page.getByTestId("products-workspace-search-input").fill(singleProductEan);

  const singleCard = page
    .locator('[data-testid^="products-workspace-card-"]')
    .filter({ hasText: singleProductName })
    .first();
  await expect(singleCard).toBeVisible();
  await expect(singleCard).toContainText("Desayuno y merienda");

  await singleCard.click();
  await expect(page.getByText(singleProductEan)).toBeVisible();

  const detailImage = page.locator(`img[alt="${singleProductName}"]`).last();
  await expect(detailImage).toBeVisible();
  await expect(detailImage).toHaveClass(/h-full/);
  await expect(detailImage).toHaveClass(/w-full/);
  await expect(detailImage).toHaveClass(/object-contain/);

  await page.getByTestId("products-workspace-open-edit-button").click();
  await page.getByTestId("products-workspace-edit-price-input").fill("95");
  await page.getByTestId("products-workspace-edit-min-stock-input").fill("3");
  await page.getByTestId("products-workspace-edit-image-file-input").setInputFiles({
    name: "workspace-product.png",
    mimeType: "image/png",
    buffer: TINY_PNG_BUFFER,
  });
  await page.getByTestId("products-workspace-edit-submit-button").click();

  await expect(page.getByTestId("products-workspace-feedback")).toContainText(
    `Producto actualizado: ${singleProductName}.`,
  );
  await expect(singleCard).toContainText("$95.00");

  await singleCard.click();
  await page.getByTestId("products-workspace-open-add-stock-button").click();
  await page.getByTestId("products-workspace-stock-quantity-input").fill("3");
  await page.getByTestId("products-workspace-stock-unit-cost-input").fill("35");
  await page.getByTestId("products-workspace-stock-reason-input").fill("reposicion");
  await page.getByTestId("products-workspace-stock-submit-button").click();

  await expect(page.getByTestId("products-workspace-feedback")).toContainText(
    `Movimiento registrado para ${singleProductName}.`,
  );
  const dialogCloseButton = page.getByTestId("products-workspace-dialog-close");
  if (await dialogCloseButton.isVisible().catch(() => false)) {
    await dialogCloseButton.click();
  }

  await page.getByTestId("products-workspace-open-more-actions-button").click();
  await page.getByTestId("products-workspace-open-bulk-products-button").click();
  await page.getByTestId("products-workspace-bulk-products-input").fill(
    `name,sku,categoryId,price,cost,initialStock,minStock,imageUrl,ean\n${bulkProductName},${bulkProductSku},drink,60,20,5,2,,${bulkProductEan}`,
  );
  await page.getByTestId("products-workspace-bulk-products-submit-button").click();

  await expect(page.getByTestId("products-workspace-feedback")).toContainText(
    "Carga masiva completada: 1 productos creados.",
  );

  await page.getByTestId("products-workspace-search-input").fill(bulkProductEan);
  const bulkCard = page
    .locator('[data-testid^="products-workspace-card-"]')
    .filter({ hasText: bulkProductName })
    .first();
  await expect(bulkCard).toBeVisible();

  await page.getByTestId("products-workspace-open-more-actions-button").click();
  await page.getByTestId("products-workspace-open-bulk-stock-button").click();
  await page.getByTestId("products-workspace-bulk-stock-input").fill(
    `sku,movementType,quantity,unitCost,reason\n${bulkProductSku},inbound,2,20,reposicion`,
  );
  await page.getByTestId("products-workspace-bulk-stock-submit-button").click();

  await expect(page.getByTestId("products-workspace-feedback")).toContainText(
    "Stock masivo aplicado: 1 movimientos correctos.",
  );

  await page.getByTestId("products-workspace-open-bulk-prices-button").click();
  await page.getByTestId("bulk-scope-select").selectOption("selection");
  await page.getByTestId("bulk-mode-select").selectOption("fixed_amount");
  await page.getByTestId("bulk-value-input").fill("5");

  const bulkPriceSelectionItem = page
    .locator('[data-testid^="bulk-selection-item-"]')
    .filter({ hasText: bulkProductName })
    .first();

  if ((await bulkPriceSelectionItem.count()) === 0) {
    const loadedSelectionItems = page.locator('[data-testid^="bulk-selection-item-"]');
    await loadedSelectionItems.last().scrollIntoViewIfNeeded();
  }

  await expect(bulkPriceSelectionItem).toBeVisible();
  await bulkPriceSelectionItem.locator('input[type="checkbox"]').check();

  await page.getByTestId("bulk-preview-button").click();
  await expect(page.getByTestId("bulk-feedback")).toContainText(
    "Previsualización lista: 1 filas.",
  );

  await page.getByTestId("bulk-apply-button").click();
  await expect(page.getByTestId("products-workspace-feedback")).toContainText(
    "Lote aplicado: 1 productos actualizados.",
  );
  const bulkPricesCloseButton = page.getByRole("button", { name: "Cerrar" });
  if (await bulkPricesCloseButton.isVisible().catch(() => false)) {
    await bulkPricesCloseButton.click();
  }

  await page.getByTestId("nav-item-cash-register").click();
  await page.getByLabel("Buscar en el menú").fill(bulkProductName);
  const bulkSalesCard = page
    .locator('[data-testid^="product-card-"]')
    .filter({ hasText: bulkProductName })
    .first();
  await expect(bulkSalesCard).toBeVisible();
  await expect(bulkSalesCard).toContainText("$65");
});
