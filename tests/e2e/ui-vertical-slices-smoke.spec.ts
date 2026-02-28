import { expect, test } from "@playwright/test";

test("navigates all vertical slice UIs from side rail", async ({ page }) => {
  await page.goto("/pos");
  await expect(page).toHaveURL(/\/pos\/sales$/);

  await page.getByTestId("nav-item-catalog").click();
  await expect(page).toHaveURL(/\/pos\/catalog$/);
  await expect(page.getByRole("heading", { name: "Guided Product Onboarding" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bulk Price Update" })).toBeVisible();

  await page.getByTestId("nav-item-inventory").click();
  await expect(page).toHaveURL(/\/pos\/inventory$/);
  await expect(page.getByRole("heading", { name: "Stock Movement" })).toBeVisible();

  await page.getByTestId("nav-item-receivables").click();
  await expect(page).toHaveURL(/\/pos\/receivables$/);
  await expect(page.getByRole("heading", { name: "Customer Debt Management" })).toBeVisible();

  await page.getByTestId("nav-item-reporting").click();
  await expect(page).toHaveURL(/\/pos\/reporting$/);
  await expect(page.getByRole("heading", { name: "Sales History and Analytics" })).toBeVisible();

  await page.getByTestId("nav-item-sync").click();
  await expect(page).toHaveURL(/\/pos\/sync$/);
  await expect(page.getByRole("heading", { name: "Offline Queue and Sync" })).toBeVisible();

  await page.getByTestId("nav-item-sales").click();
  await expect(page).toHaveURL(/\/pos\/sales$/);
  await expect(page.getByRole("heading", { name: "Choose Categories" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Order List" })).toBeVisible();
});
