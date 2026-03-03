import { expect, type Page } from "@playwright/test";

export function parseMoneyValue(raw: string): number {
  return Number(raw.replace(/[^0-9.-]/g, ""));
}

export async function openReceivableDetail(
  page: Page,
  customerName: string,
): Promise<void> {
  await page.getByTestId("debt-search-input").fill(customerName);

  const customerCard = page
    .locator('[data-testid^="debt-customer-card-"]')
    .filter({ hasText: customerName })
    .first();

  await expect(customerCard).toBeVisible();
  await customerCard.click();

  await expect(page.getByTestId("debt-detail-modal")).toBeVisible();
  await expect(page.getByRole("heading", { name: customerName })).toBeVisible();
}
