import { expect, test } from "@playwright/test";

test("creates product and reprices it from Catalog UI, then verifies Sales integration", async ({
  page,
}) => {
  const uniqueProductName = `E2E Catalog ${Date.now()}`;

  await page.goto("/pos");
  await page.getByRole("button", { name: "Catalog" }).click();

  await page.getByTestId("onboarding-name-input").fill(uniqueProductName);
  await page.getByTestId("onboarding-category-select").selectOption("dessert");
  await page.getByTestId("onboarding-price-input").fill("40");
  await page.getByTestId("onboarding-stock-input").fill("5");
  await page.getByTestId("onboarding-submit-button").click();

  await expect(page.getByTestId("onboarding-feedback")).toContainText(
    `Product created: ${uniqueProductName}`,
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
  await expect(page.getByTestId("bulk-feedback")).toContainText("Preview ready: 1 rows.");

  await page.getByTestId("bulk-apply-button").click();
  await expect(page.getByTestId("bulk-feedback")).toContainText(
    "Batch applied: 1 products updated.",
  );

  await page.getByRole("button", { name: "Sales" }).click();
  await page.getByLabel("Search menu").fill(uniqueProductName);

  const productCard = page
    .locator('[data-testid^="product-card-"]')
    .filter({ hasText: uniqueProductName })
    .first();

  await expect(productCard).toBeVisible();
  await expect(productCard).toContainText("$50");

  await productCard.click();

  const orderPanel = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Order List" }),
  });
  const orderLine = orderPanel.locator("article").filter({ hasText: uniqueProductName }).first();

  await expect(orderLine).toBeVisible();
  await expect(orderLine).toContainText("$50");
});
