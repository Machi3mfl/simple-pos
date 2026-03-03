import { expect, test } from "@playwright/test";

import { addProductToCart, createCatalogProduct } from "./support/catalog";
import { createNewOnAccountCustomer } from "./support/checkout";
import { openReceivableDetail, parseMoneyValue } from "./support/receivables";

test("runs on-account checkout and settles customer debt from Receivables UI", async ({
  request,
  page,
}) => {
  const marker = Date.now();
  const productName = `UI AR Product ${marker}`;
  const customerName = `UI AR ${marker}`;
  await createCatalogProduct(request, {
    name: productName,
    price: 4450,
  });

  await page.goto("/cash-register");

  await expect(page.getByRole("heading", { name: "Elegir categorías" })).toBeVisible();
  await expect(page.getByTestId("checkout-open-payment-button")).toBeDisabled();

  await addProductToCart(page, productName);

  await page.getByTestId("checkout-open-payment-button").click();
  await page.getByTestId("checkout-payment-on-account-button").click();
  await page.getByTestId("checkout-confirm-payment-button").click();

  await expect(page.getByTestId("checkout-feedback")).toContainText(
    "Elegí un cliente existente o tocá crear cliente nuevo antes de cobrar.",
  );

  await createNewOnAccountCustomer(page, customerName);
  await page.getByTestId("checkout-on-account-initial-payment-input").fill("1000");
  await expect(page.getByTestId("checkout-on-account-remaining-value")).toHaveText(
    "$3450.00",
  );
  await page.getByTestId("checkout-confirm-payment-button").click();

  const checkoutFeedback = page.getByTestId("checkout-feedback");
  await expect(checkoutFeedback).toContainText("Venta registrada correctamente.");
  await expect(checkoutFeedback).toContainText(customerName);
  await expect(checkoutFeedback).toContainText("Saldo pendiente: $3450.00.");

  await page.getByTestId("nav-item-receivables").click();
  await expect(
    page.getByRole("heading", { name: "Deudas y cobranzas" }),
  ).toBeVisible();
  await openReceivableDetail(page, customerName);

  const outstandingValue = page.getByTestId("debt-outstanding-value");
  await expect(outstandingValue).toBeVisible();

  const beforeOutstandingRaw = (await outstandingValue.textContent()) ?? "$0";
  const beforeOutstanding = parseMoneyValue(beforeOutstandingRaw);
  expect(beforeOutstanding).toBe(3450);

  await expect(page.locator('[data-testid^="debt-ledger-entry-"]').first()).toContainText("Deuda");
  const firstDebtOrderItem = page.locator('[data-testid^="debt-order-item-"]').first();
  await expect(firstDebtOrderItem).toContainText(productName);
  await expect(firstDebtOrderItem).toContainText("1 x $4450.00");
  await expect(firstDebtOrderItem.getByRole("img", { name: productName })).toBeVisible();

  await page.getByTestId("debt-payment-amount-input").fill("500");
  await page.getByTestId("debt-register-payment-button").click();

  await expect(page.getByTestId("debt-feedback")).toContainText("Pago registrado: $500.00.");
  await expect(outstandingValue).toHaveText("$2950.00");
  const afterOutstandingRaw = (await outstandingValue.textContent()) ?? "$0";
  const afterOutstanding = parseMoneyValue(afterOutstandingRaw);

  const paymentLedgerEntry = page
    .locator('[data-testid^="debt-ledger-entry-"]')
    .filter({ hasText: "Pago" })
    .first();
  await expect(paymentLedgerEntry).toBeVisible();

  await page.getByTestId("debt-detail-modal-close-button").click();

  await page.getByTestId("nav-item-reporting").click();
  await expect(
    page.getByRole("heading", { name: "Historial y analítica de ventas" }),
  ).toBeVisible();

  await page.getByTestId("nav-item-receivables").click();
  await expect(
    page.getByRole("heading", { name: "Deudas y cobranzas" }),
  ).toBeVisible();
  await openReceivableDetail(page, customerName);

  await expect(page.getByTestId("debt-outstanding-value")).toHaveText(
    `$${afterOutstanding.toFixed(2)}`,
  );
  await expect(
    page.locator('[data-testid^="debt-ledger-entry-"]').filter({ hasText: "Pago" }).first(),
  ).toBeVisible();
});
