import { expect, test, type Page } from "./support/test";
import { getDemoAuthUserCredentials } from "./support/access-control-auth";

test.describe("pos shell responsive", () => {
  test.use({ loginAsAppUserId: null });

  async function loginAsManager(page: Page): Promise<void> {
    const credentials = getDemoAuthUserCredentials("user_manager_maxi");

    await page.goto("/login");
    await page.getByTestId("login-email-input").fill(credentials.email);
    await page.getByTestId("login-password-input").fill(credentials.password);
    await page.getByTestId("login-submit-button").click();

    const workspaceRoutePattern =
      /\/(cash-register|sales|products|receivables|reporting|users-admin|sync)$/;
    const reachedWorkspace = await page
      .waitForURL(workspaceRoutePattern, { timeout: 8_000 })
      .then(() => true)
      .catch(() => false);

    if (!reachedWorkspace) {
      await page.getByTestId("login-password-input").press("Enter");
      await page.waitForURL(workspaceRoutePattern, { timeout: 10_000 });
    }
  }

  test("switches between mobile burger nav and desktop sidebar by viewport", async ({
    page,
  }) => {
    await loginAsManager(page);

    await page.setViewportSize({ width: 390, height: 844 });

    const mobileToggleButton = page.getByTestId("mobile-nav-toggle-button");
    await expect(mobileToggleButton).toBeVisible();
    await mobileToggleButton.click();
    await expect(page.getByTestId("mobile-nav-drawer")).toBeVisible();
    await expect(page.locator('[data-testid^="mobile-nav-item-"]').first()).toBeVisible();

    await page.getByTestId("mobile-nav-close-button").click();
    await expect(page.getByTestId("mobile-nav-drawer")).toHaveCount(0);

    await page.setViewportSize({ width: 1180, height: 820 });

    await expect(page.getByTestId("mobile-nav-toggle-button")).toBeHidden();
    await expect(page.getByTestId("left-nav-rail")).toBeVisible();
    await expect(page.locator('[data-testid^="nav-item-"]').first()).toBeVisible();
  });

  test("uses mobile tabs to switch cash-register panels", async ({ page }) => {
    await loginAsManager(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/cash-register");
    await page.waitForURL(/\/cash-register$/, { timeout: 15_000 });

    const catalogTab = page.getByTestId("cash-register-mobile-tab-catalog");
    const checkoutTab = page.getByTestId("cash-register-mobile-tab-checkout");

    await expect(catalogTab).toBeVisible();
    await expect(checkoutTab).toBeVisible();
    await expect(catalogTab).toHaveAttribute("aria-pressed", "true");
    await expect(checkoutTab).toHaveAttribute("aria-pressed", "false");

    await checkoutTab.click();
    await expect(checkoutTab).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Lista del pedido")).toBeVisible();

    await catalogTab.click();
    await expect(catalogTab).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Elegir categorías")).toBeVisible();
  });
});
