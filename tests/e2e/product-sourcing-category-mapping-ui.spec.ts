import { expect, test } from "@playwright/test";

test.describe("product sourcing UI category mapping reuse", () => {
  test.skip(
    process.env.POS_BACKEND_MODE !== "supabase",
    "This suite validates real backend persistence with POS_BACKEND_MODE=supabase.",
  );

  test("reuses the confirmed category mapping in a later search from the same external path", async ({
    page,
  }) => {
    await page.goto("/cash-register");
    await page.getByTestId("nav-item-products").click();
    await page.getByTestId("products-workspace-open-sourcing-link").click();

    await expect(page).toHaveURL(/\/products\/sourcing$/);

    await page.getByTestId("product-sourcing-search-input").fill("zero 2,25");
    await page.waitForTimeout(700);

    await expect(page.getByTestId("product-sourcing-result-393964")).toBeVisible();
    await page.getByTestId("product-sourcing-toggle-393964").click();
    await page.getByTestId("product-sourcing-import-category-393964").fill("drink");
    await page.getByTestId("product-sourcing-import-stock-393964").fill("0");
    await page.getByTestId("product-sourcing-import-button").click();

    await expect(page.getByTestId("product-sourcing-import-feedback")).toContainText(
      "Importacion completada: 1 productos creados.",
    );

    await page.getByTestId("product-sourcing-search-input").fill("");
    await page.waitForTimeout(700);
    await page.getByTestId("product-sourcing-search-input").fill("zero 1,5");
    await page.waitForTimeout(700);

    await expect(page.getByTestId("product-sourcing-result-111111")).toBeVisible();
    await page.getByTestId("product-sourcing-toggle-111111").click();

    await expect(
      page.getByTestId("product-sourcing-import-category-111111"),
    ).toHaveValue("Bebidas");
  });
});
