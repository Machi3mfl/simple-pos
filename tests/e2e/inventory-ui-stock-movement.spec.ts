import { expect, test } from "@playwright/test";

test("registers inventory movement from UI and shows validation feedback", async ({ page }) => {
  const uniqueProductName = `Inventory Seed ${Date.now()}`;
  const uniqueProductSku = `INV-${Date.now().toString().slice(-6)}`;

  await page.goto("/products");
  await expect(page.getByRole("heading", { name: "Productos e inventario" })).toBeVisible();

  await page.getByTestId("products-workspace-open-create-button").click();
  await page.getByTestId("products-workspace-create-name-input").fill(uniqueProductName);
  await page.getByTestId("products-workspace-create-sku-input").fill(uniqueProductSku);
  await page.getByTestId("products-workspace-create-category-input").selectOption("main");
  await page.getByTestId("products-workspace-create-price-input").fill("10");
  await page.getByTestId("products-workspace-create-cost-input").fill("4");
  await page.getByTestId("products-workspace-create-stock-input").fill("5");
  await page.getByTestId("products-workspace-create-submit-button").click();
  await expect(page.getByTestId("products-workspace-feedback")).toContainText(
    `Producto creado: ${uniqueProductName}`,
  );

  await page.goto("/products");
  await page.getByTestId("products-workspace-search-input").fill(uniqueProductSku);
  const productCard = page
    .locator('[data-testid^="products-workspace-card-"]')
    .filter({ hasText: uniqueProductName })
    .first();
  await expect(productCard).toBeVisible();
  await productCard.click();

  await page.getByTestId("products-workspace-open-add-stock-button").click();
  await page.getByTestId("products-workspace-stock-quantity-input").fill("2");
  await page.getByTestId("products-workspace-stock-unit-cost-input").fill("");
  await page.getByTestId("products-workspace-stock-submit-button").click();

  await expect(page.getByTestId("products-workspace-feedback")).toContainText(
    "El ingreso requiere costo unitario mayor a cero.",
  );

  await page.getByTestId("products-workspace-stock-unit-cost-input").fill("12");
  await page.getByTestId("products-workspace-stock-reason-input").fill("supplier_restock");
  await page.getByTestId("products-workspace-stock-submit-button").click();

  await expect(page.getByTestId("products-workspace-feedback")).toContainText(
    `Movimiento registrado para ${uniqueProductName}.`,
  );
  await expect(page.getByText("Ingreso").first()).toBeVisible();
  await page.getByTestId("products-workspace-dialog-close").click();

  await page.getByTestId("nav-item-reporting").click();
  await expect(
    page.getByRole("heading", { name: "Historial y analítica de ventas" }),
  ).toBeVisible();

  await page.goto("/products");
  await page.getByTestId("products-workspace-search-input").fill(uniqueProductSku);
  await productCard.click();
  await expect(page.getByText("Ingreso").first()).toBeVisible();
  await expect(page.getByText(/supplier/i)).toBeVisible();
});
