import { expect, test } from "@playwright/test";

function uniqueMarker(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

test.describe("sales UI checkout reflection across history and debt", () => {
  test.skip(
    process.env.POS_BACKEND_MODE !== "supabase",
    "This suite validates real backend persistence with POS_BACKEND_MODE=supabase.",
  );

  test("registers cash and on-account sales via UI and exposes both in reporting/debt", async ({
    page,
  }) => {
    const marker = uniqueMarker();
    const customerName = `UI Flow ${marker}`;

    await page.goto("/sales");
    await expect(page).toHaveURL(/\/sales$/);
    await expect(page.getByRole("heading", { name: "Choose Categories" })).toBeVisible();
    await expect(page.getByTestId("checkout-open-payment-button")).toBeEnabled({
      timeout: 15_000,
    });

    await page.getByTestId("checkout-open-payment-button").click();
    await page.getByTestId("checkout-payment-cash-button").click();
    await page.getByTestId("checkout-confirm-payment-button").click();
    await expect(page.getByTestId("checkout-feedback")).toContainText(
      "Checkout completed successfully.",
    );

    const firstProductCard = page.locator('[data-testid^="product-card-"]').first();
    await firstProductCard.click();
    await expect(page.locator('[data-testid^="order-item-"]').first()).toBeVisible();

    await page.getByTestId("checkout-open-payment-button").click();
    await page.getByTestId("checkout-payment-on-account-button").click();
    await page.getByTestId("checkout-customer-name-input").fill(customerName);
    await page.getByTestId("checkout-confirm-payment-button").click();

    const checkoutFeedback = page.getByTestId("checkout-feedback");
    await expect(checkoutFeedback).toContainText("Checkout completed successfully.");
    await expect(checkoutFeedback).toContainText(customerName);

    await page.getByTestId("nav-item-receivables").click();
    await expect(page).toHaveURL(/\/receivables$/);
    await expect(page.getByRole("heading", { name: "Customer Debt Management" })).toBeVisible();
    await page.getByTestId("debt-refresh-candidates-button").click();
    const customerOption = page
      .locator('[data-testid="debt-customer-candidates-select"] option')
      .filter({ hasText: customerName })
      .first();
    await expect(customerOption).toHaveCount(1);
    const customerId = await customerOption.getAttribute("value");
    expect(customerId).toBeTruthy();
    await page.getByTestId("debt-customer-candidates-select").selectOption(customerId ?? "");
    await page.getByTestId("debt-load-summary-button").click();
    await expect(page.getByText(new RegExp(`Customer ${customerName}`))).toBeVisible();
    await expect(page.getByTestId("debt-outstanding-value")).not.toHaveText("$0.00");

    await page.getByTestId("nav-item-reporting").click();
    await expect(page).toHaveURL(/\/reporting$/);
    await expect(page.getByRole("heading", { name: "Sales History and Analytics" })).toBeVisible();

    const tomorrow = new Date(Date.now() + 1000 * 60 * 60 * 24)
      .toISOString()
      .slice(0, 10);
    await page.getByLabel("Period end").fill(tomorrow);
    await page.getByTestId("reporting-payment-method-select").selectOption("all");
    await page.getByTestId("reporting-apply-filters-button").click();

    await expect(
      page.locator('[data-testid^="reporting-sales-item-"]').filter({ hasText: "cash" }).first(),
    ).toBeVisible();

    await page.getByTestId("reporting-payment-method-select").selectOption("on_account");
    await page.getByTestId("reporting-apply-filters-button").click();
    await expect(
      page.locator('[data-testid^="reporting-sales-item-"]').filter({ hasText: customerName }),
    ).toHaveCount(1);
  });
});
