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
