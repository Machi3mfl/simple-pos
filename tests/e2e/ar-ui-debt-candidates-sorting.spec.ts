import { expect, test, type Page } from "@playwright/test";

import { addProductToCart, createCatalogProduct } from "./support/catalog";
import { createNewOnAccountCustomer } from "./support/checkout";

function parseMoneyValue(raw: string): number {
  const match = raw.match(/\$([0-9]+(?:\.[0-9]{1,2})?)/);
  if (!match) {
    throw new Error(`Could not parse money value from: ${raw}`);
  }

  return Number(match[1]);
}

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

test("lists receivables by customer name and sorts candidates by outstanding balance", async ({
  request,
  page,
}) => {
  const marker = `DebtList-${Date.now()}`;
  const productName = `Debt List Product ${marker}`;
  const lowDebtCustomer = `${marker} Low`;
  const mediumDebtCustomer = `${marker} Medium`;
  const highDebtCustomer = `${marker} High`;
  await createCatalogProduct(request, { name: productName });

  await page.goto("/sales");
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
    page.getByRole("heading", { name: "Gestión de deudas de clientes" }),
  ).toBeVisible();
  await page.getByTestId("debt-refresh-candidates-button").click();

  const markerOptions = page
    .locator('[data-testid="debt-customer-candidates-select"] option')
    .filter({ hasText: marker });
  await expect(markerOptions).toHaveCount(3);

  const optionTexts = await markerOptions.allTextContents();
  for (const text of optionTexts) {
    expect(text).toContain("• $");
  }

  const balances = optionTexts.map((text) => parseMoneyValue(text));
  expect(balances[0]).toBeGreaterThan(balances[1]);
  expect(balances[1]).toBeGreaterThan(balances[2]);

  const mediumCustomerOption = markerOptions.filter({ hasText: mediumDebtCustomer });
  const mediumCustomerId = await mediumCustomerOption.first().getAttribute("value");
  expect(mediumCustomerId).toBeTruthy();

  await page
    .getByTestId("debt-customer-candidates-select")
    .selectOption(mediumCustomerId ?? "");
  await page.getByTestId("debt-load-summary-button").click();
  await expect(page.getByText(new RegExp(`Cliente ${mediumDebtCustomer}`))).toBeVisible();
  await expect(page.getByTestId("debt-outstanding-value")).not.toHaveText("$0.00");
});
