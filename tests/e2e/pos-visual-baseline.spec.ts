import { expect, test, type Page } from "@playwright/test";

import productsListSuccess from "../fixtures/mock-api/products-list-success.json";

async function mockProductsList(page: Page): Promise<void> {
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

test("renders tablet three-zone layout baseline", async ({ page }) => {
  await mockProductsList(page);

  await page.goto("/sales");

  await expect(page.getByRole("button", { name: "Sales" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Elegir categorías" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lista del pedido" })).toBeVisible();

  await expect(page).toHaveScreenshot("pos-tablet-layout.png", {
    fullPage: true,
  });
});

test.describe("responsive layout baseline", () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test("renders compact-tablet layout baseline", async ({ page }) => {
    await mockProductsList(page);

    await page.goto("/sales");

    await expect(page.getByRole("button", { name: "Sales" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Elegir categorías" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Lista del pedido" })).toBeVisible();

    await expect(page).toHaveScreenshot("pos-tablet-layout-compact.png", {
      fullPage: true,
    });
  });
});
