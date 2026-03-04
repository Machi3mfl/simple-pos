import { expect, test, type APIRequestContext } from "@playwright/test";

import { activeCashRegisterSessionResponseDTOSchema } from "../../src/modules/cash-management/presentation/dtos/cash-register-session-response.dto";
import { listCashRegistersResponseDTOSchema } from "../../src/modules/cash-management/presentation/dtos/list-cash-registers-response.dto";
import { getOfflineSyncQueueStorageKey } from "../../src/modules/sync/presentation/offline/offlineSyncQueue";

async function assumeUser(
  request: APIRequestContext,
  userId: string,
): Promise<void> {
  const response = await request.post("/api/v1/me/assume-user", {
    data: { userId },
  });
  expect(response.status()).toBe(200);
}

async function ensureClosedSession(request: APIRequestContext): Promise<void> {
  await assumeUser(request, "user_manager_maxi");

  const registersResponse = await request.get("/api/v1/cash-registers");
  expect(registersResponse.status()).toBe(200);
  const registersBody = listCashRegistersResponseDTOSchema.parse(await registersResponse.json());
  const register = registersBody.items[0];
  expect(register).toBeDefined();

  const activeSessionResponse = await request.get(
    `/api/v1/cash-registers/${register!.id}/active-session`,
  );
  expect(activeSessionResponse.status()).toBe(200);
  const activeSessionBody = activeCashRegisterSessionResponseDTOSchema.parse(
    await activeSessionResponse.json(),
  );

  if (!activeSessionBody.session) {
    return;
  }

  if (activeSessionBody.session.status === "closing_review_required") {
    const approveResponse = await request.post(
      `/api/v1/cash-register-sessions/${activeSessionBody.session.id}/approve-closeout`,
      {
        data: {
          approvalNotes: "cleanup offline cash movement",
        },
      },
    );
    expect(approveResponse.status()).toBe(200);
    return;
  }

  const closeResponse = await request.post(
    `/api/v1/cash-register-sessions/${activeSessionBody.session.id}/close`,
    {
      data: {
        countedClosingAmount: activeSessionBody.session.expectedBalanceAmount,
        closingNotes: "cleanup offline cash movement",
      },
    },
  );
  expect(closeResponse.status()).toBe(200);
}

test.describe("offline cash movement recovery", () => {
  test("queues a manual cash movement offline and replays it on sync retry", async ({
    page,
    request,
  }) => {
    const storageKey = getOfflineSyncQueueStorageKey();
    let failNextMovementRequest = true;
    let syncRequests = 0;

    await ensureClosedSession(request);
    await assumeUser(request, "user_manager_maxi");

    await page.route("**/api/v1/cash-register-sessions/*/movements", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      if (failNextMovementRequest) {
        failNextMovementRequest = false;
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
    await page.getByTestId("cash-session-opening-float-input").fill("100");
    await page.getByTestId("cash-session-open-button").click();
    await expect(page.getByTestId("cash-session-active-summary")).toBeVisible();

    await page.getByTestId("cash-session-add-movement-button").click();
    await page.getByTestId("cash-session-movement-type-select").selectOption("safe_drop");
    await page.getByTestId("cash-session-movement-amount-input").fill("10");
    await page.getByTestId("cash-session-movement-notes-input").fill("retiro offline");
    await page.getByTestId("cash-session-movement-submit-button").click();

    await expect(page.getByTestId("cash-session-retry-offline-sync-button")).toBeVisible();
    await expect(
      page
        .getByTestId("cash-session-active-summary")
        .getByText("Movimiento de caja guardado sin conexión. Pendiente de sincronización."),
    ).toBeVisible();

    const pendingBeforeRetry = await page.evaluate((key) => {
      const rawQueue = window.localStorage.getItem(key) ?? "[]";
      const queue = JSON.parse(rawQueue) as Array<{ status: string; eventType: string }>;
      return queue.filter(
        (event) => event.status !== "synced" && event.eventType === "cash_movement_recorded",
      ).length;
    }, storageKey);
    expect(pendingBeforeRetry).toBeGreaterThan(0);

    await page.getByTestId("cash-session-retry-offline-sync-button").click();

    await expect(
      page.getByTestId("app-toast").getByText(
        "Los eventos offline se sincronizaron correctamente.",
      ),
    ).toBeVisible();
    await expect(page.getByTestId("cash-session-retry-offline-sync-button")).toHaveCount(0);
    await expect(page.getByText("Retiro a caja fuerte")).toBeVisible();
    await expect(page.getByText("retiro offline")).toBeVisible();
    await expect(page.getByTestId("cash-session-active-summary")).toContainText("$90.00");

    const pendingAfterRetry = await page.evaluate((key) => {
      const rawQueue = window.localStorage.getItem(key) ?? "[]";
      const queue = JSON.parse(rawQueue) as Array<{ status: string; eventType: string }>;
      return queue.filter(
        (event) => event.status !== "synced" && event.eventType === "cash_movement_recorded",
      ).length;
    }, storageKey);
    expect(pendingAfterRetry).toBe(0);
    expect(syncRequests).toBeGreaterThanOrEqual(1);
  });
});
