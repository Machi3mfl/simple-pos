import { expect, test } from "./support/test";

import { addProductToCart, createCatalogProduct } from "./support/catalog";
import { createNewOnAccountCustomer, fillCashReceivedWithExactTotal } from "./support/checkout";
import { openReceivableDetail } from "./support/receivables";

function uniqueMarker(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

test.describe("sales UI checkout reflection across history and debt", () => {
  test.skip(
    process.env.POS_BACKEND_MODE !== "supabase",
    "This suite validates real backend persistence with POS_BACKEND_MODE=supabase.",
  );

  test("registers cash and on-account sales via UI and exposes both in reporting/debt", async ({
    request,
    page,
  }) => {
    const marker = uniqueMarker();
    const productName = `UI Flow Product ${marker}`;
    const customerName = `UI Flow ${marker}`;
    await createCatalogProduct(request, { name: productName });

    await page.goto("/cash-register");
    await expect(page).toHaveURL(/\/cash-register$/);
    await expect(page.getByRole("heading", { name: "Elegir categorías" })).toBeVisible();
    await expect(page.getByTestId("checkout-open-payment-button")).toBeDisabled();

    await addProductToCart(page, productName);
    await page.getByTestId("checkout-open-payment-button").click();
    await page.getByTestId("checkout-payment-cash-button").click();
    await fillCashReceivedWithExactTotal(page);
    await page.getByTestId("checkout-confirm-payment-button").click();
    await expect(page.getByTestId("checkout-feedback")).toContainText(
      "Venta registrada correctamente.",
    );

    await addProductToCart(page, productName);
    await page.getByTestId("checkout-open-payment-button").click();
    await page.getByTestId("checkout-payment-on-account-button").click();
    await createNewOnAccountCustomer(page, customerName);
    await page.getByTestId("checkout-confirm-payment-button").click();

    const checkoutFeedback = page.getByTestId("checkout-feedback");
    await expect(checkoutFeedback).toContainText("Venta registrada correctamente.");
    await expect(checkoutFeedback).toContainText(customerName);

    await page.getByTestId("nav-item-receivables").click();
    await expect(page).toHaveURL(/\/receivables$/);
    await expect(
      page.getByRole("heading", { name: "Deudas y cobranzas" }),
    ).toBeVisible();
    await openReceivableDetail(page, customerName);
    await expect(page.getByTestId("debt-outstanding-value")).not.toHaveText("$0.00");
    await page.getByTestId("debt-detail-modal-close-button").click();

    await page.getByTestId("nav-item-reporting").click();
    await expect(page).toHaveURL(/\/reporting$/);
    await expect(
      page.getByRole("heading", { name: "Historial y analítica de ventas" }),
    ).toBeVisible();

    const tomorrow = new Date(Date.now() + 1000 * 60 * 60 * 24)
      .toISOString()
      .slice(0, 10);
    await page.getByLabel("Hasta").fill(tomorrow);
    await page.getByTestId("reporting-payment-method-select").selectOption("all");
    await page.getByTestId("reporting-apply-filters-button").click();

    await expect(
      page.locator('[data-testid^="reporting-sales-item-"]').filter({ hasText: "Efectivo" }).first(),
    ).toBeVisible();

    await page.getByTestId("reporting-payment-method-select").selectOption("on_account");
    await page.getByTestId("reporting-apply-filters-button").click();
    await expect(
      page.locator('[data-testid^="reporting-sales-item-"]').filter({ hasText: customerName }),
    ).toHaveCount(1);
  });
});
