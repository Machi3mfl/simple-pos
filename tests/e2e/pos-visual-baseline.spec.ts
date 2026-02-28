import { expect, test } from "@playwright/test";

import productsListSuccess from "../fixtures/mock-api/products-list-success.json";

test("renders tablet three-zone layout baseline", async ({ page }) => {
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

  await page.goto("/pos");

  await expect(page.getByRole("button", { name: "Sales" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Choose Categories" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Order List" })).toBeVisible();

  await expect(page).toHaveScreenshot("pos-tablet-layout.png", {
    fullPage: true,
  });
});
