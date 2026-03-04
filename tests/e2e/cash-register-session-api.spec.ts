import { expect, test, type APIRequestContext } from "@playwright/test";

import { activeCashRegisterSessionResponseDTOSchema, cashRegisterSessionResponseDTOSchema } from "../../src/modules/cash-management/presentation/dtos/cash-register-session-response.dto";
import { listCashRegistersResponseDTOSchema } from "../../src/modules/cash-management/presentation/dtos/list-cash-registers-response.dto";

async function closeActiveSessionIfNeeded(
  request: APIRequestContext,
  registerId: string,
): Promise<void> {
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
  test("opens and closes a register session with expected vs counted totals", async ({
    request,
  }) => {
    const registersResponse = await request.get("/api/v1/cash-registers");
    expect(registersResponse.status()).toBe(200);
    const registersBody = listCashRegistersResponseDTOSchema.parse(
      await registersResponse.json(),
    );
    const register = registersBody.items[0];
    expect(register).toBeDefined();

    await closeActiveSessionIfNeeded(request, register!.id);

    const openResponse = await request.post("/api/v1/cash-register-sessions", {
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

    const duplicateOpenResponse = await request.post("/api/v1/cash-register-sessions", {
      data: {
        cashRegisterId: register!.id,
        openingFloatAmount: 500,
      },
    });
    expect(duplicateOpenResponse.status()).toBe(409);

    const activeSessionResponse = await request.get(
      `/api/v1/cash-registers/${register!.id}/active-session`,
    );
    expect(activeSessionResponse.status()).toBe(200);
    const activeSessionBody = activeCashRegisterSessionResponseDTOSchema.parse(
      await activeSessionResponse.json(),
    );
    expect(activeSessionBody.session?.id).toBe(openedSession.id);

    const closeResponse = await request.post(
      `/api/v1/cash-register-sessions/${openedSession.id}/close`,
      {
        data: {
          countedClosingAmount: 14950,
          closingNotes: "cierre api",
        },
      },
    );
    expect(closeResponse.status()).toBe(200);
    const closedSession = cashRegisterSessionResponseDTOSchema.parse(
      await closeResponse.json(),
    );
    expect(closedSession.status).toBe("closed");
    expect(closedSession.countedClosingAmount).toBe(14950);
    expect(closedSession.discrepancyAmount).toBe(-50);

    const clearedActiveSessionResponse = await request.get(
      `/api/v1/cash-registers/${register!.id}/active-session`,
    );
    expect(clearedActiveSessionResponse.status()).toBe(200);
    const clearedActiveSessionBody = activeCashRegisterSessionResponseDTOSchema.parse(
      await clearedActiveSessionResponse.json(),
    );
    expect(clearedActiveSessionBody.session).toBeNull();
  });
});
