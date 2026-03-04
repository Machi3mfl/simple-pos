import { expect, test, type APIRequestContext } from "./support/test";

import { addProductToCart, createCatalogProduct } from "./support/catalog";
import { createNewOnAccountCustomer } from "./support/checkout";
import { openReceivableDetail, parseMoneyValue } from "./support/receivables";
import { activeCashRegisterSessionResponseDTOSchema } from "../../src/modules/cash-management/presentation/dtos/cash-register-session-response.dto";
import { listCashRegistersResponseDTOSchema } from "../../src/modules/cash-management/presentation/dtos/list-cash-registers-response.dto";

async function ensureClosedSession(request: APIRequestContext): Promise<void> {
  const registersResponse = await request.get("/api/v1/cash-registers");
  expect(registersResponse.status()).toBe(200);
  const registersBody = listCashRegistersResponseDTOSchema.parse(
    await registersResponse.json(),
  );
  const register = registersBody.items[0];
  expect(register).toBeDefined();

  const activeSessionResponse = await request.get(
    `/api/v1/cash-registers/${register!.id}/active-session`,
  );
  expect(activeSessionResponse.status()).toBe(200);
  const activeSessionBody = activeCashRegisterSessionResponseDTOSchema.parse(
    await activeSessionResponse.json(),
  );

  if (!activeSessionBody.session) {
    return;
  }

  const closeResponse = await request.post(
    `/api/v1/cash-register-sessions/${activeSessionBody.session.id}/close`,
    {
      data: {
        countedClosingAmount: activeSessionBody.session.expectedBalanceAmount,
        closingNotes: "cleanup ui ar",
      },
    },
  );
  expect(closeResponse.status()).toBe(200);
}

async function ensureOpenSession(
  request: APIRequestContext,
  openingFloatAmount: number,
): Promise<void> {
  const registersResponse = await request.get("/api/v1/cash-registers");
  expect(registersResponse.status()).toBe(200);
  const registersBody = listCashRegistersResponseDTOSchema.parse(
    await registersResponse.json(),
  );
  const register = registersBody.items[0];
  expect(register).toBeDefined();

  await ensureClosedSession(request);

  const openResponse = await request.post("/api/v1/cash-register-sessions", {
    data: {
      cashRegisterId: register!.id,
      openingFloatAmount,
      openingNotes: "setup ui ar",
    },
  });
  expect(openResponse.status()).toBe(201);
}

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

  await ensureOpenSession(request, 500);

  await page.goto("/cash-register");
  const activeCashSummary = page.getByTestId("cash-session-active-summary");
  await expect(activeCashSummary).toBeVisible();
  await expect(activeCashSummary).toContainText("$500.00");

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
  await expect(activeCashSummary).toContainText("$1500.00");

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
  await expect(page.getByTestId("debt-payment-register-expected-value")).toHaveText(
    "$1500.00",
  );

  await page.getByTestId("debt-payment-amount-input").fill("500");
  await page.getByTestId("debt-register-payment-button").click();

  await expect(page.getByTestId("debt-feedback")).toContainText("Pago registrado: $500.00.");
  await expect(outstandingValue).toHaveText("$2950.00");
  await expect(page.getByTestId("debt-payment-register-expected-value")).toHaveText(
    "$2000.00",
  );
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
