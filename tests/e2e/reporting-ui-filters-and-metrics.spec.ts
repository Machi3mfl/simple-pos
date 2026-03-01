import { expect, test } from "@playwright/test";

function uniqueMarker(): string {
  return `report-ui-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

test("loads reporting UI data and applies payment method filter", async ({ page }) => {
  const marker = uniqueMarker();
  const productName = `Reporting UI ${marker}`;
  const customerName = `Reporting User ${marker}`;

  await page.goto("/pos");

  await page.getByTestId("nav-item-catalog").click();
  await page.getByTestId("onboarding-name-input").fill(productName);
  await page.getByTestId("onboarding-category-select").selectOption("snack");
  await page.getByTestId("onboarding-price-input").fill("10");
  await page.getByTestId("onboarding-stock-input").fill("50");
  await page.getByTestId("onboarding-submit-button").click();
  await expect(page.getByTestId("onboarding-feedback")).toContainText(
    `Product created: ${productName}`,
  );

  await page.getByTestId("nav-item-sales").click();
  await page.getByLabel("Search menu").fill(productName);
  const productCard = page
    .locator('[data-testid^="product-card-"]')
    .filter({ hasText: productName })
    .first();
  await expect(productCard).toBeVisible();
  await productCard.click();
  await page.getByTestId("checkout-open-payment-button").click();
  await page.getByTestId("checkout-payment-cash-button").click();
  await page.getByTestId("checkout-confirm-payment-button").click();
  await expect(page.getByTestId("checkout-feedback")).toContainText(
    "Checkout completed successfully.",
  );

  await page.getByLabel("Search menu").fill(productName);
  await expect(productCard).toBeVisible();
  await productCard.click();
  await page.getByTestId("checkout-open-payment-button").click();
  await page.getByTestId("checkout-payment-on-account-button").click();
  await page.getByTestId("checkout-customer-name-input").fill(customerName);
  await page.getByTestId("checkout-confirm-payment-button").click();
  await expect(page.getByTestId("checkout-feedback")).toContainText(
    "Checkout completed successfully.",
  );

  await page.getByTestId("nav-item-reporting").click();

  const tomorrow = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().slice(0, 10);
  await page.getByLabel("Period end").fill(tomorrow);
  await page.getByTestId("reporting-apply-filters-button").click();

  await expect(page.getByRole("heading", { name: "Sales History and Analytics" })).toBeVisible();
  await expect(page.locator('[data-testid^="reporting-sales-item-"]').first()).toBeVisible();
  await expect(page.locator('[data-testid^="reporting-top-product-item-"]').first()).toBeVisible();

  await expect(page.getByTestId("reporting-revenue-value")).not.toHaveText("-");
  await expect(page.getByTestId("reporting-cost-value")).not.toHaveText("-");
  await expect(page.getByTestId("reporting-profit-value")).not.toHaveText("-");

  await page.getByTestId("reporting-payment-method-select").selectOption("on_account");
  await page.getByTestId("reporting-apply-filters-button").click();

  await expect(
    page.locator('[data-testid^="reporting-sales-item-"]').filter({ hasText: "on_account" }).first(),
  ).toBeVisible();
  await expect(
    page.locator('[data-testid^="reporting-sales-item-"]').filter({ hasText: customerName }),
  ).toHaveCount(1);
  await expect(
    page.locator('[data-testid^="reporting-sales-item-"]').filter({ hasText: "cash" }),
  ).toHaveCount(0);

  await expect(
    page
      .locator('[data-testid^="reporting-top-product-item-"]')
      .filter({ hasText: productName })
      .first(),
  ).toBeVisible();
});
