import { expect, test } from "@playwright/test";

import { getOfflineSyncQueueStorageKey } from "../../src/modules/sync/presentation/offline/offlineSyncQueue";
import { addProductToCart, createCatalogProduct } from "./support/catalog";
import { createNewOnAccountCustomer } from "./support/checkout";
import { openReceivableDetail, parseMoneyValue } from "./support/receivables";

test.describe("offline debt payment recovery", () => {
  test("queues debt payment during outage and syncs it after manual retry", async ({
    request,
    page,
  }) => {
    const storageKey = getOfflineSyncQueueStorageKey();
    let failNextDebtPaymentRequest = true;
    let syncRequests = 0;
    const marker = Date.now();
    const customerName = `Offline Debt ${marker}`;
    const productName = `Offline Debt Product ${marker}`;
    await createCatalogProduct(request, { name: productName });

    await page.route("**/api/v1/debt-payments", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      if (failNextDebtPaymentRequest) {
        failNextDebtPaymentRequest = false;
        await route.abort("failed");
        return;
      }

      await route.continue();
    });

    await page.route("**/api/v1/sync/events", async (route) => {
      if (route.request().method() === "POST") {
        syncRequests += 1;
      }
      await route.continue();
    });

    await page.goto("/sales");
    await addProductToCart(page, productName);
    await page.getByTestId("checkout-open-payment-button").click();
    await page.getByTestId("checkout-payment-on-account-button").click();
    await createNewOnAccountCustomer(page, customerName);
    await page.getByTestId("checkout-confirm-payment-button").click();
    await expect(page.getByTestId("checkout-feedback")).toContainText(
      "Venta registrada correctamente.",
    );

    await page.getByTestId("nav-item-receivables").click();
    await openReceivableDetail(page, customerName);

    const outstandingBeforeRaw =
      (await page.getByTestId("debt-outstanding-value").textContent()) ?? "$0";
    const outstandingBefore = parseMoneyValue(outstandingBeforeRaw);
    expect(outstandingBefore).toBeGreaterThan(0);

    await page.getByTestId("debt-payment-amount-input").fill("10");
    await page.getByTestId("debt-register-payment-button").click();

    await expect(page.getByTestId("debt-feedback")).toContainText(
      "Pago de deuda guardado sin conexión. Pendiente de sincronización.",
    );
    await expect(page.getByTestId("debt-retry-offline-sync-button")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("debt-detail-modal")).toHaveCount(0);

    const pendingBeforeRetry = await page.evaluate((key) => {
      const rawQueue = window.localStorage.getItem(key) ?? "[]";
      const queue = JSON.parse(rawQueue) as Array<{ status: string; eventType: string }>;
      return queue.filter(
        (event) => event.status !== "synced" && event.eventType === "debt_payment_registered",
      ).length;
    }, storageKey);
    expect(pendingBeforeRetry).toBeGreaterThan(0);

    await page.getByTestId("debt-retry-offline-sync-button").click();

    await expect(page.getByTestId("debt-feedback")).toContainText(
      "Los eventos offline se sincronizaron correctamente.",
    );
    await expect(page.getByTestId("debt-retry-offline-sync-button")).toHaveCount(0);

    const pendingAfterRetry = await page.evaluate((key) => {
      const rawQueue = window.localStorage.getItem(key) ?? "[]";
      const queue = JSON.parse(rawQueue) as Array<{ status: string; eventType: string }>;
      return queue.filter(
        (event) => event.status !== "synced" && event.eventType === "debt_payment_registered",
      ).length;
    }, storageKey);
    expect(pendingAfterRetry).toBe(0);
    expect(syncRequests).toBeGreaterThanOrEqual(1);
  });
});
