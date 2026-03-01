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
  await page.goto("/sales");

  await expect(page.getByTestId("nav-item-sales")).toBeVisible();
  await expect(page.getByTestId("nav-item-catalog")).toBeVisible();
  await expect(page.getByTestId("nav-item-inventory")).toBeVisible();
  await expect(page.getByTestId("nav-item-receivables")).toBeVisible();
  await expect(page.getByTestId("nav-item-reporting")).toBeVisible();
  await expect(page.getByTestId("nav-item-sync")).toBeVisible();

  await expect(page.getByRole("heading", { name: "Choose Categories" })).toBeVisible();
  await expect(page.getByLabel("Search menu")).toBeVisible();
  await expect(page.locator('[data-testid^="product-card-"]').first()).toBeVisible();

  await expect(page.getByRole("heading", { name: "Order List" })).toBeVisible();
  await expect(page.getByText("Subtotal")).toBeVisible();
  await expect(page.getByText("Total", { exact: true })).toBeVisible();
  await expect(page.getByTestId("checkout-open-payment-button")).toBeVisible();
});
