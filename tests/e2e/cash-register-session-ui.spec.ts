import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { activeCashRegisterSessionResponseDTOSchema } from "../../src/modules/cash-management/presentation/dtos/cash-register-session-response.dto";
import { listCashRegistersResponseDTOSchema } from "../../src/modules/cash-management/presentation/dtos/list-cash-registers-response.dto";

async function assumeUser(
  request: APIRequestContext,
  userId: string,
): Promise<void> {
  const response = await request.post("/api/v1/me/assume-user", {
    data: { userId },
  });
  expect(response.status()).toBe(200);
}

async function selectOperator(page: Page, actorId: string): Promise<void> {
  await page.getByTestId("open-operator-selector-button").click();
  await expect(page.getByTestId("operator-selector-dialog")).toBeVisible();
  await page.getByTestId(`operator-selector-item-${actorId}`).click();
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
          approvalNotes: "cleanup ui",
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
  await assumeUser(request, "user_manager_maxi");
  await ensureClosedSession(request);

  await page.goto("/cash-register");
  await expect(page.getByTestId("cash-session-panel")).toBeVisible();

  await page.getByTestId("cash-session-opening-float-input").fill("1234.50");
  await page.getByTestId("cash-session-open-button").click();

  const activeSummary = page.getByTestId("cash-session-active-summary");
  await expect(activeSummary).toBeVisible();
  await expect(page.getByText("Caja abierta")).toBeVisible();
  await expect(activeSummary).toContainText("$1234.50");
  await expect(activeSummary).toContainText("Cambio inicial");

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

test("sends cashier closeout with high discrepancy to supervisor review and allows reopen", async ({
  page,
  request,
}) => {
  await ensureClosedSession(request);
  await assumeUser(request, "user_cashier_putri");

  await page.goto("/cash-register");
  await selectOperator(page, "user_cashier_putri");

  await page.getByTestId("cash-session-opening-float-input").fill("1000");
  await page.getByTestId("cash-session-open-button").click();
  await expect(page.getByTestId("cash-session-active-summary")).toBeVisible();

  await page.getByTestId("cash-session-close-button").click();
  await expect(page.getByTestId("cash-session-close-modal")).toBeVisible();
  await page.getByTestId("cash-session-counted-input").fill("700");
  await page.getByTestId("cash-session-close-submit-button").click();

  await expect(page.getByTestId("cash-session-close-modal")).not.toBeVisible();
  await expect(page.getByTestId("cash-session-review-required-banner")).toBeVisible();
  await expect(page.getByText("Cierre pendiente de revisión")).toBeVisible();
  await expect(page.getByText("El cierre quedó pendiente de revisión")).toBeVisible();
  await expect(page.getByText("Conteo cargado por: Putri")).toBeVisible();
  await expect(page.getByTestId("cash-session-review-approve-button")).toHaveCount(0);

  await selectOperator(page, "user_supervisor_bruno");
  await expect(page.getByTestId("cash-session-review-approve-button")).toBeVisible();

  await page.getByTestId("cash-session-review-approve-button").click();
  await expect(page.getByTestId("cash-session-review-modal")).toBeVisible();
  await page.getByTestId("cash-session-review-modal-reopen-button").click();

  await expect(page.getByTestId("cash-session-review-modal")).not.toBeVisible();
  await expect(page.getByText("Caja abierta")).toBeVisible();
  await expect(page.getByTestId("cash-session-close-button")).toBeVisible();
});
