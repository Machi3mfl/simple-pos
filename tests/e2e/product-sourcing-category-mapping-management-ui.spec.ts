import { expect, test } from "./support/test";

test.describe("product sourcing UI category mapping management", () => {
  test.skip(
    process.env.POS_BACKEND_MODE !== "supabase",
    "This suite validates real backend persistence with POS_BACKEND_MODE=supabase.",
  );

  test("updates and deletes a learned mapping from the sourcing screen", async ({ page }) => {
    const mappingTestId = "bebidas-gaseosas-gaseosas-cola";

    await page.goto("/products/sourcing");

    await page.getByTestId("product-sourcing-search-input").fill("zero 1,5");
    await page.waitForTimeout(700);

    await expect(page.getByTestId("product-sourcing-result-111111")).toBeVisible();
    await page.getByTestId("product-sourcing-toggle-111111").click();
    await page.getByTestId("product-sourcing-next-to-details").click();
    await page.getByTestId("product-sourcing-import-category-111111").fill("drink");
    await page.getByTestId("product-sourcing-next-to-confirm").click();
    await page
      .getByTestId("product-sourcing-import-confirmation-toast")
      .getByRole("button", { name: "Continuar" })
      .click();
    await page.getByTestId("product-sourcing-import-button").click();

    await expect(page.getByTestId("product-sourcing-import-feedback")).toContainText(
      "Importacion completada: 1 productos creados.",
    );

    await page.getByTestId("product-sourcing-open-mappings").click();
    await expect(
      page.getByTestId(`product-sourcing-mapping-row-${mappingTestId}`),
    ).toBeVisible();
    await expect(
      page.getByTestId(`product-sourcing-mapping-category-${mappingTestId}`),
    ).toHaveValue("drink");

    await page
      .getByTestId(`product-sourcing-mapping-category-${mappingTestId}`)
      .selectOption("snack");
    await page.getByTestId(`product-sourcing-mapping-save-${mappingTestId}`).click();

    await expect(page.getByTestId("product-sourcing-mapping-feedback")).toContainText(
      "La regla de categoria se actualizo correctamente.",
    );

    await page.getByTestId("product-sourcing-mappings-dialog-close").click();
    await page.getByTestId("product-sourcing-step-search").click();
    await page.getByTestId("product-sourcing-search-input").fill("");
    await page.waitForTimeout(700);
    await page.getByTestId("product-sourcing-search-input").fill("zero 2,25");
    await page.waitForTimeout(700);

    await expect(page.getByTestId("product-sourcing-result-393964")).toBeVisible();
    await page.getByTestId("product-sourcing-toggle-393964").click();
    await page.getByTestId("product-sourcing-next-to-details").click();
    await expect(
      page.getByTestId("product-sourcing-import-category-393964"),
    ).toHaveValue("Snacks");

    await page.getByTestId("product-sourcing-open-mappings").click();
    await page.getByTestId(`product-sourcing-mapping-delete-${mappingTestId}`).click();

    await expect(page.getByTestId("product-sourcing-mapping-feedback")).toContainText(
      "La regla de categoria se elimino correctamente.",
    );
    await expect(
      page.getByTestId(`product-sourcing-mapping-row-${mappingTestId}`),
    ).toHaveCount(0);

    await page.getByTestId("product-sourcing-mappings-dialog-close").click();
    await page.getByTestId("product-sourcing-step-search").click();
    await page.getByTestId("product-sourcing-search-input").fill("");
    await page.waitForTimeout(700);
    await page.getByTestId("product-sourcing-search-input").fill("zero 2,25");
    await page.waitForTimeout(700);

    await page.getByTestId("product-sourcing-toggle-393964").click();
    await page.getByTestId("product-sourcing-next-to-details").click();
    await expect(
      page.getByTestId("product-sourcing-import-category-393964"),
    ).toHaveValue("Gaseosas cola");
  });
});
