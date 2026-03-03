import { expect, test, type Page } from "@playwright/test";

import { addProductToCart, createCatalogProduct } from "./support/catalog";
import { createNewOnAccountCustomer } from "./support/checkout";
import { openReceivableDetail } from "./support/receivables";

async function createOnAccountSale(
  page: Page,
  input: {
    readonly customerName: string;
    readonly productName: string;
    readonly quantity: number;
  },
): Promise<void> {
  await addProductToCart(page, input.productName, input.quantity);
  await page.getByTestId("checkout-open-payment-button").click();
  await page.getByTestId("checkout-payment-on-account-button").click();
  await createNewOnAccountCustomer(page, input.customerName);
  await page.getByTestId("checkout-confirm-payment-button").click();
  await expect(page.getByTestId("checkout-feedback")).toContainText(
    "Venta registrada correctamente.",
  );
  await expect(page.getByTestId("checkout-feedback")).toContainText(input.customerName);
}

test("lists receivables by customer name and sorts debtors by outstanding balance", async ({
  request,
  page,
}) => {
  const marker = `DebtList-${Date.now()}`;
  const productName = `Debt List Product ${marker}`;
  const lowDebtCustomer = `${marker} Low`;
  const mediumDebtCustomer = `${marker} Medium`;
  const highDebtCustomer = `${marker} High`;
  await createCatalogProduct(request, { name: productName });

  await page.goto("/cash-register");
  await expect(page.getByRole("heading", { name: "Elegir categorías" })).toBeVisible();
  await expect(page.getByTestId("checkout-open-payment-button")).toBeDisabled();

  await createOnAccountSale(page, {
    customerName: lowDebtCustomer,
    productName,
    quantity: 1,
  });
  await createOnAccountSale(page, {
    customerName: mediumDebtCustomer,
    productName,
    quantity: 2,
  });
  await createOnAccountSale(page, {
    customerName: highDebtCustomer,
    productName,
    quantity: 3,
  });

  await page.getByTestId("nav-item-receivables").click();
  await expect(
    page.getByRole("heading", { name: "Deudas y cobranzas" }),
  ).toBeVisible();

  const markerCards = page
    .locator('[data-testid^="debt-customer-card-"]')
    .filter({ hasText: marker });
  await expect(markerCards).toHaveCount(3);

  const cardTexts = await markerCards.allTextContents();
  expect(cardTexts[0]).toContain(highDebtCustomer);
  expect(cardTexts[1]).toContain(mediumDebtCustomer);
  expect(cardTexts[2]).toContain(lowDebtCustomer);

  await openReceivableDetail(page, mediumDebtCustomer);
  await expect(page.getByTestId("debt-outstanding-value")).not.toHaveText("$0.00");
});
