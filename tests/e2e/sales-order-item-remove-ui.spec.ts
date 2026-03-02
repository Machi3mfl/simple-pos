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

test("removes a cart item from the order list using the dedicated trash action", async ({
  page,
}) => {
  await mockProducts(page);

  await page.goto("/sales");
  await expect(page.getByTestId("product-card-product-001")).toContainText("Disponible 30");
  await page.getByTestId("product-card-product-001").click();

  await expect(page.getByTestId("order-item-product-001")).toBeVisible();
  await page.getByTestId("order-item-remove-product-001").click();

  await expect(page.getByTestId("order-item-product-001")).toHaveCount(0);
  await expect(page.getByTestId("checkout-total-value")).toHaveText("$0.00");
});
