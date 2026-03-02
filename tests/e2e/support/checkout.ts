import { type Page } from "@playwright/test";

function parseMoneyValue(raw: string): number {
  return Number(raw.replace(/[^0-9.-]/g, ""));
}

export async function fillCashReceivedWithExactTotal(page: Page): Promise<number> {
  const totalRaw = (await page.getByTestId("checkout-total-value").textContent()) ?? "$0";
  const total = parseMoneyValue(totalRaw);

  await page.getByTestId("checkout-cash-received-input").fill(total.toFixed(2));

  return total;
}

export async function createNewOnAccountCustomer(
  page: Page,
  customerName: string,
): Promise<void> {
  await page.getByTestId("checkout-customer-name-input").fill(customerName);
  await page.getByTestId("checkout-customer-create-button").click();
  const confirmButton = page.getByTestId("checkout-customer-create-confirm-button");
  if (await confirmButton.isVisible().catch(() => false)) {
    await confirmButton.click();
  }
}
