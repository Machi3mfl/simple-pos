import { expect, test } from "@playwright/test";

function parseMoneyValue(raw: string): number {
  return Number(raw.replace(/[^0-9.-]/g, ""));
}

test("runs on-account checkout and settles customer debt from Receivables UI", async ({
  page,
}) => {
  const customerName = `UI AR ${Date.now()}`;

  await page.goto("/pos");

  await expect(page.getByRole("heading", { name: "Choose Categories" })).toBeVisible();
  await expect(page.getByTestId("checkout-open-payment-button")).toBeEnabled();

  await page.getByTestId("checkout-open-payment-button").click();
  await page.getByTestId("checkout-payment-on-account-button").click();
  await page.getByTestId("checkout-confirm-payment-button").click();

  await expect(page.getByTestId("checkout-feedback")).toContainText(
    "For on-account payment, assign a customer name first.",
  );

  await page.getByTestId("checkout-customer-name-input").fill(customerName);
  await page.getByTestId("checkout-confirm-payment-button").click();

  const checkoutFeedback = page.getByTestId("checkout-feedback");
  await expect(checkoutFeedback).toContainText("Checkout completed successfully.");
  await expect(checkoutFeedback).toContainText(customerName);

  await page.getByTestId("nav-item-receivables").click();
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
  await expect(page.getByTestId("debt-customer-candidates-select")).toContainText(customerName);
  await page.getByTestId("debt-load-summary-button").click();

  const outstandingValue = page.getByTestId("debt-outstanding-value");
  await expect(outstandingValue).toBeVisible();
  await expect(page.getByText(new RegExp(`Customer ${customerName}`))).toBeVisible();

  const beforeOutstandingRaw = (await outstandingValue.textContent()) ?? "$0";
  const beforeOutstanding = parseMoneyValue(beforeOutstandingRaw);
  expect(beforeOutstanding).toBeGreaterThan(0);

  await expect(page.locator('[data-testid^="debt-ledger-entry-"]').first()).toContainText("Debt");

  await page.getByTestId("debt-payment-amount-input").fill("10");
  await page.getByTestId("debt-register-payment-button").click();

  await expect(page.getByTestId("debt-feedback")).toContainText("Payment registered:");

  const afterOutstandingRaw = (await outstandingValue.textContent()) ?? "$0";
  const afterOutstanding = parseMoneyValue(afterOutstandingRaw);
  expect(afterOutstanding).toBeLessThan(beforeOutstanding);

  const paymentLedgerEntry = page
    .locator('[data-testid^="debt-ledger-entry-"]')
    .filter({ hasText: "Payment" })
    .first();
  await expect(paymentLedgerEntry).toBeVisible();

  await page.getByTestId("nav-item-reporting").click();
  await expect(page.getByRole("heading", { name: "Sales History and Analytics" })).toBeVisible();

  await page.getByTestId("nav-item-receivables").click();
  await expect(page.getByRole("heading", { name: "Customer Debt Management" })).toBeVisible();
  await page.getByTestId("debt-refresh-candidates-button").click();
  await page.getByTestId("debt-customer-candidates-select").selectOption(customerId ?? "");
  await page.getByTestId("debt-load-summary-button").click();

  await expect(page.getByText(new RegExp(`Customer ${customerName}`))).toBeVisible();
  await expect(page.getByTestId("debt-outstanding-value")).toHaveText(
    `$${afterOutstanding.toFixed(2)}`,
  );
  await expect(
    page.locator('[data-testid^="debt-ledger-entry-"]').filter({ hasText: "Payment" }).first(),
  ).toBeVisible();
});
