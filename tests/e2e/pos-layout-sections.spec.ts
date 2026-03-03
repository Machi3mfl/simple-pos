import { expect, test, type Page } from "@playwright/test";

import productsListSuccess from "../fixtures/mock-api/products-list-success.json";

async function mockProducts(page: Page): Promise<void> {
  await page.route("**/api/v1/products**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(productsListSuccess),
    });
  });
}

test("renders core POS layout sections and controls", async ({ page }) => {
  await mockProducts(page);
  await page.goto("/cash-register");

  await expect(page.getByTestId("nav-item-cash-register")).toBeVisible();
  await expect(page.getByTestId("nav-item-orders")).toBeVisible();
  await expect(page.getByTestId("nav-item-products")).toBeVisible();
  await expect(page.getByTestId("nav-item-receivables")).toBeVisible();
  await expect(page.getByTestId("nav-item-reporting")).toBeVisible();
  await expect(page.getByTestId("nav-item-sync")).toBeVisible();
  await expect(page.getByTestId("nav-item-catalog")).toHaveCount(0);
  await expect(page.getByTestId("nav-item-inventory")).toHaveCount(0);

  await expect(page.getByRole("heading", { name: "Elegir categorías" })).toBeVisible();
  await expect(page.getByLabel("Buscar en el menú")).toBeVisible();
  await expect(page.locator('[data-testid^="product-card-"]').first()).toBeVisible();

  await expect(page.getByRole("heading", { name: "Lista del pedido" })).toBeVisible();
  await expect(page.getByText("Subtotal")).toBeVisible();
  await expect(page.getByText("Total", { exact: true })).toBeVisible();
  await expect(page.getByTestId("checkout-open-payment-button")).toBeVisible();
});
