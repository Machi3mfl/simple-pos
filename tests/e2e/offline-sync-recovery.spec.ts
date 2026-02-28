import { expect, test } from "@playwright/test";

import { getOfflineSyncQueueStorageKey } from "../../src/modules/sync/presentation/offline/offlineSyncQueue";

test.describe("offline sync recovery", () => {
  test("queues checkout event during outage and syncs it after reconnect", async ({
    page,
  }) => {
    const storageKey = getOfflineSyncQueueStorageKey();
    let failNextSaleRequest = true;
    let syncRequests = 0;

    await page.route("**/api/v1/sales", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      if (failNextSaleRequest) {
        failNextSaleRequest = false;
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

    await page.getByRole("button", { name: "Process to Payment" }).click();
    await page.getByRole("button", { name: "Confirm Payment" }).click();
    await expect(page.getByText("Sale saved offline. Pending sync.")).toBeVisible();
    await expect(page.getByRole("button", { name: /Retry Offline Sync/ })).toBeVisible();

    const pendingBeforeReconnect = await page.evaluate((key) => {
      const queueRaw = window.localStorage.getItem(key) ?? "[]";
      const queue = JSON.parse(queueRaw) as Array<{ status: string }>;
      return queue.filter((event) => event.status !== "synced").length;
    }, storageKey);
    expect(pendingBeforeReconnect).toBeGreaterThan(0);

    await page.evaluate(() => {
      window.dispatchEvent(new Event("online"));
    });

    await expect(page.getByText("Offline events synced successfully.")).toBeVisible();
    await expect(page.getByRole("button", { name: /Retry Offline Sync/ })).toHaveCount(0);

    const pendingAfterReconnect = await page.evaluate((key) => {
      const queueRaw = window.localStorage.getItem(key) ?? "[]";
      const queue = JSON.parse(queueRaw) as Array<{ status: string }>;
      return queue.filter((event) => event.status !== "synced").length;
    }, storageKey);
    expect(pendingAfterReconnect).toBe(0);
    expect(syncRequests).toBeGreaterThanOrEqual(1);
  });
});
