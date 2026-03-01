import { expect, test } from "@playwright/test";

test("registers inventory movement from UI and shows validation feedback", async ({ page }) => {
  const uniqueProductName = `Inventory Seed ${Date.now()}`;

  await page.goto("/sales");
  await page.getByTestId("nav-item-catalog").click();

  await page.getByTestId("onboarding-name-input").fill(uniqueProductName);
  await page.getByTestId("onboarding-category-select").selectOption("main");
  await page.getByTestId("onboarding-price-input").fill("10");
  await page.getByTestId("onboarding-stock-input").fill("5");
  await page.getByTestId("onboarding-submit-button").click();
  await expect(page.getByTestId("onboarding-feedback")).toContainText(
    `Product created: ${uniqueProductName}`,
  );

  await page.getByTestId("nav-item-inventory").click();

  await expect(page.getByRole("heading", { name: "Stock Movement" })).toBeVisible();
  await expect(page.getByTestId("inventory-product-select")).toBeVisible();
  await expect(
    page
      .locator('[data-testid="inventory-product-select"] option')
      .filter({ hasText: uniqueProductName }),
  ).toHaveCount(1);
  await expect
    .poll(async () => page.getByTestId("inventory-product-select").locator("option").count())
    .toBeGreaterThan(0);
  await page.getByTestId("inventory-product-select").selectOption({ label: uniqueProductName });
  await expect(page.getByTestId("inventory-submit-button")).toBeEnabled();

  await page.getByTestId("inventory-movement-type-select").selectOption("inbound");
  await page.getByTestId("inventory-quantity-input").fill("2");
  await page.getByTestId("inventory-unit-cost-input").fill("");
  await page.getByTestId("inventory-submit-button").click();

  await expect(page.getByTestId("inventory-feedback")).toContainText(
    "Inbound movement requires unit cost greater than zero.",
  );

  await page.getByTestId("inventory-unit-cost-input").fill("12");
  await page.getByTestId("inventory-reason-input").fill("supplier_restock");
  await page.getByTestId("inventory-submit-button").click();

  await expect(page.getByTestId("inventory-feedback")).toContainText(
    "Stock movement registered: inbound.",
  );

  const historyItem = page
    .locator('[data-testid^="inventory-history-item-"]')
    .filter({ hasText: uniqueProductName })
    .first();
  await expect(historyItem).toContainText("inbound");
  await expect(historyItem).toContainText("qty 2");
  await expect(historyItem).toContainText(uniqueProductName);

  await page.getByTestId("nav-item-reporting").click();
  await expect(page.getByRole("heading", { name: "Sales History and Analytics" })).toBeVisible();

  await page.getByTestId("nav-item-inventory").click();
  await expect(page.getByRole("heading", { name: "Stock Movement" })).toBeVisible();
  await page.getByRole("button", { name: "Refresh" }).click();

  const persistedHistoryItem = page
    .locator('[data-testid^="inventory-history-item-"]')
    .filter({ hasText: uniqueProductName })
    .first();
  await expect(persistedHistoryItem).toContainText("inbound");
  await expect(persistedHistoryItem).toContainText("qty 2");
});
