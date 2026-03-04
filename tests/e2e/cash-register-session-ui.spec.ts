import { expect, test, type APIRequestContext } from "@playwright/test";

import { activeCashRegisterSessionResponseDTOSchema } from "../../src/modules/cash-management/presentation/dtos/cash-register-session-response.dto";
import { listCashRegistersResponseDTOSchema } from "../../src/modules/cash-management/presentation/dtos/list-cash-registers-response.dto";

async function ensureClosedSession(request: APIRequestContext): Promise<void> {
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

  const closeResponse = await request.post(
    `/api/v1/cash-register-sessions/${activeSessionBody.session.id}/close`,
    {
      data: {
        countedClosingAmount: activeSessionBody.session.expectedBalanceAmount,
        closingNotes: "cleanup ui",
      },
    },
  );
  expect(closeResponse.status()).toBe(200);
}

test("opens, records manual movements, and closes a cash register session from the cash workspace", async ({
  page,
  request,
}) => {
  await ensureClosedSession(request);

  await page.goto("/cash-register");
  await expect(page.getByTestId("cash-session-panel")).toBeVisible();

  await page.getByTestId("cash-session-opening-float-input").fill("1234.50");
  await page.getByTestId("cash-session-open-button").click();

  const activeSummary = page.getByTestId("cash-session-active-summary");
  await expect(activeSummary).toBeVisible();
  await expect(page.getByText("Caja abierta")).toBeVisible();
  await expect(activeSummary).toContainText("$1234.50");
  await expect(page.getByText("Cambio inicial")).toBeVisible();

  await page.getByTestId("cash-session-add-movement-button").click();
  await expect(page.getByTestId("cash-session-movement-modal")).toBeVisible();
  await page.getByTestId("cash-session-movement-type-select").selectOption("safe_drop");
  await page.getByTestId("cash-session-movement-amount-input").fill("34.50");
  await page.getByTestId("cash-session-movement-notes-input").fill("retiro ui");
  await page.getByTestId("cash-session-movement-submit-button").click();

  await expect(page.getByTestId("cash-session-movement-modal")).not.toBeVisible();
  await expect(activeSummary).toContainText("$1200.00");
  await expect(page.getByText("Retiro a caja fuerte")).toBeVisible();
  await expect(page.getByText("retiro ui")).toBeVisible();

  await page.getByTestId("cash-session-close-button").click();
  await expect(page.getByTestId("cash-session-close-modal")).toBeVisible();
  await page.getByTestId("cash-session-counted-input").fill("1200");
  await page.getByTestId("cash-session-close-submit-button").click();

  await expect(page.getByTestId("cash-session-close-modal")).not.toBeVisible();
  await expect(page.getByTestId("cash-session-opening-float-input")).toBeVisible();
});
