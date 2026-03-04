import { expect, test } from "./support/test";

import { createNewOnAccountCustomer, fillCashReceivedWithExactTotal } from "./support/checkout";
import { createCatalogProduct } from "./support/catalog";

function uniqueMarker(): string {
  return `report-ui-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

test("loads reporting UI data and applies payment method filter", async ({ page, request }) => {
  const marker = uniqueMarker();
  const productName = `Reporting UI ${marker}`;
  const productSku = `RPT-${marker.slice(-6)}`;
  const customerName = `Reporting User ${marker}`;

  await createCatalogProduct(request, {
    name: productName,
    sku: productSku,
    categoryId: "snack",
    price: 10,
    cost: 4,
    initialStock: 50,
    minStock: 5,
  });

  await page.goto("/cash-register");
  await page.getByTestId("nav-item-cash-register").click();
  await page.getByLabel("Buscar en el menú").fill(productName);
  const productCard = page
    .locator('[data-testid^="product-card-"]')
    .filter({ hasText: productName })
    .first();
  await expect(productCard).toBeVisible();
  await productCard.click();
  await page.getByTestId("checkout-open-payment-button").click();
  await page.getByTestId("checkout-payment-cash-button").click();
  await fillCashReceivedWithExactTotal(page);
  await page.getByTestId("checkout-confirm-payment-button").click();
  await expect(page.getByTestId("checkout-feedback")).toContainText(
    "Venta registrada correctamente.",
  );

  await page.getByLabel("Buscar en el menú").fill(productName);
  await expect(productCard).toBeVisible();
  await productCard.click();
  await page.getByTestId("checkout-open-payment-button").click();
  await page.getByTestId("checkout-payment-on-account-button").click();
  await createNewOnAccountCustomer(page, customerName);
  await page.getByTestId("checkout-confirm-payment-button").click();
  await expect(page.getByTestId("checkout-feedback")).toContainText(
    "Venta registrada correctamente.",
  );

  await page.getByTestId("nav-item-reporting").click();

  const tomorrow = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().slice(0, 10);
  await page.getByLabel("Hasta").fill(tomorrow);
  await page.getByTestId("reporting-apply-filters-button").click();

  await expect(
    page.getByRole("heading", { name: "Historial y analítica de ventas" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Evolución diaria" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mix de cobro" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Salud del inventario" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lectura rápida" })).toBeVisible();
  await expect(page.locator('[data-testid^="reporting-sales-item-"]').first()).toBeVisible();
  await expect(page.locator('[data-testid^="reporting-top-product-item-"]').first()).toBeVisible();

  await expect(page.getByTestId("reporting-sales-count-value")).not.toHaveText("0");
  await expect(page.getByTestId("reporting-revenue-value")).not.toHaveText("-");
  await expect(page.getByTestId("reporting-cost-value")).not.toHaveText("-");
  await expect(page.getByTestId("reporting-profit-value")).not.toHaveText("-");
  await expect(page.getByTestId("reporting-margin-value")).not.toHaveText("-");
  await expect(page.getByTestId("reporting-current-collected-value")).not.toHaveText("-");
  await expect(page.getByTestId("reporting-current-credit-value")).not.toHaveText("-");
  await expect(page.getByTestId("reporting-stock-value")).not.toHaveText("-");

  await page.getByTestId("reporting-payment-method-select").selectOption("on_account");
  await page.getByTestId("reporting-apply-filters-button").click();

  await expect(
    page
      .locator('[data-testid^="reporting-sales-item-"]')
      .filter({ hasText: "Cuenta corriente" })
      .first(),
  ).toBeVisible();
  await expect(
    page.locator('[data-testid^="reporting-sales-item-"]').filter({ hasText: customerName }),
  ).toHaveCount(1);
  await expect(
    page.locator('[data-testid^="reporting-sales-item-"]').filter({ hasText: "Efectivo" }),
  ).toHaveCount(0);

  await expect(
    page.locator('[data-testid^="reporting-top-product-item-"]').first(),
  ).toBeVisible();
});
