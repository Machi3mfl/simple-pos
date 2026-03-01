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

test.describe("NFR evidence: performance and usability", () => {
  test("keeps key interaction latency within perceived target budget", async ({ page }) => {
    await mockProducts(page);
    await page.goto("/sales");

    const firstProductCard = page.locator('[data-testid^="product-card-"]').first();
    const addStart = Date.now();
    await firstProductCard.click();
    await expect(page.locator('[data-testid^="order-item-"]').first()).toBeVisible();
    const addElapsedMs = Date.now() - addStart;

    const paymentStart = Date.now();
    await page.getByTestId("checkout-open-payment-button").click();
    await expect(page.getByTestId("checkout-confirm-payment-button")).toBeVisible();
    const paymentElapsedMs = Date.now() - paymentStart;

    expect(addElapsedMs).toBeLessThan(200);
    expect(paymentElapsedMs).toBeLessThan(200);
  });

  test("keeps primary controls touch-friendly (>=44px)", async ({ page }) => {
    await mockProducts(page);
    await page.goto("/sales");

    const controls = [
      page.getByTestId("nav-item-sales"),
      page.locator('[data-testid^="product-card-"]').first(),
      page.getByTestId("checkout-open-payment-button"),
    ];

    for (const control of controls) {
      await expect(control).toBeVisible();
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect((box?.width ?? 0) >= 44).toBeTruthy();
      expect((box?.height ?? 0) >= 44).toBeTruthy();
    }
  });
});
