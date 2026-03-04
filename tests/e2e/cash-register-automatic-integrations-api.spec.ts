import { expect, test, type APIRequestContext } from "@playwright/test";

import { activeCashRegisterSessionResponseDTOSchema } from "../../src/modules/cash-management/presentation/dtos/cash-register-session-response.dto";
import { listCashRegistersResponseDTOSchema } from "../../src/modules/cash-management/presentation/dtos/list-cash-registers-response.dto";
import { createCatalogProduct } from "./support/catalog";

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
        closingNotes: "cleanup automatic integrations",
      },
    },
  );
  expect(closeResponse.status()).toBe(200);
}

test("records cash sale and debt cash payment into the active register session", async ({
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
      openingFloatAmount: 1000,
      openingNotes: "slice 4 api",
    },
  });
  expect(openResponse.status()).toBe(201);

  const marker = Date.now();
  const product = await createCatalogProduct(request, {
    name: `Cash auto product ${marker}`,
    price: 250,
  });

  const cashSaleResponse = await request.post("/api/v1/sales", {
    data: {
      items: [{ productId: product.id, quantity: 1 }],
      paymentMethod: "cash",
      cashRegisterId: register!.id,
    },
  });
  expect(cashSaleResponse.status()).toBe(201);

  const activeAfterCashSale = activeCashRegisterSessionResponseDTOSchema.parse(
    await (
      await request.get(`/api/v1/cash-registers/${register!.id}/active-session`)
    ).json(),
  );
  expect(activeAfterCashSale.session?.expectedBalanceAmount).toBe(1250);
  expect(
    activeAfterCashSale.session?.movements.some(
      (movement) =>
        movement.movementType === "cash_sale" && movement.amount === 250,
    ),
  ).toBe(true);

  const onAccountSaleResponse = await request.post("/api/v1/sales", {
    data: {
      items: [{ productId: product.id, quantity: 1 }],
      paymentMethod: "on_account",
      customerName: `Debt API ${marker}`,
      createCustomerIfMissing: true,
      initialPaymentAmount: 100,
      cashRegisterId: register!.id,
    },
  });
  expect(onAccountSaleResponse.status()).toBe(201);
  const onAccountSaleBody = (await onAccountSaleResponse.json()) as {
    readonly customerId?: string;
  };
  expect(onAccountSaleBody.customerId).toBeTruthy();

  const activeAfterOnAccount = activeCashRegisterSessionResponseDTOSchema.parse(
    await (
      await request.get(`/api/v1/cash-registers/${register!.id}/active-session`)
    ).json(),
  );
  expect(activeAfterOnAccount.session?.expectedBalanceAmount).toBe(1350);
  expect(
    activeAfterOnAccount.session?.movements.filter(
      (movement) => movement.movementType === "cash_sale",
    ),
  ).toHaveLength(2);

  const debtPaymentResponse = await request.post("/api/v1/debt-payments", {
    data: {
      customerId: onAccountSaleBody.customerId,
      amount: 50,
      paymentMethod: "cash",
      cashRegisterId: register!.id,
      notes: "slice 4 api debt payment",
    },
  });
  expect(debtPaymentResponse.status()).toBe(201);
  const debtPaymentBody = (await debtPaymentResponse.json()) as {
    readonly paymentId: string;
  };

  const activeAfterDebtPayment = activeCashRegisterSessionResponseDTOSchema.parse(
    await (
      await request.get(`/api/v1/cash-registers/${register!.id}/active-session`)
    ).json(),
  );
  expect(activeAfterDebtPayment.session?.expectedBalanceAmount).toBe(1400);
  expect(
    activeAfterDebtPayment.session?.movements.some(
      (movement) =>
        movement.movementType === "debt_payment_cash" &&
        movement.debtLedgerEntryId === debtPaymentBody.paymentId &&
        movement.amount === 50,
    ),
  ).toBe(true);
});
