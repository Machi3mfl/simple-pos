import { expect, test } from "@playwright/test";

test("navigates all vertical slice UIs from side rail", async ({ page }) => {
  await page.goto("/pos");

  await page.getByRole("button", { name: "Catalog" }).click();
  await expect(page.getByRole("heading", { name: "Guided Product Onboarding" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bulk Price Update" })).toBeVisible();

  await page.getByRole("button", { name: "Inventory" }).click();
  await expect(page.getByRole("heading", { name: "Stock Movement" })).toBeVisible();

  await page.getByRole("button", { name: "Receivables" }).click();
  await expect(page.getByRole("heading", { name: "Customer Debt Management" })).toBeVisible();

  await page.getByRole("button", { name: "Reporting" }).click();
  await expect(page.getByRole("heading", { name: "Sales History and Analytics" })).toBeVisible();

  await page.getByRole("button", { name: "Sync" }).click();
  await expect(page.getByRole("heading", { name: "Offline Queue and Sync" })).toBeVisible();

  await page.getByRole("button", { name: "Sales" }).click();
  await expect(page.getByRole("heading", { name: "Choose Categories" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Order List" })).toBeVisible();
});
