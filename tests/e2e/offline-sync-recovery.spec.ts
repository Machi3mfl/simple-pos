import { expect, test } from "./support/test";

import { getOfflineSyncQueueStorageKey } from "../../src/modules/sync/presentation/offline/offlineSyncQueue";
import { addProductToCart, createCatalogProduct } from "./support/catalog";
import { fillCashReceivedWithExactTotal } from "./support/checkout";

test.describe("offline sync recovery", () => {
  test("queues checkout event during outage and syncs it after reconnect", async ({
    request,
    page,
  }) => {
    const storageKey = getOfflineSyncQueueStorageKey();
    let failNextSaleRequest = true;
    let syncRequests = 0;
    const productName = `Offline Sync Product ${Date.now()}`;
    await createCatalogProduct(request, { name: productName });

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

    await page.goto("/cash-register");
    await addProductToCart(page, productName);

    await page.getByRole("button", { name: "Ir a cobrar" }).click();
    await fillCashReceivedWithExactTotal(page);
    await page.getByRole("button", { name: "Confirmar cobro" }).click();
    await expect(
      page.getByText("Venta guardada sin conexión. Pendiente de sincronización."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Reintentar sincronización/ })).toBeVisible();

    const pendingBeforeReconnect = await page.evaluate((key) => {
      const queueRaw = window.localStorage.getItem(key) ?? "[]";
      const queue = JSON.parse(queueRaw) as Array<{ status: string }>;
      return queue.filter((event) => event.status !== "synced").length;
    }, storageKey);
    expect(pendingBeforeReconnect).toBeGreaterThan(0);

    await page.evaluate(() => {
      window.dispatchEvent(new Event("online"));
    });

    await expect(
      page.getByText("Los eventos offline se sincronizaron correctamente."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Reintentar sincronización/ })).toHaveCount(0);

    const pendingAfterReconnect = await page.evaluate((key) => {
      const queueRaw = window.localStorage.getItem(key) ?? "[]";
      const queue = JSON.parse(queueRaw) as Array<{ status: string }>;
      return queue.filter((event) => event.status !== "synced").length;
    }, storageKey);
    expect(pendingAfterReconnect).toBe(0);
    expect(syncRequests).toBeGreaterThanOrEqual(1);
  });
});
