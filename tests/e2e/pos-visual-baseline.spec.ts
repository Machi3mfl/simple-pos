import { expect, test } from "@playwright/test";

test("renders tablet three-zone layout baseline", async ({ page }) => {
  await page.goto("/pos");

  await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Choose Categories" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Order List" })).toBeVisible();

  await expect(page).toHaveScreenshot("pos-tablet-layout.png", {
    fullPage: true,
  });
});
