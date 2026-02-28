import { expect, test } from "@playwright/test";

import { getOfflineSyncQueueStorageKey } from "../../src/modules/sync/presentation/offline/offlineSyncQueue";

function parseMoneyValue(raw: string): number {
  return Number(raw.replace(/[^0-9.-]/g, ""));
}

test.describe("offline debt payment recovery", () => {
  test("queues debt payment during outage and syncs it after manual retry", async ({
    page,
    request,
  }) => {
    const storageKey = getOfflineSyncQueueStorageKey();
    let failNextDebtPaymentRequest = true;
    let syncRequests = 0;

    const seedSaleResponse = await request.post("/api/v1/sales", {
      data: {
        items: [{ productId: "prod-offline-debt-001", quantity: 3 }],
        paymentMethod: "on_account",
        customerName: `Offline Debt ${Date.now()}`,
      },
    });

    expect(seedSaleResponse.status()).toBe(201);
    const seedSaleBody = (await seedSaleResponse.json()) as {
      readonly customerId?: string;
    };
    const customerId = seedSaleBody.customerId;
    expect(customerId).toBeTruthy();

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

    await page.goto("/pos");
    await page.getByTestId("nav-item-receivables").click();

    await page.getByTestId("debt-manual-customer-id-input").fill(customerId ?? "");
    await page.getByTestId("debt-load-summary-button").click();

    const outstandingBeforeRaw =
      (await page.getByTestId("debt-outstanding-value").textContent()) ?? "$0";
    const outstandingBefore = parseMoneyValue(outstandingBeforeRaw);
    expect(outstandingBefore).toBeGreaterThan(0);

    await page.getByTestId("debt-payment-amount-input").fill("10");
    await page.getByTestId("debt-register-payment-button").click();

    await expect(page.getByTestId("debt-feedback")).toContainText(
      "Debt payment saved offline. Pending sync.",
    );
    await expect(page.getByTestId("debt-retry-offline-sync-button")).toBeVisible();

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
      "Offline events synced successfully.",
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
