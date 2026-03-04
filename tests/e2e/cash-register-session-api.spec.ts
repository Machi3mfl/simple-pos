import { expect, test, type APIRequestContext } from "./support/test";

import {
  activeCashRegisterSessionResponseDTOSchema,
  cashRegisterSessionDetailResponseDTOSchema,
  cashRegisterSessionResponseDTOSchema,
} from "../../src/modules/cash-management/presentation/dtos/cash-register-session-response.dto";
import { listCashRegistersResponseDTOSchema } from "../../src/modules/cash-management/presentation/dtos/list-cash-registers-response.dto";
import { assumeActorViaSupportBridge } from "./support/access-control-auth";

async function closeActiveSessionIfNeeded(
  request: APIRequestContext,
  registerId: string,
): Promise<void> {
  await assumeActorViaSupportBridge(request, "user_manager_maxi");

  const activeSessionResponse = await request.get(
    `/api/v1/cash-registers/${registerId}/active-session`,
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
          approvalNotes: "cleanup test",
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
        closingNotes: "cleanup test",
      },
    },
  );
  expect(closeResponse.status()).toBe(200);
}

test.describe("cash register session api", () => {
  test("opens, records manual movements, and closes a register session", async ({
    supportRequest,
  }) => {
    await assumeActorViaSupportBridge(supportRequest, "user_manager_maxi");

    const registersResponse = await supportRequest.get("/api/v1/cash-registers");
    expect(registersResponse.status()).toBe(200);
    const registersBody = listCashRegistersResponseDTOSchema.parse(
      await registersResponse.json(),
    );
    const register = registersBody.items[0];
    expect(register).toBeDefined();

    await closeActiveSessionIfNeeded(supportRequest, register!.id);

    const openResponse = await supportRequest.post("/api/v1/cash-register-sessions", {
      data: {
        cashRegisterId: register!.id,
        openingFloatAmount: 15000,
        openingNotes: "turno prueba api",
      },
    });
    expect(openResponse.status()).toBe(201);
    const openedSession = cashRegisterSessionResponseDTOSchema.parse(
      await openResponse.json(),
    );
    expect(openedSession.status).toBe("open");
    expect(openedSession.expectedBalanceAmount).toBe(15000);
    expect(openedSession.openedByDisplayName.length).toBeGreaterThan(0);

    const duplicateOpenResponse = await supportRequest.post("/api/v1/cash-register-sessions", {
      data: {
        cashRegisterId: register!.id,
        openingFloatAmount: 500,
      },
    });
    expect(duplicateOpenResponse.status()).toBe(409);

    const activeSessionResponse = await supportRequest.get(
      `/api/v1/cash-registers/${register!.id}/active-session`,
    );
    expect(activeSessionResponse.status()).toBe(200);
    const activeSessionBody = activeCashRegisterSessionResponseDTOSchema.parse(
      await activeSessionResponse.json(),
    );
    expect(activeSessionBody.session?.id).toBe(openedSession.id);
    expect(activeSessionBody.session?.movements).toHaveLength(1);
    expect(activeSessionBody.session?.movements[0]?.movementType).toBe("opening_float");

    const movementResponse = await supportRequest.post(
      `/api/v1/cash-register-sessions/${openedSession.id}/movements`,
      {
        data: {
          movementType: "safe_drop",
          amount: 250,
          notes: "retiro a caja fuerte api",
        },
      },
    );
    expect(movementResponse.status()).toBe(201);
    const updatedSession = cashRegisterSessionDetailResponseDTOSchema.parse(
      await movementResponse.json(),
    );
    expect(updatedSession.expectedBalanceAmount).toBe(14750);
    expect(updatedSession.movements).toHaveLength(2);
    expect(updatedSession.movements[1]?.movementType).toBe("safe_drop");
    expect(updatedSession.movements[1]?.direction).toBe("outbound");
    expect(updatedSession.movements[1]?.notes).toBe("retiro a caja fuerte api");

    const closeResponse = await supportRequest.post(
      `/api/v1/cash-register-sessions/${openedSession.id}/close`,
      {
        data: {
          countedClosingAmount: 14700,
          closingNotes: "cierre api",
        },
      },
    );
    expect(closeResponse.status()).toBe(200);
    const closedSession = cashRegisterSessionResponseDTOSchema.parse(
      await closeResponse.json(),
    );
    expect(closedSession.status).toBe("closed");
    expect(closedSession.countedClosingAmount).toBe(14700);
    expect(closedSession.discrepancyAmount).toBe(-50);

    const clearedActiveSessionResponse = await supportRequest.get(
      `/api/v1/cash-registers/${register!.id}/active-session`,
    );
    expect(clearedActiveSessionResponse.status()).toBe(200);
    const clearedActiveSessionBody = activeCashRegisterSessionResponseDTOSchema.parse(
      await clearedActiveSessionResponse.json(),
    );
    expect(clearedActiveSessionBody.session).toBeNull();
  });

  test("sends closeout with high discrepancy to review and requires supervisor approval", async ({
    supportRequest,
  }) => {
    await assumeActorViaSupportBridge(supportRequest, "user_cashier_putri");

    const registersResponse = await supportRequest.get("/api/v1/cash-registers");
    expect(registersResponse.status()).toBe(200);
    const registersBody = listCashRegistersResponseDTOSchema.parse(
      await registersResponse.json(),
    );
    const register = registersBody.items[0];
    expect(register).toBeDefined();

    await closeActiveSessionIfNeeded(supportRequest, register!.id);
    await assumeActorViaSupportBridge(supportRequest, "user_cashier_putri");

    const openResponse = await supportRequest.post("/api/v1/cash-register-sessions", {
      data: {
        cashRegisterId: register!.id,
        openingFloatAmount: 1000,
        openingNotes: "turno cajera",
      },
    });
    expect(openResponse.status()).toBe(201);
    const openedSession = cashRegisterSessionResponseDTOSchema.parse(
      await openResponse.json(),
    );

    const reviewResponse = await supportRequest.post(
      `/api/v1/cash-register-sessions/${openedSession.id}/close`,
      {
        data: {
          countedClosingAmount: 700,
          closingNotes: "faltante para revisar",
        },
      },
    );
    expect(reviewResponse.status()).toBe(200);
    const reviewSession = cashRegisterSessionResponseDTOSchema.parse(
      await reviewResponse.json(),
    );
    expect(reviewSession.status).toBe("closing_review_required");
    expect(reviewSession.discrepancyAmount).toBe(-300);
    expect(reviewSession.closeoutSubmittedByDisplayName).toBe("Putri");
    expect(reviewSession.closedAt).toBeUndefined();

    const cashierApproveResponse = await supportRequest.post(
      `/api/v1/cash-register-sessions/${openedSession.id}/approve-closeout`,
      {
        data: {
          approvalNotes: "intento sin permiso",
        },
      },
    );
    expect(cashierApproveResponse.status()).toBe(403);

    await assumeActorViaSupportBridge(supportRequest, "user_supervisor_bruno");

    const approveResponse = await supportRequest.post(
      `/api/v1/cash-register-sessions/${openedSession.id}/approve-closeout`,
      {
        data: {
          approvalNotes: "diferencia validada por supervisor",
        },
      },
    );
    expect(approveResponse.status()).toBe(200);
    const approvedSession = cashRegisterSessionResponseDTOSchema.parse(
      await approveResponse.json(),
    );
    expect(approvedSession.status).toBe("closed");
    expect(approvedSession.closedByDisplayName).toBe("Bruno");
    expect(approvedSession.discrepancyApprovedByDisplayName).toBe("Bruno");
    expect(approvedSession.discrepancyApprovalNotes).toBe(
      "diferencia validada por supervisor",
    );

    const clearedActiveSessionResponse = await supportRequest.get(
      `/api/v1/cash-registers/${register!.id}/active-session`,
    );
    expect(clearedActiveSessionResponse.status()).toBe(200);
    const clearedActiveSessionBody = activeCashRegisterSessionResponseDTOSchema.parse(
      await clearedActiveSessionResponse.json(),
    );
    expect(clearedActiveSessionBody.session).toBeNull();
  });
});
