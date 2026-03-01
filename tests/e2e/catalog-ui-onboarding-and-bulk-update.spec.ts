import { expect, test } from "@playwright/test";

test("creates product and reprices it from Catalog UI, then verifies Sales integration", async ({
  page,
}) => {
  const uniqueProductName = `E2E Catalog ${Date.now()}`;

  await page.goto("/sales");
  await page.getByTestId("nav-item-catalog").click();

  await page.getByTestId("onboarding-name-input").fill(uniqueProductName);
  await page.getByTestId("onboarding-category-select").selectOption("dessert");
  await page.getByTestId("onboarding-price-input").fill("40");
  await page.getByTestId("onboarding-stock-input").fill("5");
  await page.getByTestId("onboarding-submit-button").click();

  await expect(page.getByTestId("onboarding-feedback")).toContainText(
    `Producto creado: ${uniqueProductName}`,
  );

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
  await expect(page.getByTestId("bulk-feedback")).toContainText(
    "Lote aplicado: 1 productos actualizados.",
  );

  await page.getByTestId("nav-item-sales").click();
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
